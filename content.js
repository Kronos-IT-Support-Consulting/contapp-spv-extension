const CHANNEL = "contapp-spv";

document.documentElement.dataset.spvExtension = chrome.runtime.getManifest().version;

function fromBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
}

function reply(id, payload) {
    const transfer = payload.body instanceof ArrayBuffer ? [payload.body] : [];

    window.postMessage({ ...payload, channel: CHANNEL, direction: "reply", id }, location.origin, transfer);
}

window.addEventListener("message", async (event) => {
    const data = event.data;

    if (event.source !== window || event.origin !== location.origin) {
        return;
    }

    if (data?.channel !== CHANNEL || data.direction === "reply" || data.id == null || !data.type) {
        return;
    }

    let response;

    try {
        response = await chrome.runtime.sendMessage({ type: data.type, url: data.url });
    } catch (error) {
        console.debug("contapp SPV extension unreachable", error);
        reply(data.id, { ok: false, error: "extension" });

        return;
    }

    if (!response) {
        reply(data.id, { ok: false, error: "extension" });

        return;
    }

    if (response.ok && typeof response.body === "string") {
        response = { ...response, body: fromBase64(response.body) };
    }

    reply(data.id, response);
});
