const ALLOWED_PREFIX = "https://webserviced.anaf.ro/SPVWS2/rest/";
const HOST_PERMISSION = { origins: ["https://webserviced.anaf.ro/*"] };
const CHUNK_SIZE = 0x8000;
// Chrome refuses runtime messages over 64 MiB; base64 adds a third, the reply envelope a few bytes.
const MAX_BODY_BYTES = 47 * 1024 * 1024;
// Chrome stops an idle MV3 service worker after 30 s. A pending fetch is not activity, an API call is.
const KEEP_ALIVE_MS = 25_000;

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

async function fetchBody(url) {
    let response;

    try {
        response = await fetch(url, { credentials: "include", redirect: "follow", cache: "no-store" });
    } catch (error) {
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

    try {
        return await fetchBody(url);
    } finally {
        stopKeepAlive();
    }
}

async function openLogin(url) {
    await chrome.tabs.create({ url });

    return { ok: true };
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
