const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
const ORIGIN = "https://app.contapp.ro";

// Objects built inside the vm realm have a foreign prototype; clone them before deepEqual.
const plain = (value) => structuredClone(value);

// Runs content.js in its own realm. `sendMessage(message)` plays the service worker; what the page posts
// is collected in `posted`, what reaches the worker in `sent`.
function loadContent(sendMessage, { origin = ORIGIN } = {}) {
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
        location: { origin },
        document: { documentElement: { dataset: {} } },
        console: { debug() {} },
        chrome: {
            runtime: {
                getManifest: () => ({ version: "9.8.7" }),
                sendMessage: async (message) => {
                    sent.push(plain(message));

                    return sendMessage(message);
                },
            },
        },
    });

    vm.runInContext(source, context);

    const dispatch = onMessage && ((data, event = {}) => onMessage({ data, source: window, origin, ...event }));

    return { context, dispatch, posted, sent };
}

const request = { channel: "contapp-spv", id: "42", type: "fetch", url: "https://webserviced.anaf.ro/SPVWS2/rest/x" };
const envelope = { channel: "contapp-spv", direction: "reply", id: "42" };
const bodyOf = (text) => ({ ok: true, status: 200, url: request.url, body: Buffer.from(text).toString("base64") });

test("exposes the extension version on the html element", () => {
    const { context } = loadContent(() => ({ ok: true }));

    assert.equal(context.document.documentElement.dataset.spvExtension, "9.8.7");
});

test("installs nothing on a sandboxed page, whose opaque origin could not be checked", () => {
    const { context, dispatch } = loadContent(() => assert.fail("must not relay"), { origin: "null" });

    assert.equal(context.document.documentElement.dataset.spvExtension, undefined);
    assert.equal(dispatch, undefined);
});

test("ignores everything that is not a request from this page", async () => {
    const { dispatch, sent, posted } = loadContent(() => assert.fail("must not relay"));
    const ignored = [
        [request, { origin: "https://evil.example" }],
        [request, { origin: "http://app.contapp.ro" }],
        [request, { origin: "null" }],
        [request, { source: {} }],
        [request, { source: null }],
        [{ ...request, channel: "other" }],
        [{ ...request, direction: "reply" }],
        [{ ...request, id: undefined }],
        [{ ...request, id: null }],
        [{ ...request, type: undefined }],
        [{ ...request, type: "" }],
        [null], [undefined], ["contapp-spv"], [1], [[]], [{}],
    ];

    for (const [data, event] of ignored) {
        await dispatch(data, event);
    }

    assert.equal(sent.length, 0);
    assert.equal(posted.length, 0);
});

test("relays only type and url, and posts the reply with the same id to the page origin", async () => {
    const { dispatch, sent, posted } = loadContent(() => ({ ok: true, version: "9.8.7", id: "spoofed", channel: "x" }));

    for (const id of ["7", 0]) {
        await dispatch({ channel: "contapp-spv", id, type: "ping", headers: { Cookie: "x" } });
    }

    assert.deepEqual(sent, [{ type: "ping", url: undefined }, { type: "ping", url: undefined }]);
    assert.deepEqual(plain(posted.map((p) => p.data)), [
        { ok: true, version: "9.8.7", channel: "contapp-spv", direction: "reply", id: "7" },
        { ok: true, version: "9.8.7", channel: "contapp-spv", direction: "reply", id: 0 },
    ]);
    assert.deepEqual(plain(posted.map((p) => [p.targetOrigin, p.transfer])), [[ORIGIN, []], [ORIGIN, []]]);
});

test("turns a base64 body into a transferred ArrayBuffer", async () => {
    for (const text of ["%PDF-1.7", ""]) {
        const { dispatch, posted } = loadContent(() => bodyOf(text));

        await dispatch(request);

        const { data, transfer } = posted[0];
        assert.equal(Object.prototype.toString.call(data.body), "[object ArrayBuffer]");
        assert.equal(Buffer.from(data.body).toString(), text);
        assert.equal(transfer.length, 1);
        assert.equal(transfer[0], data.body);
        assert.deepEqual(plain({ ...data, body: undefined }), { ok: true, status: 200, url: request.url, body: undefined, ...envelope });
    }
});

test("leaves the body alone unless the reply is ok", async () => {
    const { dispatch, posted } = loadContent(() => ({ ok: false, error: "network", body: "aGk=" }));

    await dispatch(request);

    assert.deepEqual(plain(posted[0]), { data: { ok: false, error: "network", body: "aGk=", ...envelope }, targetOrigin: ORIGIN, transfer: [] });
});

test("matches concurrent replies to their requests in completion order", async () => {
    const pending = new Map();
    const { dispatch, posted } = loadContent(({ url }) => new Promise((resolve) => pending.set(url, resolve)));

    const first = dispatch({ ...request, id: "first", url: `${request.url}1` });
    const second = dispatch({ ...request, id: "second", url: `${request.url}2` });
    assert.equal(posted.length, 0);

    pending.get(`${request.url}2`)(bodyOf("two"));
    await second;
    pending.get(`${request.url}1`)(bodyOf("one"));
    await first;

    assert.deepEqual(posted.map((p) => [p.data.id, Buffer.from(p.data.body).toString()]), [["second", "two"], ["first", "one"]]);
});

test("answers extension when the service worker is unreachable, silent, not an object or sends an undecodable body", async () => {
    const workers = [
        () => { throw new Error("Extension context invalidated."); },
        () => undefined,
        () => null,
        () => "",
        () => "ok",
        () => 7,
        () => ({ ok: true, status: 200, url: request.url, body: "@@not base64@@" }),
    ];

    for (const worker of workers) {
        const { dispatch, posted } = loadContent(worker);

        await dispatch(request);

        assert.deepEqual(plain(posted[0].data), { ok: false, error: "extension", ...envelope });
    }
});
