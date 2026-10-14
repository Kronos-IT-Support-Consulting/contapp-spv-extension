const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "background.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const ANAF_URL = "https://webserviced.anaf.ro/SPVWS2/rest/listaMesaje?zile=60";

// Runs background.js in its own realm with chrome.* stubbed. `fetchImpl(url, options, context)` plays fetch;
// `context` lets a test throw the realm's own error classes, which is what instanceof checks in the worker see.
function loadBackground(fetchImpl, { granted = true, createTab } = {}) {
    const fetchCalls = [];
    const createdTabs = [];
    const timers = [];
    const debug = [];
    let keepAlives = 0;
    let listener;

    const context = vm.createContext({
        URL,
        btoa,
        setInterval: (callback, ms) => timers.push({ callback, ms, cleared: false }),
        clearInterval: (id) => (timers[id - 1].cleared = true),
        console: { debug: (...args) => debug.push(args) },
        fetch: async (url, options) => {
            fetchCalls.push(structuredClone({ url, options }));

            return fetchImpl(url, options, context);
        },
        chrome: {
            runtime: {
                getManifest: () => ({ version: "9.8.7" }),
                getPlatformInfo: async () => keepAlives++,
                onMessage: { addListener: (callback) => (listener = callback) },
            },
            permissions: { contains: async () => granted },
            tabs: { create: createTab ?? (async (tab) => createdTabs.push(structuredClone(tab))) },
        },
    });

    vm.runInContext(source, context);

    // Responses come from the vm realm; clone them so deepEqual compares plain objects.
    const send = (message) =>
        new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("sendResponse was never called")), 1000).unref();
            const respond = (response) => {
                clearTimeout(timeout);
                resolve(structuredClone(response));
            };

            assert.equal(listener(message, {}, respond), true, "the listener must return true to keep the port open");
        });

    return { send, fetchCalls, createdTabs, timers, keepAlives: () => keepAlives, debug };
}

const unreachable = () => assert.fail("fetch must not be called");
const respond = (status, bytes, url = ANAF_URL) => async () => ({ status, url, arrayBuffer: async () => bytes.buffer });
const throwing = (name, message) => (url, options, context) => {
    throw new (vm.runInContext(name, context))(message);
};

test("ping answers the manifest version", async () => {
    const { send } = loadBackground(unreachable);

    assert.deepEqual(await send({ type: "ping" }), { ok: true, version: "9.8.7" });
});

test("the host the worker fetches from is the one the manifest asks permission for", () => {
    const context = vm.createContext({ chrome: { runtime: { onMessage: { addListener() {} } } }, URL });
    vm.runInContext(source, context);

    const origin = `${new URL(vm.runInContext("ALLOWED_PREFIX", context)).origin}/*`;
    assert.deepEqual(manifest.host_permissions, [origin]);
    assert.deepEqual(structuredClone(vm.runInContext("HOST_PERMISSION", context)), { origins: [origin] });
    assert.equal(manifest.permissions, undefined, "no permission besides the host should be needed");
});

test("fetch and login refuse anything that does not resolve under the SPV REST API", async () => {
    const { send, fetchCalls, createdTabs } = loadBackground(unreachable);
    const forbidden = [
        undefined, null, 42, [ANAF_URL], new String(ANAF_URL), "", "not a url",
        "http://webserviced.anaf.ro/SPVWS2/rest/x",
        "https://example.com/?u=https://webserviced.anaf.ro/SPVWS2/rest/x",
        "https://webserviced.anaf.ro.evil.example/SPVWS2/rest/x",
        "https://webserviced.anaf.ro@evil.example/SPVWS2/rest/x",
        "https://user@webserviced.anaf.ro/SPVWS2/rest/x",
        "https://webserviced.anaf.ro/SPVWS2/rest",
        "https://webserviced.anaf.ro/SPVWS2/restful/x",
        "https://webserviced.anaf.ro/spvws2/rest/x",
        "https://webserviced.anaf.ro//SPVWS2/rest/x",
        "javascript:alert(1)//https://webserviced.anaf.ro/SPVWS2/rest/",
        // Dot segments resolve before the request leaves the browser, so the check has to see them resolved.
        "https://webserviced.anaf.ro/SPVWS2/rest/../../admin",
        "https://webserviced.anaf.ro/SPVWS2/rest/%2e%2e/%2e%2e/admin",
        "https://webserviced.anaf.ro/SPVWS2/rest/.%2e/.%2e/admin",
        "https://webserviced.anaf.ro/SPVWS2/rest/..\\..\\admin",
        "https://webserviced.anaf.ro/SPVWS2/rest/x/../../../admin",
    ];

    for (const url of forbidden) {
        assert.deepEqual(await send({ type: "fetch", url }), { ok: false, error: "forbidden_url" }, String(url));
        assert.deepEqual(await send({ type: "login", url }), { ok: false, error: "forbidden_url" }, String(url));
    }

    assert.equal(fetchCalls.length + createdTabs.length, 0);
});

test("fetch and login use the normalised URL", async () => {
    const { send, fetchCalls, createdTabs } = loadBackground(respond(200, new Uint8Array(0)));
    const normalised = [
        [ANAF_URL, ANAF_URL],
        ["https://webserviced.anaf.ro:443/SPVWS2/rest/x", "https://webserviced.anaf.ro/SPVWS2/rest/x"],
        ["HTTPS://WEBSERVICED.ANAF.RO/SPVWS2/rest/x", "https://webserviced.anaf.ro/SPVWS2/rest/x"],
        [" https://webserviced.anaf.ro\\SPVWS2/rest/x", "https://webserviced.anaf.ro/SPVWS2/rest/x"],
        ["https://webserviced.anaf.ro/SPVWS2/rest/x/../y", "https://webserviced.anaf.ro/SPVWS2/rest/y"],
        ["https://webserviced.anaf.ro/SPVWS2/rest/a b?x=ü", "https://webserviced.anaf.ro/SPVWS2/rest/a%20b?x=%C3%BC"],
    ];

    for (const [url, href] of normalised) {
        assert.equal((await send({ type: "fetch", url })).ok, true, url);
        assert.deepEqual(await send({ type: "login", url }), { ok: true }, url);
        assert.equal(fetchCalls.at(-1).url, href);
        assert.deepEqual(createdTabs.at(-1), { url: href });
    }
});

test("fetch returns status, final url and the body as base64, whatever the status or size", async () => {
    // Every byte value, and lengths around the 0x8000 chunk toBase64 encodes at a time.
    for (const length of [0, 1, 0x7fff, 0x8000, 0x8001, 0x8000 * 3 + 7]) {
        const bytes = Uint8Array.from({ length }, (_, i) => (i * 7 + 13) & 0xff);
        const { send, fetchCalls } = loadBackground(respond(200, bytes, `${ANAF_URL}&final`));

        assert.deepEqual(await send({ type: "fetch", url: ANAF_URL }), {
            ok: true,
            status: 200,
            url: `${ANAF_URL}&final`,
            body: Buffer.from(bytes).toString("base64"),
        });
        assert.deepEqual(fetchCalls, [{ url: ANAF_URL, options: { credentials: "include", redirect: "follow", cache: "no-store" } }]);
    }

    // HTTP errors are the page's business: they still arrive as ok:true with the status.
    for (const status of [204, 401, 500]) {
        const { send } = loadBackground(respond(status, new TextEncoder().encode("denied")));

        assert.deepEqual(await send({ type: "fetch", url: ANAF_URL }), { ok: true, status, url: ANAF_URL, body: "ZGVuaWVk" });
    }
});

test("fetch failures map to certificate_required for a TypeError and network for everything else", async () => {
    const failures = [
        [throwing("TypeError", "Failed to fetch"), { ok: false, error: "certificate_required" }],
        [throwing("Error", "boom"), { ok: false, error: "network", message: "boom" }],
        [throwing("RangeError", "too big"), { ok: false, error: "network", message: "too big" }],
        [() => { throw new Error("host realm"); }, { ok: false, error: "network", message: "host realm" }],
        [() => { throw "plain string"; }, { ok: false, error: "network", message: "plain string" }],
        [() => { throw null; }, { ok: false, error: "network", message: "null" }],
    ];

    for (const [fetchImpl, expected] of failures) {
        const { send } = loadBackground(fetchImpl);

        assert.deepEqual(await send({ type: "fetch", url: ANAF_URL }), expected);
    }
});

test("a body that cannot be read is a network error, even when the stream throws a TypeError", async () => {
    const { send } = loadBackground(async (url, options, context) => ({
        status: 200,
        url: ANAF_URL,
        arrayBuffer: async () => throwing("TypeError", "body stream already read")(url, options, context),
    }));

    assert.deepEqual(await send({ type: "fetch", url: ANAF_URL }), { ok: false, error: "network", message: "body stream already read" });
});

test("a body too large for a runtime message is a network error instead of a reply that never arrives", async () => {
    const { send } = loadBackground(respond(200, new Uint8Array(48 * 1024 * 1024)));
    const response = await send({ type: "fetch", url: ANAF_URL });

    assert.equal(response.error, "network");
    assert.match(response.message, /50331648 bytes/);
});

test("fetch refuses to run without the host permission, which Firefox lets the user revoke", async () => {
    const { send, fetchCalls } = loadBackground(unreachable, { granted: false });
    const response = await send({ type: "fetch", url: ANAF_URL });

    assert.equal(response.error, "network");
    assert.match(response.message, /permission for https:\/\/webserviced\.anaf\.ro\/\* is not granted/);
    assert.equal(fetchCalls.length, 0);
});

test("the service worker is kept alive while a fetch is pending and left alone afterwards", async () => {
    let whileFetching;
    const { send, timers, keepAlives } = loadBackground(() => {
        timers.at(-1).callback();
        whileFetching = { timers: timers.length, keepAlives: keepAlives() };

        // The failure path is the one a refactor would forget to clear; success goes through the same finally.
        throw new Error("done");
    });

    await send({ type: "fetch", url: ANAF_URL });

    assert.deepEqual(whileFetching, { timers: 1, keepAlives: 1 });
    assert.deepEqual(timers.map((timer) => [timer.ms, timer.cleared]), [[25_000, true]]);
});

test("login opens a tab, and a tab that cannot be opened is a network error", async () => {
    const { send, createdTabs } = loadBackground(unreachable);
    assert.deepEqual(await send({ type: "login", url: ANAF_URL }), { ok: true });
    assert.deepEqual(createdTabs, [{ url: ANAF_URL }]);

    const createTab = async () => { throw new Error("Tabs cannot be edited right now"); };
    const failing = loadBackground(unreachable, { createTab });
    assert.deepEqual(await failing.send({ type: "login", url: ANAF_URL }), { ok: false, error: "network", message: "Tabs cannot be edited right now" });
    assert.equal(failing.debug.length, 1, "the failure is logged");
});

test("unknown message types and malformed messages are rejected", async () => {
    const { send } = loadBackground(unreachable);

    for (const message of [{ type: "delete" }, {}, undefined, null, "fetch", 7, []]) {
        assert.deepEqual(await send(message), { ok: false, error: "unknown_type" });
    }
});
