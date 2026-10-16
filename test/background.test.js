const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "background.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const ANAF_URL = "https://webserviced.anaf.ro/SPVWS2/rest/listaMesaje?zile=60";

// Whether a host permission pattern such as "*://anaf.ro/*" covers the origin of `url`.
const permits = (pattern, url) => {
    const [, scheme, host] = pattern.match(/^(\*|https?):\/\/([^/]+)\/\*$/);
    const { protocol, hostname } = new URL(url);

    return (scheme === "*" || `${scheme}:` === protocol) && host === hostname;
};
const permitted = (hosts, url) => hosts.some((pattern) => permits(pattern, url));

// Chrome checks a cookie against the host permissions as http(s)://<domain without the dot>/, https only when the
// cookie is Secure: getAll leaves out the cookies that fail, and remove rejects a URL that fails.
const cookieUrl = ({ domain, secure }) => `${secure ? "https" : "http"}://${domain.replace(/^\./, "")}/`;

// Runs background.js in its own realm with chrome.* stubbed. `fetchImpl(url, options, context)` plays fetch;
// `context` lets a test throw the realm's own error classes, which is what instanceof checks in the worker see.
// The cookies API only sees what `hosts`, the manifest's host permissions by default, allows.
function loadBackground(fetchImpl, {
    granted = true, createTab, cookies = [], getAllCookies, firefox = false, hosts = manifest.host_permissions,
} = {}) {
    const fetchCalls = [];
    const signals = [];
    const deadlines = [];
    const cookieQueries = [];
    const createdTabs = [];
    const removedCookies = [];
    const events = [];
    const timers = [];
    const debug = [];
    const warnings = [];
    let keepAlives = 0;
    let listener;

    const context = vm.createContext({
        URL,
        btoa,
        AbortController,
        // Recorded instead of scheduled, so a test fires the 90 s deadline when it wants to.
        setTimeout: (callback, ms) => deadlines.push({ callback, ms, cleared: false }),
        clearTimeout: (id) => id && (deadlines[id - 1].cleared = true),
        setInterval: (callback, ms) => timers.push({ callback, ms, cleared: false }),
        clearInterval: (id) => (timers[id - 1].cleared = true),
        console: { debug: (...args) => debug.push(args), warn: (...args) => warnings.push(args) },
        fetch: async (url, options) => {
            const { signal, ...rest } = options;
            fetchCalls.push(structuredClone({ url, options: rest }));
            signals.push(signal);

            return fetchImpl(url, options, context);
        },
        chrome: {
            runtime: {
                getManifest: () => ({ version: "9.8.7" }),
                getPlatformInfo: async () => keepAlives++,
                onMessage: { addListener: (callback) => (listener = callback) },
            },
            permissions: { contains: async () => granted },
            tabs: {
                create: createTab ?? (async (tab) => {
                    events.push("tab");
                    createdTabs.push(structuredClone(tab));
                }),
            },
            cookies: {
                getAll: async (query) => {
                    cookieQueries.push(structuredClone(query));

                    const all = getAllCookies ? await getAllCookies(query) : structuredClone(cookies);

                    return all.filter((cookie) => permitted(hosts, cookieUrl(cookie)));
                },
                remove: async (details) => {
                    if (!permitted(hosts, details.url)) {
                        throw new Error(`No host permissions for cookies at url: "${details.url}".`);
                    }

                    events.push("cookie");
                    removedCookies.push(structuredClone(details));
                },
            },
        },
        ...(firefox && { browser: {} }),
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

    return {
        send, fetchCalls, signals, deadlines, cookieQueries, createdTabs, removedCookies, events, timers,
        keepAlives: () => keepAlives, debug, warnings,
    };
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
    assert.deepEqual(structuredClone(vm.runInContext("HOST_PERMISSION", context)), { origins: [origin] });
    assert.ok(permitted(manifest.host_permissions, vm.runInContext("ALLOWED_PREFIX", context)));
    assert.deepEqual(
        manifest.host_permissions,
        structuredClone(vm.runInContext("COOKIE_PERMISSION", context)).origins,
        "the manifest asks for exactly what the session reset checks for",
    );
    assert.deepEqual(manifest.permissions, ["cookies"], "only cookies, to reset ANAF's session before the login tab");
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
        assert.equal((await send({ type: "login", url })).ok, true, url);
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
        assert.deepEqual(fetchCalls, [{
            url: ANAF_URL,
            options: { credentials: "include", redirect: "follow", cache: "no-store" },
        }]);
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

test("a fetch cut off by the deadline answers timeout, not certificate_required", async () => {
    // A real fetch rejects with the signal's reason once the deadline aborts it.
    const { send, deadlines } = loadBackground((url, options) => {
        deadlines.at(-1).callback();
        throw options.signal.reason;
    });

    assert.deepEqual(await send({ type: "fetch", url: ANAF_URL }), { ok: false, error: "timeout" });
    assert.deepEqual(deadlines.map(({ ms }) => ms), [90_000]);

    // AbortSignal.timeout's own rejection, in case the deadline is ever built that way.
    const domTimeout = loadBackground(() => {
        domTimeout.deadlines.at(-1).callback();
        throw new DOMException("signal timed out", "TimeoutError");
    });

    assert.deepEqual(await domTimeout.send({ type: "fetch", url: ANAF_URL }), { ok: false, error: "timeout" });
});

test("the deadline stops once the headers arrive, so a slow body download is not cut off", async () => {
    let clearedBeforeBody;
    const { send, deadlines } = loadBackground(async () => ({
        status: 200,
        url: ANAF_URL,
        arrayBuffer: async () => {
            clearedBeforeBody = deadlines[0].cleared;

            return new Uint8Array([1]).buffer;
        },
    }));

    assert.equal((await send({ type: "fetch", url: ANAF_URL })).ok, true);
    assert.equal(clearedBeforeBody, true);
});

test("at most four fetches use the network at once, leaving connections for the login tab", async () => {
    const pending = [];
    const { send, fetchCalls } = loadBackground(() => new Promise((resolve) => pending.push(resolve)));
    const replies = Array.from({ length: 6 }, () => send({ type: "fetch", url: ANAF_URL }));
    const settle = () => new Promise((resolve) => setImmediate(resolve));

    await settle();
    assert.equal(fetchCalls.length, 4);

    pending.shift()({ status: 200, url: ANAF_URL, arrayBuffer: async () => new ArrayBuffer(0) });
    await settle();
    assert.equal(fetchCalls.length, 5, "a finished fetch hands its slot to the next one");

    while (pending.length) {
        pending.shift()({ status: 200, url: ANAF_URL, arrayBuffer: async () => new ArrayBuffer(0) });
        await settle();
    }

    assert.equal(fetchCalls.length, 6);

    assert.deepEqual((await Promise.all(replies)).map(({ ok }) => ok), [true, true, true, true, true, true]);
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

test("login clears every cookie the ANAF host receives, partitioned or on .anaf.ro, before it opens the tab", async () => {
    const cookies = [
        { name: "MRHSession", domain: "webserviced.anaf.ro", hostOnly: true, path: "/", storeId: "0", secure: true },
        { name: "F5_ST", domain: ".webserviced.anaf.ro", hostOnly: false, path: "/SPVWS2", storeId: "0" },
        { name: "TS01", domain: ".anaf.ro", hostOnly: false, path: "/", storeId: "0" },
        { name: "CHIPS", domain: "webserviced.anaf.ro", hostOnly: true, path: "/", storeId: "0", partitionKey: { topLevelSite: "https://contapp.ro" } },
        // Neither reaches webserviced.anaf.ro, so neither is the gateway's.
        { name: "www", domain: "www.anaf.ro", hostOnly: true, path: "/", storeId: "0" },
        { name: "host", domain: "anaf.ro", hostOnly: true, path: "/", storeId: "0" },
    ];
    const { send, removedCookies, cookieQueries, events } = loadBackground(unreachable, { cookies });

    assert.deepEqual(await send({ type: "login", url: ANAF_URL }), { ok: true, reset: "cleared" });
    assert.deepEqual(cookieQueries, [{ domain: "anaf.ro", partitionKey: {} }]);
    assert.deepEqual(removedCookies, [
        { url: "https://webserviced.anaf.ro/", name: "MRHSession", storeId: "0" },
        { url: "https://webserviced.anaf.ro/SPVWS2", name: "F5_ST", storeId: "0" },
        { url: "https://anaf.ro/", name: "TS01", storeId: "0" },
        { url: "https://webserviced.anaf.ro/", name: "CHIPS", storeId: "0", partitionKey: { topLevelSite: "https://contapp.ro" } },
    ]);
    assert.deepEqual(events, ["cookie", "cookie", "cookie", "cookie", "tab"]);
});

test("in Firefox the cookie query covers first-party isolation and removal passes the cookie's first-party domain", async () => {
    const cookies = [{ name: "MRHSession", domain: "webserviced.anaf.ro", hostOnly: true, path: "/", storeId: "firefox-default", firstPartyDomain: "" }];
    const { send, removedCookies, cookieQueries } = loadBackground(unreachable, { cookies, firefox: true });

    assert.deepEqual(await send({ type: "login", url: ANAF_URL }), { ok: true, reset: "cleared" });
    assert.deepEqual(cookieQueries, [{ domain: "anaf.ro", partitionKey: {}, firstPartyDomain: null }]);
    assert.deepEqual(removedCookies, [{ url: "https://webserviced.anaf.ro/", name: "MRHSession", storeId: "firefox-default", firstPartyDomain: "" }]);
});

test("a session reset that cannot run is reported and logged, and the tab still opens", async () => {
    const getAllCookies = async () => { throw new Error("cookies API unavailable"); };
    const failing = loadBackground(unreachable, { getAllCookies });

    assert.deepEqual(await failing.send({ type: "login", url: ANAF_URL }), { ok: true, reset: "failed", message: "cookies API unavailable" });
    assert.deepEqual(failing.createdTabs, [{ url: ANAF_URL }]);
    assert.equal(failing.warnings.length, 1);

    // Without the host permission getAll returns nothing instead of failing, so it is checked up front.
    const revoked = loadBackground(unreachable, { granted: false });

    assert.deepEqual(await revoked.send({ type: "login", url: ANAF_URL }), {
        ok: true,
        reset: "failed",
        message: "permission for *://webserviced.anaf.ro/* and *://anaf.ro/* is not granted",
    });
    assert.deepEqual(revoked.cookieQueries, []);
    assert.deepEqual(revoked.createdTabs, [{ url: ANAF_URL }]);
});

test("login keeps a session the last fetch found alive, and clears one it found lost", async () => {
    const cookies = [{ name: "MRHSession", domain: "webserviced.anaf.ro", hostOnly: true, path: "/", storeId: "0" }];
    const replies = [
        respond(200, new Uint8Array(0))(),
        respond(200, new Uint8Array(0), "https://webserviced.anaf.ro/my.policy")(),
        respond(500, new Uint8Array(0))(),
    ];
    const { send, removedCookies } = loadBackground(() => replies.shift(), { cookies });

    await send({ type: "fetch", url: ANAF_URL });
    assert.deepEqual(await send({ type: "login", url: ANAF_URL }), { ok: true, reset: "kept" });
    assert.equal(removedCookies.length, 0, "another ContApp tab may be syncing with it");

    for (const lost of ["redirected to F5", "HTTP 500"]) {
        await send({ type: "fetch", url: ANAF_URL });
        assert.deepEqual(await send({ type: "login", url: ANAF_URL }), { ok: true, reset: "cleared" }, lost);
    }
});

test("login on a lost session cancels the fetches stuck on it", async () => {
    let started;
    const stuck = new Promise((resolve) => (started = resolve));
    const { send, signals } = loadBackground((url, options) => {
        started();

        return new Promise((resolve, reject) => options.signal.addEventListener("abort", () => reject(options.signal.reason)));
    });
    const reply = send({ type: "fetch", url: ANAF_URL });

    await stuck;
    assert.deepEqual(await send({ type: "login", url: ANAF_URL }), { ok: true, reset: "cleared" });
    assert.equal(signals[0].aborted, true);
    assert.deepEqual(await reply, { ok: false, error: "network", message: "cancelled by the ANAF login" });
});

test("login also cancels the fetches queued for a slot, and fetches sent during the reset wait for it", async () => {
    let finishReset;
    const resetRunning = new Promise((resolve) => (finishReset = resolve));
    const getAllCookies = async () => {
        await resetRunning;

        return [];
    };
    const { send, fetchCalls } = loadBackground((url, options) =>
        new Promise((resolve, reject) => options.signal.addEventListener("abort", () => reject(options.signal.reason))),
    { getAllCookies });
    const settle = () => new Promise((resolve) => setImmediate(resolve));
    const stuck = Array.from({ length: 6 }, () => send({ type: "fetch", url: ANAF_URL }));

    await settle();
    assert.equal(fetchCalls.length, 4);

    const login = send({ type: "login", url: ANAF_URL });
    await settle();

    // The freed slots must not go to the queued fetches while the dead session's cookies are still there.
    assert.equal(fetchCalls.length, 4);
    for (const reply of await Promise.all(stuck)) {
        assert.deepEqual(reply, { ok: false, error: "network", message: "cancelled by the ANAF login" });
    }

    const late = send({ type: "fetch", url: ANAF_URL });
    await settle();
    assert.equal(fetchCalls.length, 4, "a fetch sent during the reset waits for it");

    finishReset();
    assert.deepEqual(await login, { ok: true, reset: "cleared" });
    await settle();
    assert.equal(fetchCalls.length, 5, "and starts once the cookies are gone, with every slot free again");

    // A second login cancels it in turn, which shows it held a slot normally.
    const again = send({ type: "login", url: ANAF_URL });
    finishReset();
    await again;
    assert.deepEqual(await late, { ok: false, error: "network", message: "cancelled by the ANAF login" });
});

test("login opens a tab, and a tab that cannot be opened is a network error", async () => {
    const { send, createdTabs } = loadBackground(unreachable);
    assert.deepEqual(await send({ type: "login", url: ANAF_URL }), { ok: true, reset: "cleared" });
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
