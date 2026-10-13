const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");
const ANAF_URL = "https://webserviced.anaf.ro/SPVWS2/rest/listaMesaje?zile=60";

function loadBackground(fetchImpl) {
    const fetchCalls = [];
    const createdTabs = [];
    let listener;

    const context = vm.createContext({
        btoa,
        console: { debug() {} },
        fetch: async (url, options) => {
            fetchCalls.push({ url, options });

            return fetchImpl(url, options, context);
        },
        chrome: {
            runtime: {
                getManifest: () => ({ version: "9.8.7" }),
                onMessage: { addListener: (callback) => (listener = callback) },
            },
            tabs: { create: async (tab) => createdTabs.push(structuredClone(tab)) },
        },
    });

    vm.runInContext(source, context);

    const send = (message) =>
        new Promise((resolve) => {
            // Responses come from the vm realm; clone them so deepEqual compares plain objects.
            assert.equal(listener(message, {}, (response) => resolve(structuredClone(response))), true);
        });

    return { send, fetchCalls, createdTabs };
}

const unreachable = () => assert.fail("fetch must not be called");

test("ping answers the manifest version", async () => {
    const { send } = loadBackground(unreachable);

    assert.deepEqual(await send({ type: "ping" }), { ok: true, version: "9.8.7" });
});

test("fetch refuses URLs outside the SPV REST API without fetching", async () => {
    const { send, fetchCalls } = loadBackground(unreachable);

    for (const url of ["https://example.com/", "https://webserviced.anaf.ro/other/", undefined]) {
        assert.deepEqual(await send({ type: "fetch", url }), { ok: false, error: "forbidden_url" });
    }

    assert.equal(fetchCalls.length, 0);
});

test("fetch returns status, final url and the body as base64", async () => {
    const bytes = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff]);
    const { send, fetchCalls } = loadBackground(async () => ({
        status: 200,
        url: `${ANAF_URL}&final`,
        arrayBuffer: async () => bytes.buffer,
    }));

    assert.deepEqual(await send({ type: "fetch", url: ANAF_URL }), {
        ok: true,
        status: 200,
        url: `${ANAF_URL}&final`,
        body: Buffer.from(bytes).toString("base64"),
    });
    assert.equal(fetchCalls[0].url, ANAF_URL);
    assert.equal(fetchCalls[0].options.credentials, "include");
});

test("a TypeError from fetch means the certificate is required", async () => {
    const { send } = loadBackground((url, options, context) => {
        // The worker checks instanceof TypeError against its own realm's constructor.
        const RealmTypeError = vm.runInContext("TypeError", context);

        throw new RealmTypeError("Failed to fetch");
    });

    assert.deepEqual(await send({ type: "fetch", url: ANAF_URL }), { ok: false, error: "certificate_required" });
});

test("any other fetch error is a network error with its message", async () => {
    const { send } = loadBackground(() => {
        throw new Error("boom");
    });

    assert.deepEqual(await send({ type: "fetch", url: ANAF_URL }), { ok: false, error: "network", message: "boom" });
});

test("login opens a tab only for SPV URLs", async () => {
    const { send, createdTabs } = loadBackground(unreachable);

    assert.deepEqual(await send({ type: "login", url: "https://example.com/" }), { ok: false, error: "forbidden_url" });
    assert.deepEqual(await send({ type: "login", url: ANAF_URL }), { ok: true });
    assert.deepEqual(createdTabs, [{ url: ANAF_URL }]);
});

test("unknown message types are rejected", async () => {
    const { send } = loadBackground(unreachable);

    assert.deepEqual(await send({ type: "delete" }), { ok: false, error: "unknown_type" });
    assert.deepEqual(await send(undefined), { ok: false, error: "unknown_type" });
});
