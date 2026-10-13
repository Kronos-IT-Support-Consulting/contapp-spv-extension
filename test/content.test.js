const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
const ORIGIN = "https://app.contapp.ro";

// Objects built inside the vm realm have a foreign prototype; clone them before deepEqual.
const plain = (value) => structuredClone(value);

function loadContent(sendMessage) {
    const posted = [];
    const sent = [];
    let onMessage;

    const window = {
        addEventListener: (type, handler) => {
            assert.equal(type, "message");
            onMessage = handler;
        },
        postMessage: (data, targetOrigin, transfer) => posted.push({ data, targetOrigin, transfer }),
    };

    const context = vm.createContext({
        atob,
        window,
        location: { origin: ORIGIN },
        document: { documentElement: { dataset: {} } },
        console: { debug() {} },
        chrome: {
            runtime: {
                getManifest: () => ({ version: "9.8.7" }),
                sendMessage: async (message) => {
                    sent.push(message);

                    return sendMessage(message);
                },
            },
        },
    });

    vm.runInContext(source, context);

    const dispatch = (data, { source = window, origin = ORIGIN } = {}) => onMessage({ data, source, origin });

    return { context, dispatch, posted, sent };
}

const request = { channel: "contapp-spv", id: "42", type: "fetch", url: "https://webserviced.anaf.ro/SPVWS2/rest/x" };

test("exposes the extension version on the html element", () => {
    const { context } = loadContent(() => ({ ok: true }));

    assert.equal(context.document.documentElement.dataset.spvExtension, "9.8.7");
});

test("ignores foreign, off-channel and reply messages", async () => {
    const { dispatch, sent, posted } = loadContent(() => assert.fail("must not relay"));

    await dispatch(request, { origin: "https://evil.example" });
    await dispatch(request, { source: {} });
    await dispatch({ ...request, channel: "other" });
    await dispatch({ ...request, direction: "reply" });
    await dispatch({ ...request, id: undefined });
    await dispatch({ ...request, type: undefined });

    assert.equal(sent.length, 0);
    assert.equal(posted.length, 0);
});

test("relays the request and posts the reply with the same id", async () => {
    const { dispatch, sent, posted } = loadContent(() => ({ ok: true, version: "9.8.7" }));

    await dispatch({ channel: "contapp-spv", id: "7", type: "ping" });

    assert.deepEqual(plain(sent), [{ type: "ping", url: undefined }]);
    assert.equal(posted.length, 1);
    assert.deepEqual(plain(posted[0].data), { ok: true, version: "9.8.7", channel: "contapp-spv", direction: "reply", id: "7" });
    assert.equal(posted[0].targetOrigin, ORIGIN);
});

test("turns a base64 body into a transferred ArrayBuffer", async () => {
    const body = Buffer.from("%PDF-1.7").toString("base64");
    const { dispatch, posted } = loadContent(() => ({ ok: true, status: 200, url: request.url, body }));

    await dispatch(request);

    const reply = posted[0];
    assert.equal(Object.prototype.toString.call(reply.data.body), "[object ArrayBuffer]");
    assert.equal(Buffer.from(reply.data.body).toString(), "%PDF-1.7");
    assert.equal(reply.transfer.length, 1);
    assert.equal(reply.transfer[0], reply.data.body);
    assert.equal(reply.data.status, 200);
    assert.equal(reply.data.id, "42");
});

test("an unreachable service worker answers extension", async () => {
    const { dispatch, posted } = loadContent(() => {
        throw new Error("Extension context invalidated.");
    });

    await dispatch(request);

    assert.deepEqual(plain(posted[0].data), { ok: false, error: "extension", channel: "contapp-spv", direction: "reply", id: "42" });
});

test("an empty service worker response answers extension", async () => {
    const { dispatch, posted } = loadContent(() => undefined);

    await dispatch(request);

    assert.equal(posted[0].data.error, "extension");
});
