# ContApp SPV browser extension

[![CI](https://github.com/Kronos-IT-Support-Consulting/contapp-spv-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/Kronos-IT-Support-Consulting/contapp-spv-extension/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Kronos-IT-Support-Consulting/contapp-spv-extension)](https://github.com/Kronos-IT-Support-Consulting/contapp-spv-extension/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Lets [ContApp](https://contapp.ro) read ANAF SPV messages using the qualified certificate that lives in the
user's browser (USB token, cloud HSM, OS keychain).

## What it is

ANAF's SPV web service (`https://webserviced.anaf.ro/SPVWS2/rest/`) only answers over mutual TLS, and the
user's qualified certificate usually lives on a USB token or cloud HSM whose key cannot be exported. The
browser already knows how to do that handshake (the OS keychain / PKCS#11 middleware asks for the PIN), but
a ContApp page cannot read the response: ANAF sends no CORS headers and there is no JS API for client
certificates.

This extension is a dumb fetch proxy. A ContApp page asks it to fetch an SPV URL, the browser performs the
mTLS handshake with the user's certificate, and the raw response is handed back to the page. The extension
holds no API token, does no background polling, stores nothing and never sees the PIN or the private key.
See [PRIVACY.md](PRIVACY.md).

| File | Role |
|---|---|
| `manifest.json` | Manifest V3, Chrome/Edge shaped. Its `version` is stamped from the release tag by the workflow; the `1.0.0` in the repository only matters for load-unpacked development. |
| `background.js` | Service worker: validates the URL, fetches it, returns status/url/base64 body. |
| `content.js` | Injected into ContApp pages; bridges `window.postMessage` to the service worker. |
| `icons/` | 16/48/128 PNG icons, plus the SVG sources they are rendered from. |
| `build.sh` | Writes `dist/chrome` and `dist/firefox` and zips both (requires `jq` and `zip`). |
| `test/` | `node:test` suites that load both scripts in a stubbed `vm` context. |
| `store/` | Store listing texts, the 512 px store icon and the screenshots. |
| `PRIVACY.md`, `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE` | Privacy policy (published by GitHub Pages), changelog, security policy, contribution rules, MIT licence. |
| `.github/` | CI and release workflows, Dependabot, code owners, pull request template. |

## Install

The ContApp page must be open in the same browser profile, and the token's middleware (or the
cloud-signature agent) must be installed on that machine.

### Chrome Web Store

Not published yet. The listing will be unlisted; the install link will be shown on ContApp's *Certificat SPV* page.

### From a GitHub release (Chrome / Edge)

1. Download `contapp-spv-chrome-<version>.zip` from the
   [latest release](https://github.com/Kronos-IT-Support-Consulting/contapp-spv-extension/releases/latest)
   and unzip it into a folder you will keep.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Enable **Developer mode**.
4. **Load unpacked** → select the unzipped folder.
5. Reload any open ContApp tab so the content script is injected.

### Firefox (temporary add-on)

1. Download `contapp-spv-firefox-<version>.zip` from the release (or run `./build.sh`).
2. `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → pick the zip (or
   `dist/firefox/manifest.json`).

Temporary add-ons disappear when Firefox restarts. A release whose repository has AMO keys configured also
carries a signed `.xpi`, which installs permanently.

Firefox MV3 does not run `background.service_worker`; it needs `background.scripts`. `build.sh` rewrites
that key for the Firefox variant, adds the `data_collection_permissions` declaration AMO requires, and drops
`browser_specific_settings` from the Chrome variant. The gecko id `spv@contapp.ro` must stay stable.

The declaration lists *personally identifying* and *financial* information: the extension stores nothing itself,
but the SPV responses it relays carry the certificate holder's CNP, CUIs and tax documents, which the ContApp page
then stores in the user's account, and Mozilla counts data handed outside the add-on as collection. Firefox 140+
shows this in the install prompt, hence `strict_min_version: "140.0"`. Firefox also lets the user revoke the ANAF
host permission at any time (*about:addons* → ContApp SPV → the permissions tab); the extension then answers
`network` with the message `permission for https://webserviced.anaf.ro/* is not granted`. The manifest declares no
`gecko_android` key because Firefox for Android has no client-certificate store; `web-ext lint` still prints one
advisory warning about the Android minimum version, which is expected.

Chrome and Edge need version 110 or newer (`minimum_chrome_version`): from 110 an extension API call resets the
service worker's idle timer, which is how the worker stays alive while an SPV response is pending.

## Protocol

Page ↔ content script, via `window.postMessage`. Both sides check `event.origin === location.origin` and
`event.source === window`. Every message carries `channel: "contapp-spv"` and an `id`; replies also carry
`direction: "reply"` so the page can tell its own requests from answers (the content script ignores
anything marked as a reply).

Only URLs under `https://webserviced.anaf.ro/SPVWS2/rest/` are accepted for `fetch` and `login`.

| page sends | extension answers |
|---|---|
| `{type:"ping"}` | `{ok:true, version}` |
| `{type:"fetch", url}` | `{ok:true, status, url, body}` with `body` an ArrayBuffer (structured clone) |
| `{type:"login", url}` | `{ok:true}` after clearing the `webserviced.anaf.ro` cookies and `chrome.tabs.create({url})`, or `{ok:false, error:"network", message}` if the tab cannot be opened |
| any | `{ok:false, error:"certificate_required"\|"timeout"\|"forbidden_url"\|"network"\|"extension"\|"unknown_type", message?}` |

- `certificate_required`: `fetch` threw a `TypeError`. That is what Chrome returns when ANAF demands a client
  certificate and no tab can show the picker (`ERR_SSL_CLIENT_AUTH_CERT_NEEDED`), but also for any other
  network-level failure. The page should offer the `login` action.
- `timeout`: ANAF did not answer within 90 s, usually a handshake stuck on a certificate picker or PIN prompt that
  never showed. The request is aborted so it stops holding one of Chrome's six connections to the host. The page
  should offer the `login` action.
- `forbidden_url`: the URL, once parsed and normalised the way `fetch` would, is not under the SPV REST prefix
  (so `…/SPVWS2/rest/../x` is refused). The request and the login tab use the normalised URL.
- `network`: anything else went wrong; `message` carries the error text. Besides fetch failures this covers a
  response too large to hand over (above 47 MiB), a host permission the user revoked, and a login tab that could
  not be opened.
- `extension`: the content script got no usable answer from the service worker (extension reloaded or updated,
  or a service worker that died mid-request). Retry once; if it persists, reload the ContApp page.
- `unknown_type`: the `type` is none of the above.

The request follows redirects, and the reply's `url` is the final one. When ANAF's session is gone, the SPV
service redirects to its F5 login pages and answers `200` with HTML: the reply is still `ok:true`, so the page
should check that `url` still starts with the SPV REST prefix and otherwise treat the session as lost and offer
`login`.

Presence check without a round trip: the content script sets
`document.documentElement.dataset.spvExtension` (i.e. `<html data-spv-extension="<version>">`) at
`document_start`.

Example from the page:

```js
const id = crypto.randomUUID();
window.addEventListener("message", function onReply(event) {
    if (event.source !== window || event.data?.channel !== "contapp-spv" || event.data.direction !== "reply" || event.data.id !== id) return;
    window.removeEventListener("message", onReply);
    console.log(event.data);
});
window.postMessage({ channel: "contapp-spv", id, type: "ping" }, location.origin);
```

## How ContApp uses it

The page side of the protocol (`spv-bridge.js`) lives in the ContApp application, not here. It detects the
extension through `<html data-spv-extension>`, sends `ping`/`fetch`/`login` requests, and ContApp's server
parses the SPV responses it hands back. ContApp's connect form offers only the browser extension as the
way to reach SPV, so any change to the message shapes above must ship in both repositories together.

### End-to-end walkthrough (what the user sees)

1. **Connect the certificate** — ContApp → account menu → *Certificat SPV*. There is nothing to upload:
   click **Conectează**. The page now shows the connected state with *CNP titular* empty and
   *Nesincronizat încă*.
2. **Verify** — click **Verifică**.
   - Without the extension: a callout *Instalează extensia ContApp SPV* appears and the button stays
     disabled. Install, then reload the page.
   - First time in this browser session: a warning toast *ANAF a cerut certificatul…* and a callout with
     the **Autentificare ANAF** button appear. This is expected: a background request cannot show the
     certificate picker.
3. **Authenticate at ANAF** — click **Autentificare ANAF**. A new tab opens on
   `webserviced.anaf.ro/SPVWS2/rest/listaMesaje?zile=60`. The browser shows the certificate picker;
   choose the SPV certificate, then the token asks for its PIN. The tab ends on a raw JSON page (either
   a message list or `{"eroare":…}`). That JSON *is* the success: the browser now holds the ANAF
   session cookie and remembers the certificate for this host. Close the tab or leave it, both work.
   If the tab shows an F5 `/my.policy` page instead, wait for it to redirect; if it stays blank, reload it once.
4. **Verify again** — back in ContApp, click **Verifică**. A success toast *Certificat valid pentru CNP …,
   cu acces la N CUI-uri* appears and the page fills in *CNP titular*, *Serie certificat* and *CUI-uri acces*.
5. **Sync the inbox** — sidebar *Declarații* → *Mesaje SPV* → **Sincronizează SPV**. The toast reports
   how many messages were created, updated and skipped, and the table lists the messages whose CIF matches
   the current company. Messages for CUIs that are not a ContApp company count as *ignorate*.
6. **Download a message** — click the download icon on a row. The extension fetches the PDF from
   `descarcare?id=<anaf id>`, ContApp stores it, the row flips to *Descărcat* and the PDF opens in a new
   tab. From then on the icon links straight to the stored file, with no ANAF round trip.
7. **Session expiry** — when ANAF drops the session (toast *ANAF a cerut certificatul…* again), repeat
   steps 3 and 4. Nothing is lost; synced messages and downloaded PDFs stay in ContApp.
8. **Request a document** — on *Mesaje SPV* click **Cerere nouă**, pick a type (e.g. *D300*) and fill only
   the fields it asks for (year, month, reason, …), then **Trimite cererea**. The extension calls
   `cerere?tip=…&cui=<current company>…` and the toast reads *Cererea <id> a fost transmisă…*. ANAF generates
   the answer later: a following **Sincronizează SPV** lists it as a new message.

Things that are *not* a problem: the login tab showing JSON, the PIN being asked only once per browser
session, the service worker in `chrome://extensions` showing *inactive* between clicks.

### Manual spike test (Chrome, USB token)

1. Make sure the token middleware is installed and Chrome can see the certificate: opening
   `https://webserviced.anaf.ro/SPVWS2/rest/listaMesaje?zile=1` directly in a tab should show the
   certificate picker and a PIN prompt.
2. Quit and restart Chrome so no certificate choice is cached.
3. Load the extension unpacked (above). Open any ContApp page and the DevTools console.
4. Ping: run the example snippet above. Expect `{ok:true, version:"<version>", ...}`.
5. Fetch before login, expect `certificate_required`:
   ```js
   const ask = (msg) => new Promise((resolve) => {
       const id = crypto.randomUUID();
       window.addEventListener("message", function onReply(e) {
           if (e.source !== window || e.data?.channel !== "contapp-spv" || e.data.direction !== "reply" || e.data.id !== id) return;
           window.removeEventListener("message", onReply);
           resolve(e.data);
       });
       window.postMessage({ channel: "contapp-spv", id, ...msg }, location.origin);
   });
   const url = "https://webserviced.anaf.ro/SPVWS2/rest/listaMesaje?zile=60";
   await ask({ type: "fetch", url });
   ```
6. Login: `await ask({ type: "login", url: "https://webserviced.anaf.ro/SPVWS2/rest/listaMesaje?zile=1" })`.
   A tab opens; pick the certificate, enter the PIN, confirm JSON shows, then close the tab.
7. Fetch again: `const r = await ask({ type: "fetch", url }); r.status; new TextDecoder().decode(r.body)`.
   Expect status 200 and the messages JSON.
8. Download one message: take an `id` from step 7 and run
   `await ask({ type: "fetch", url: "https://webserviced.anaf.ro/SPVWS2/rest/descarcare?id=<id>" })`;
   the body should start with `%PDF` (`new TextDecoder().decode(r.body.slice(0, 4))`).
9. Forbidden URL: `await ask({ type: "fetch", url: "https://example.com/" })` → `forbidden_url`.
10. Service worker logs: `chrome://extensions` → ContApp SPV → **service worker** link → console.

### Spike findings

First run: 2026-10-13, Chrome on Windows, USB token, against staging (the real page flow, not the DevTools spike).

- [x] (1) A service-worker `fetch` succeeds after authenticating once in the login tab: yes — *Sincronizează SPV* listed the inbox.
- [ ] (2) The certificate selection survives closing the login tab: not checked yet.
- [ ] (3) When ANAF's F5 session (`MRHSession`) expires (idle / absolute, observed time): not observed yet.
- [x] (4) Chrome accepts the manifest as shipped (no errors/warnings on `chrome://extensions`): yes, loaded unpacked.

Fallback if (1) ever fails: run the fetch inside the ANAF tab instead. The `login` action keeps a handle on
the tab it opened, the service worker injects a function into it with `chrome.scripting.executeScript`
(adds the `scripting` permission), that function does a same-origin `fetch` (the certificate prompt anchors
to that tab) and returns the base64 body, and the service worker relays it to the content script exactly as
today. The page-facing protocol does not change; the page may only need to keep the ANAF tab open while
syncing.

## Development

Requires Node 22+, `jq` and `zip`.

```sh
npm install      # web-ext and the Chrome Web Store uploader, the only dev dependencies
npm test         # node:test suites in test/
./build.sh       # dist/chrome, dist/firefox and both zips
npm run lint     # web-ext lint on dist/firefox (run ./build.sh first)
```

`web-ext lint` is Mozilla's linter, so it only runs on the Firefox build: on the Chrome build it always
fails on the missing `background.scripts` fallback and gecko id, which Chrome neither needs nor wants.

To try changes, load the repository folder unpacked in Chrome (it is Chrome-shaped as is and still matches the
local `contapp.test` hosts), or `dist/firefox` in Firefox after `./build.sh`. Reload the extension and the
ContApp tab after each change. `build.sh` strips the `.test` hosts, so release builds only run on `*.contapp.ro`.

Contributions: see [CONTRIBUTING.md](CONTRIBUTING.md); security reports: [SECURITY.md](SECURITY.md). MIT licensed.

## Release process

**From the browser (normal way):** Actions → **Release** → **Run workflow** → branch `main`, bump `patch`
(or `minor` / `major`) → **Run workflow**. The workflow takes the latest `v*` tag, increases it, and releases
the current `main` under the new tag.

**From a terminal (alternative):** tag a commit on `main` and push the tag (`git tag -a v1.2.3 -m v1.2.3 &&
git push origin v1.2.3`); the workflow releases that tag.

Either way the tag is the version: the workflow stamps it into `manifest.json` before building, so the version in
the repository's `manifest.json` is never bumped by hand (it only matters for load-unpacked development). The
workflow then runs the tests, builds, lints, and creates the GitHub Release with both zips and notes generated
from the merged pull requests. Creating a release needs write access to the repository; a pushed tag is only
released when its commit is on `main`, and once created, `v*` tags cannot be moved or deleted (ruleset *Release
tags*). Re-running the workflow on a commit that is already released refreshes that release's assets instead of
bumping again; a store that already holds the version will then refuse it, which the last step reports.

Three more steps run only when their secrets are configured, and are skipped otherwise:

| Step | Repository secrets |
|---|---|
| Upload and publish the Chrome zip to the Chrome Web Store | `CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN` |
| Sign the Firefox build on AMO (unlisted) and attach the `.xpi` to the release | `AMO_JWT_ISSUER`, `AMO_JWT_SECRET` |
| Upload the Chrome zip to Edge Add-ons and submit it for review | `EDGE_PRODUCT_ID`, `EDGE_CLIENT_ID`, `EDGE_API_KEY` |

Set them with `gh secret set NAME` (or Settings → Secrets and variables → Actions). Every store needs the
listing created once by hand; the workflow only ships new versions of an existing item.

### Chrome Web Store secrets

1. In the [developer dashboard](https://chrome.google.com/webstore/devconsole) create the item by uploading
   `contapp-spv-chrome-<version>.zip`, fill in the listing and privacy tabs, choose *Unlisted* and submit it.
   The 32-letter id shown on the item is `CWS_EXTENSION_ID`.
2. In [Google Cloud Console](https://console.cloud.google.com/), with the **same Google account** that owns
   the dashboard item: create a project, *APIs & Services → Library* → enable **Chrome Web Store API**.
3. *APIs & Services → OAuth consent screen*: user type *External*, fill in the app name and emails, no scopes
   needed, then **Publish app** (keep it in *Production*; in *Testing* status the refresh token expires after
   7 days). The "unverified app" warning on the consent screen is expected and harmless here.
4. *Credentials → Create credentials → OAuth client ID*, type **Desktop app**. Copy the client id and secret
   (`CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`).
5. Get the refresh token once: open this URL in the browser signed in as the owner account (replace
   `CLIENT_ID`):
   ```
   https://accounts.google.com/o/oauth2/v2/auth?client_id=CLIENT_ID&redirect_uri=http://localhost:8818&response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&access_type=offline&prompt=consent
   ```
   Approve; the browser is sent to `http://localhost:8818/?code=…` (the page fails to load, that is fine).
   Copy the `code` value from the address bar and exchange it within a minute:
   ```sh
   curl -s https://oauth2.googleapis.com/token \
     -d client_id=CLIENT_ID -d client_secret=CLIENT_SECRET \
     -d code=CODE -d grant_type=authorization_code -d redirect_uri=http://localhost:8818
   ```
   The `refresh_token` in the answer is `CWS_REFRESH_TOKEN`. It stays valid until revoked.

Edge users can also install directly from the Chrome Web Store page (Edge asks once to allow extensions
from other stores), so the Edge listing below is optional.

### Firefox (AMO) secrets

1. Sign in at <https://addons.mozilla.org/developers/> with the account that will own the add-on.
2. <https://addons.mozilla.org/developers/addon/api/key/> → **Generate new credentials**. The *JWT issuer*
   is `AMO_JWT_ISSUER`, the *JWT secret* is `AMO_JWT_SECRET`.
3. The first `web-ext sign` run creates the add-on (id `spv@contapp.ro`) on that account as unlisted /
   self-distributed; nothing has to be created by hand. The signed `.xpi` lands on the GitHub release.

### Edge Add-ons secrets

1. Register at [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview) (free) and
   create the extension by uploading `contapp-spv-chrome-<version>.zip`, fill in the listing, set visibility
   *Hidden* (install only by link) and submit it. Once it exists, the overview URL contains the
   **Product ID** (`EDGE_PRODUCT_ID`).
2. Partner Center → **Publish API** → **Create API credentials**: copy the *Client ID* (`EDGE_CLIENT_ID`) and
   the *API key* (`EDGE_API_KEY`). The key is shown once and expires after the chosen period (max 2 years);
   generate a new one before it expires.

## Store checklist

- [x] Privacy policy: [PRIVACY.md](PRIVACY.md), served by GitHub Pages at <https://kronos-it-support-consulting.github.io/contapp-spv-extension/PRIVACY>.
- [ ] Chrome Web Store listing as **unlisted**, single-purpose description, justification for the
      `webserviced.anaf.ro` host permission, data-usage disclosure matching the privacy policy.
- [ ] Edge Add-ons submission (same package as Chrome; afterwards the release workflow updates it).
- [ ] Firefox: sign `dist/firefox` via AMO (unlisted / self-distributed), keep the `spv@contapp.ro` gecko id
      stable.

### Store listing

- [store/listing.md](store/listing.md): every text and answer to paste into the Chrome Web Store, Edge Partner
  Center and (if asked) AMO forms: descriptions, single purpose, permission justifications, data-usage answers,
  reviewer notes and the assets checklist.
- [PRIVACY.md](PRIVACY.md): the privacy policy (Romanian, then English), published by GitHub Pages at
  <https://kronos-it-support-consulting.github.io/contapp-spv-extension/PRIVACY>; that URL goes into every store's privacy-policy field.
- [store/screenshots/](store/screenshots/): the 1280×800 store screenshots listed in `store/listing.md`.
- GitHub Pages is configured in the repository settings (branch `main`, folder `/`), not in a workflow;
  `_config.yml` keeps the scripts and tests out of the published site.

## Known limitations

- The content script matches `https://*.contapp.ro/*`, which includes the apex `contapp.ro` (the marketing site)
  and every other subdomain. Any script injection on one of those hosts can drive the proxy. Narrow `matches` to the
  exact application host(s) once they are fixed; this needs the same change in the store justifications and in
  `PRIVACY.md`.
