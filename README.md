# contapp SPV browser extension

Lets [contapp](https://contapp.ro) read ANAF SPV messages using the qualified certificate that lives in the
user's browser (USB token, cloud HSM, OS keychain).

## What it is

ANAF's SPV web service (`https://webserviced.anaf.ro/SPVWS2/rest/`) only answers over mutual TLS, and the
user's qualified certificate usually lives on a USB token or cloud HSM whose key cannot be exported. The
browser already knows how to do that handshake (the OS keychain / PKCS#11 middleware asks for the PIN), but
a contapp page cannot read the response: ANAF sends no CORS headers and there is no JS API for client
certificates.

This extension is a dumb fetch proxy. A contapp page asks it to fetch an SPV URL, the browser performs the
mTLS handshake with the user's certificate, and the raw response is handed back to the page. The extension
holds no API token, does no background polling, stores nothing and never sees the PIN or the private key.
See [PRIVACY.md](PRIVACY.md).

| File | Role |
|---|---|
| `manifest.json` | Manifest V3, Chrome/Edge shaped. Source of truth for the version. |
| `background.js` | Service worker: validates the URL, fetches it, returns status/url/base64 body. |
| `content.js` | Injected into contapp pages; bridges `window.postMessage` to the service worker. |
| `icons/` | 16/48/128 PNG icons. |
| `build.sh` | Writes `dist/chrome` and `dist/firefox` and zips both (requires `jq` and `zip`). |
| `test/` | `node:test` suites that load both scripts in a stubbed `vm` context. |

## Install

The contapp page must be open in the same browser profile, and the token's middleware (or the
cloud-signature agent) must be installed on that machine.

### Chrome Web Store

Coming soon.

### From a GitHub release (Chrome / Edge)

1. Download `contapp-spv-chrome-<version>.zip` from the
   [latest release](https://github.com/Kronos-IT-Support-Consulting/contapp-spv-extension/releases/latest)
   and unzip it into a folder you will keep.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Enable **Developer mode**.
4. **Load unpacked** → select the unzipped folder.
5. Reload any open contapp tab so the content script is injected.

### Firefox (temporary add-on)

1. Download `contapp-spv-firefox-<version>.zip` from the release (or run `./build.sh`).
2. `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → pick the zip (or
   `dist/firefox/manifest.json`).

Temporary add-ons disappear when Firefox restarts. A release whose repository has AMO keys configured also
carries a signed `.xpi`, which installs permanently.

Firefox MV3 does not run `background.service_worker`; it needs `background.scripts`. `build.sh` rewrites
that key for the Firefox variant, adds the `data_collection_permissions` declaration AMO requires, and drops
`browser_specific_settings` from the Chrome variant. The gecko id `spv@contapp.ro` must stay stable.

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
| `{type:"login", url}` | `{ok:true}` after `chrome.tabs.create({url})` |
| any | `{ok:false, error:"certificate_required"\|"forbidden_url"\|"network"\|"extension"\|"unknown_type"}` |

- `certificate_required`: `fetch` threw a `TypeError`. That is what Chrome returns when ANAF demands a client
  certificate and no tab can show the picker (`ERR_SSL_CLIENT_AUTH_CERT_NEEDED`), but also for any other
  network-level failure. The page should offer the `login` action.
- `forbidden_url`: the URL is not under the SPV REST prefix.
- `network`: anything else went wrong; `message` carries the error text.
- `extension`: the content script could not reach the service worker (extension reloaded/updated; reload
  the contapp page).
- `unknown_type`: the `type` is none of the above.

Presence check without a round trip: the content script sets
`document.documentElement.dataset.spvExtension` (i.e. `<html data-spv-extension="1.0.0">`) at
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

## How contapp uses it

The page side of the protocol (`spv-bridge.js`) lives in the contapp application, not here. It detects the
extension through `<html data-spv-extension>`, sends `ping`/`fetch`/`login` requests, and contapp's server
parses the SPV responses it hands back. contapp's connect form offers only the browser extension as the
way to reach SPV, so any change to the message shapes above must ship in both repositories together.

### End-to-end walkthrough (what the user sees)

1. **Connect the certificate** — contapp → account menu → *Certificat SPV*. There is nothing to upload:
   click **Conectează**. The page now shows the connected state with *CNP titular* empty and
   *Nesincronizat încă*.
2. **Verify** — click **Verifică**.
   - Without the extension: a callout *Instalează extensia contapp SPV* appears and the button stays
     disabled. Install, then reload the page.
   - First time in this browser session: a warning toast *ANAF a cerut certificatul…* and a callout with
     the **Autentificare ANAF** button appear. This is expected: a background request cannot show the
     certificate picker.
3. **Authenticate at ANAF** — click **Autentificare ANAF**. A new tab opens on
   `webserviced.anaf.ro/SPVWS2/rest/listaMesaje?zile=1`. The browser shows the certificate picker;
   choose the SPV certificate, then the token asks for its PIN. The tab ends on a raw JSON page (either
   a message list or `{"eroare":…}`). That JSON *is* the success: the browser now holds the ANAF
   session cookie and remembers the certificate for this host. Close the tab or leave it, both work.
   If the tab shows an F5 `/my.policy` page instead, wait for it to redirect; if it stays blank, reload it once.
4. **Verify again** — back in contapp, click **Verifică**. A success toast *Certificat valid pentru CNP …,
   cu acces la N CUI-uri* appears and the page fills in *CNP titular*, *Serie certificat* and *CUI-uri acces*.
5. **Sync the inbox** — sidebar *Declarații* → *Mesaje SPV* → **Sincronizează SPV**. The toast reports
   how many messages were created, updated and skipped, and the table lists the messages whose CIF matches
   the current company. Messages for CUIs that are not a contapp company count as *ignorate*.
6. **Download a message** — click the download icon on a row. The extension fetches the PDF from
   `descarcare?id=<anaf id>`, contapp stores it, the row flips to *Descărcat* and the PDF opens in a new
   tab. From then on the icon links straight to the stored file, with no ANAF round trip.
7. **Session expiry** — when ANAF drops the session (toast *ANAF a cerut certificatul…* again), repeat
   steps 3 and 4. Nothing is lost; synced messages and downloaded PDFs stay in contapp.
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
3. Load the extension unpacked (above). Open any contapp page and the DevTools console.
4. Ping: run the example snippet above. Expect `{ok:true, version:"1.0.0", ...}`.
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
10. Service worker logs: `chrome://extensions` → contapp SPV → **service worker** link → console.

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
npm install      # web-ext, the only dev dependency
npm test         # node:test suites in test/
./build.sh       # dist/chrome, dist/firefox and both zips
npm run lint     # web-ext lint on dist/firefox (run ./build.sh first)
```

`web-ext lint` is Mozilla's linter, so it only runs on the Firefox build: on the Chrome build it always
fails on the missing `background.scripts` fallback and gecko id, which Chrome neither needs nor wants.

To try changes, load the repository folder unpacked in Chrome (it is Chrome-shaped as is), or
`dist/firefox` in Firefox after `./build.sh`. Reload the extension and the contapp tab after each change.

## Release process

1. Bump `version` in **both** `manifest.json` and `package.json` (then `npm install` to sync the lockfile).
2. Add a section to `CHANGELOG.md`.
3. Commit, then tag and push:
   ```sh
   git tag v1.2.3
   git push && git push --tags
   ```

The `Release` workflow then checks that the tag equals `v` + the manifest version (and fails otherwise),
runs the tests, builds, lints, and creates a GitHub Release with both zips and auto-generated notes.
Two more steps run only when their secrets are configured, and are skipped otherwise:

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

- [ ] Privacy policy page on contapp.ro (no data collected; responses go only to the contapp page that asked).
      [PRIVACY.md](PRIVACY.md) is the text.
- [ ] Chrome Web Store listing as **unlisted**, single-purpose description, justification for `tabs` and the
      `webserviced.anaf.ro` host permission.
- [ ] Edge Add-ons submission (same package as Chrome; afterwards the release workflow updates it).
- [ ] Firefox: sign `dist/firefox` via AMO (unlisted / self-distributed), keep the `spv@contapp.ro` gecko id
      stable.
- [ ] Bump `version` in `manifest.json` (and `package.json`) for every published build.
