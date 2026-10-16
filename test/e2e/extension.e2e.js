// Loads the built Chrome extension (dist/chrome, run ./build.sh first) into Playwright's Chromium with a throwaway
// profile. Every request is answered by routes, and anything not routed goes to a dead proxy: nothing reaches ANAF.
// Run with `npm run test:e2e`; `npx playwright install chromium` fetches the browser.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");

const EXTENSION = path.join(__dirname, "..", "..", "dist", "chrome");
const VERSION = JSON.parse(fs.readFileSync(path.join(EXTENSION, "manifest.json"), "utf8")).version;
const APP = "https://contabilitate.contapp.ro/";
const API = "https://webserviced.anaf.ro/SPVWS2/rest/listaMesaje?zile=60";
const PAGE = { contentType: "text/html", body: "<!doctype html><title>ContApp</title>" };

let context;
let profile;
let worker;
// How the routed ANAF host answers the next request: json, html or hang. Playwright does not route the request a
// redirect leads to, so the F5 redirect is covered by the unit tests only.
let anaf = "json";
const hung = [];

before(async () => {
    profile = fs.mkdtempSync(path.join(os.tmpdir(), "contapp-spv-e2e-"));
    context = await chromium.launchPersistentContext(profile, {
        channel: "chromium",
        headless: true,
        args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`, "--proxy-server=127.0.0.1:9"],
    });

    await context.route(/^https:\/\/[a-z]+\.contapp\.ro\//, (route) => route.fulfill(PAGE));
    await context.route("https://evil.example/**", (route) => route.fulfill(PAGE));
    await context.route("https://webserviced.anaf.ro/**", (route) => {
        switch (anaf) {
            case "json":
                return route.fulfill({ contentType: "application/json", body: '{"mesaje":[]}' });
            case "html":
                return route.fulfill({ contentType: "text/html", body: "<html>F5</html>" });
            default:
                return new Promise((resolve) => hung.push(() => resolve(route.abort().catch(() => {}))));
        }
    });

    worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
});

after(async () => {
    hung.forEach((release) => release());
    await context?.close();
    fs.rmSync(profile, { recursive: true, force: true });
});

async function open(url) {
    const page = await context.newPage();
    await page.goto(url);

    return page;
}

// Posts a request the way ContApp does and resolves with the reply, its ArrayBuffer body decoded as text, or
// "no reply" after `timeout` ms.
function ask(page, message, { id = Math.random().toString(36).slice(2), timeout = 5000 } = {}) {
    return page.evaluate(([message, id, timeout]) => new Promise((resolve) => {
        const timer = setTimeout(() => resolve("no reply"), timeout);

        addEventListener("message", function listen({ data }) {
            if (data?.channel !== "contapp-spv" || data.direction !== "reply" || data.id !== id) {
                return;
            }

            clearTimeout(timer);
            removeEventListener("message", listen);
            resolve(data.body instanceof ArrayBuffer ? { ...data, body: new TextDecoder().decode(data.body) } : data);
        });
        postMessage({ channel: "contapp-spv", id, ...message }, location.origin);
    }), [message, id, timeout]);
}

const tell = (page, message) => page.evaluate((message) => postMessage({ channel: "contapp-spv", ...message }, location.origin), message);
const marker = (page) => page.evaluate(() => document.documentElement.dataset.spvExtension ?? null);
const reply = (fields) => ({ channel: "contapp-spv", direction: "reply", ...fields });

test("the bridge answers on a ContApp host", async () => {
    const page = await open(APP);

    assert.equal(await marker(page), VERSION);
    assert.deepEqual(await ask(page, { type: "ping" }, { id: "1" }), reply({ id: "1", ok: true, version: VERSION }));
    assert.deepEqual(await ask(page, { type: "nope" }, { id: "2" }), reply({ id: "2", ok: false, error: "unknown_type" }));
    assert.deepEqual(
        await ask(page, { type: "fetch", url: "https://example.com/" }, { id: "3" }),
        reply({ id: "3", ok: false, error: "forbidden_url" }),
    );
});

test("fetch hands over an SPV answer and reports a lost session", async () => {
    const page = await open(APP);

    anaf = "json";
    assert.deepEqual(await ask(page, { type: "fetch", url: API }, { id: "f" }), reply({ id: "f", ok: true, status: 200, url: API, body: '{"mesaje":[]}' }));

    anaf = "html";
    assert.deepEqual(await ask(page, { type: "fetch", url: API }, { id: "gateway" }), reply({ id: "gateway", ok: false, error: "session_lost" }));
});

test("the page can cancel a pending fetch", async () => {
    const page = await open(APP);

    anaf = "hang";
    const pending = ask(page, { type: "fetch", url: API }, { id: "slow" });
    await page.waitForTimeout(300);
    await tell(page, { id: "slow", type: "cancel" });

    assert.deepEqual(await pending, reply({ id: "slow", ok: false, error: "cancelled" }));
});

test("pages outside the ContApp hosts get no bridge", async () => {
    for (const url of ["https://evil.example/", "https://blog.contapp.ro/"]) {
        const page = await open(url);

        assert.equal(await marker(page), null, url);
        assert.equal(await ask(page, { type: "ping" }, { timeout: 1500 }), "no reply", url);
    }
});

// Last: it reloads the extension, which leaves the open tab with a stale content script.
test("after a reload, an open tab says so instead of failing every request", async () => {
    const page = await open(APP);

    anaf = "hang";
    const pending = ask(page, { type: "fetch", url: API }, { id: "during" });
    await page.waitForTimeout(300);
    await worker.evaluate(() => chrome.runtime.reload()).catch(() => {});

    assert.ok(["extension", "extension_reloaded"].includes((await pending).error));
    assert.deepEqual(await ask(page, { type: "ping" }, { id: "after" }), reply({ id: "after", ok: false, error: "extension_reloaded" }));
    assert.equal(await marker(page), null);
});
