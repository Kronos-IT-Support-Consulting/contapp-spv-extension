const ALLOWED_PREFIX = "https://webserviced.anaf.ro/SPVWS2/rest/";
const CHUNK_SIZE = 0x8000;

function isAllowed(url) {
    return typeof url === "string" && url.startsWith(ALLOWED_PREFIX);
}

function toBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";

    for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
        binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + CHUNK_SIZE));
    }

    return btoa(binary);
}

async function proxyFetch(url) {
    let response;

    try {
        response = await fetch(url, { credentials: "include", redirect: "follow", cache: "no-store" });
    } catch (error) {
        // Chrome reports a missing client certificate (ERR_SSL_CLIENT_AUTH_CERT_NEEDED) as a bare TypeError.
        if (error instanceof TypeError) {
            return { ok: false, error: "certificate_required" };
        }

        console.debug("contapp SPV fetch failed", error);

        return { ok: false, error: "network", message: String(error?.message ?? error) };
    }

    try {
        const body = toBase64(await response.arrayBuffer());

        return { ok: true, status: response.status, url: response.url, body };
    } catch (error) {
        console.debug("contapp SPV body read failed", error);

        return { ok: false, error: "network", message: String(error?.message ?? error) };
    }
}

async function openLogin(url) {
    await chrome.tabs.create({ url });

    return { ok: true };
}

async function handle(message) {
    switch (message?.type) {
        case "ping":
            return { ok: true, version: chrome.runtime.getManifest().version };
        case "fetch":
            return isAllowed(message.url) ? proxyFetch(message.url) : { ok: false, error: "forbidden_url" };
        case "login":
            return isAllowed(message.url) ? openLogin(message.url) : { ok: false, error: "forbidden_url" };
        default:
            return { ok: false, error: "unknown_type" };
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handle(message).then(sendResponse, (error) => {
        console.debug("contapp SPV handler failed", error);
        sendResponse({ ok: false, error: "network", message: String(error?.message ?? error) });
    });

    return true;
});
