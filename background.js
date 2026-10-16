const ANAF_HOST = "webserviced.anaf.ro";
const ANAF_DOMAIN = "anaf.ro";
const ALLOWED_PREFIX = `https://${ANAF_HOST}/SPVWS2/rest/`;
const HOST_PERMISSION = { origins: [`https://${ANAF_HOST}/*`] };
const CHUNK_SIZE = 0x8000;
// Chrome refuses runtime messages over 64 MiB; base64 adds a third, the reply envelope a few bytes.
const MAX_BODY_BYTES = 47 * 1024 * 1024;
// Chrome stops an idle MV3 service worker after 30 s. A pending fetch is not activity, an API call is.
const KEEP_ALIVE_MS = 25_000;
// A TLS handshake waiting on a certificate picker or PIN prompt that never shows hangs forever and holds one of
// Chrome's six connections to the host; after a few retries even the login tab queues behind them. The deadline
// stops once the response headers arrive, so a slow download of a large but healthy response is not cut off.
const FETCH_TIMEOUT_MS = 90_000;
const TIMED_OUT = "timeout";
const LOGIN_CANCELLED = "cancelled by the ANAF login";
// Chrome opens at most six connections per host. Keeping two free lets the login tab through while
// background fetches are stuck on a handshake; the rest wait for a slot.
const MAX_CONCURRENT_FETCHES = 4;

// The normalised href when the URL is under the SPV REST API, otherwise null. Normalising first means
// the check runs on what fetch would actually request: "rest/../admin" resolves out of the prefix.
function allowedUrl(url) {
    if (typeof url !== "string") {
        return null;
    }

    let href;

    try {
        ({ href } = new URL(url));
    } catch {
        return null; // not a URL at all
    }

    return href.startsWith(ALLOWED_PREFIX) ? href : null;
}

function toBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";

    for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
        binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + CHUNK_SIZE));
    }

    return btoa(binary);
}

function networkError(reason) {
    return { ok: false, error: "network", message: String(reason?.message ?? reason) };
}

function keepAlive() {
    const timer = setInterval(() => chrome.runtime.getPlatformInfo().catch(() => {}), KEEP_ALIVE_MS);

    return () => clearInterval(timer);
}

// Fetches holding a connection slot, so a login can cancel them; `running` counts them, `waiting` queues the rest.
const inFlight = new Set();
const waiting = [];
let running = 0;
// Whether the last completed fetch got an SPV answer; unknown after the worker restarts, which counts as lost.
let sessionAlive = false;

// A freed slot passes straight to the next waiter without dropping `running`, so a newcomer cannot take it too.
async function acquireSlot() {
    if (running < MAX_CONCURRENT_FETCHES) {
        running++;
    } else {
        await new Promise((resolve) => waiting.push(resolve));
    }
}

function releaseSlot() {
    const next = waiting.shift();

    if (next) {
        next();
    } else {
        running--;
    }
}

async function fetchBody(url, signal, onHeaders) {
    let response;

    try {
        response = await fetch(url, { credentials: "include", redirect: "follow", cache: "no-store", signal });
        onHeaders();
    } catch (error) {
        // An abort is a DOMException, so it lands here; proxyFetch tells the page why from signal.reason.
        // Chrome reports a missing client certificate (ERR_SSL_CLIENT_AUTH_CERT_NEEDED) as a bare TypeError.
        if (error instanceof TypeError) {
            return { ok: false, error: "certificate_required" };
        }

        console.debug("ContApp SPV fetch failed", error);

        return networkError(error);
    }

    try {
        const buffer = await response.arrayBuffer();

        if (buffer.byteLength > MAX_BODY_BYTES) {
            return networkError(`response of ${buffer.byteLength} bytes is too large to pass to the page`);
        }

        return { ok: true, status: response.status, url: response.url, body: toBase64(buffer) };
    } catch (error) {
        console.debug("ContApp SPV body read failed", error);

        return networkError(error);
    }
}

async function proxyFetch(url) {
    // MV3 host permissions are optional in Firefox, and Chrome withholds them under "on click" site access.
    // Without the grant, fetch fails with the same TypeError as a missing certificate.
    if (!(await chrome.permissions.contains(HOST_PERMISSION))) {
        return networkError(`permission for ${HOST_PERMISSION.origins[0]} is not granted`);
    }

    const stopKeepAlive = keepAlive();
    const controller = new AbortController();
    let deadline;

    await acquireSlot();
    inFlight.add(controller);

    try {
        deadline = setTimeout(() => controller.abort(TIMED_OUT), FETCH_TIMEOUT_MS);

        const reply = await fetchBody(url, controller.signal, () => clearTimeout(deadline));

        if (controller.signal.aborted && !reply.ok) {
            return controller.signal.reason === TIMED_OUT ? { ok: false, error: "timeout" } : networkError(LOGIN_CANCELLED);
        }

        // A lost session redirects to F5's pages, so an answer still under the SPV prefix means it is alive.
        sessionAlive = reply.ok && reply.status < 400 && reply.url.startsWith(ALLOWED_PREFIX);

        return reply;
    } finally {
        clearTimeout(deadline);
        inFlight.delete(controller);
        releaseSlot();
        stopKeepAlive();
    }
}

// Firefox throws on cookie queries without firstPartyDomain while first-party isolation is on; null means all.
function cookieQuery() {
    const query = { domain: ANAF_DOMAIN, partitionKey: {} };

    return typeof browser === "undefined" ? query : { ...query, firstPartyDomain: null };
}

// The browser sends the host its own cookies and those set on a parent domain such as .anaf.ro.
function reachesAnafHost({ domain, hostOnly }) {
    const bare = domain.replace(/^\./, "");

    return hostOnly ? bare === ANAF_HOST : ANAF_HOST === bare || ANAF_HOST.endsWith(`.${bare}`);
}

// After a failed certificate or PIN check ANAF's F5 gateway keeps answering the dead session's cookie with its
// error page, so the login tab starts from no cookie at all. The values are only passed back to remove.
async function forgetAnafSession() {
    if (!(await chrome.permissions.contains(HOST_PERMISSION))) {
        throw new Error(`permission for ${HOST_PERMISSION.origins[0]} is not granted`);
    }

    const cookies = (await chrome.cookies.getAll(cookieQuery())).filter(reachesAnafHost);

    await Promise.all(cookies.map(({ name, domain, path, storeId, partitionKey, firstPartyDomain }) =>
        chrome.cookies.remove({
            url: `https://${domain.replace(/^\./, "")}${path}`,
            name,
            storeId,
            ...(partitionKey && { partitionKey }),
            ...(firstPartyDomain !== undefined && { firstPartyDomain }),
        })));
}

// A live session is kept: another ContApp tab may be syncing with it. A lost one is cleared, and the fetches still
// stuck on it are cancelled so they stop holding connections the login tab needs.
async function resetLostSession() {
    if (sessionAlive) {
        return { reset: "kept" };
    }

    for (const controller of inFlight) {
        controller.abort(LOGIN_CANCELLED);
    }

    try {
        await forgetAnafSession();

        return { reset: "cleared" };
    } catch (error) {
        console.warn("ContApp SPV could not clear the ANAF session", error);

        return { reset: "failed", message: String(error?.message ?? error) };
    }
}

async function openLogin(url) {
    const outcome = await resetLostSession();
    await chrome.tabs.create({ url });

    return { ok: true, ...outcome };
}

async function handle(message) {
    const url = allowedUrl(message?.url);

    switch (message?.type) {
        case "ping":
            return { ok: true, version: chrome.runtime.getManifest().version };
        case "fetch":
            return url ? proxyFetch(url) : { ok: false, error: "forbidden_url" };
        case "login":
            return url ? openLogin(url) : { ok: false, error: "forbidden_url" };
        default:
            return { ok: false, error: "unknown_type" };
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handle(message).then(sendResponse, (error) => {
        console.debug("ContApp SPV handler failed", error);
        sendResponse(networkError(error));
    });

    return true;
});
