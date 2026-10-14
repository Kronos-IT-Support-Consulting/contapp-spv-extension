const CHANNEL = "contapp-spv";

// A sandboxed document has the opaque origin "null": the origin check below would pass for anyone and
// postMessage would refuse "null" as a target. Such a page gets no bridge.
if (location.origin !== "null") {
    document.documentElement.dataset.spvExtension = chrome.runtime.getManifest().version;
    window.addEventListener("message", onMessage);
}

function fromBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
}

// Whatever goes wrong between here and the service worker (extension reloaded, no answer, an answer
// that cannot be decoded) looks the same to the page: "extension".
async function relay(type, url) {
    try {
        const response = await chrome.runtime.sendMessage({ type, url });

        if (response?.ok && typeof response.body === "string") {
            return { ...response, body: fromBase64(response.body) };
        }

        return response || { ok: false, error: "extension" };
    } catch (error) {
        console.debug("ContApp SPV extension unreachable", error);

        return { ok: false, error: "extension" };
    }
}

function reply(id, payload) {
    const transfer = payload.body instanceof ArrayBuffer ? [payload.body] : [];

    window.postMessage({ ...payload, channel: CHANNEL, direction: "reply", id }, location.origin, transfer);
}

async function onMessage(event) {
    const data = event.data;

    if (event.source !== window || event.origin !== location.origin) {
        return;
    }

    if (data?.channel !== CHANNEL || data.direction === "reply" || data.id == null || !data.type) {
        return;
    }

    reply(data.id, await relay(data.type, data.url));
}
