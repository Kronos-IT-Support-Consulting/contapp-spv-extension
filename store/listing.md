# Store listing — ContApp SPV

Everything to copy-paste when creating the store items by hand. After the first submission the release workflow
only ships new versions; these texts change only when edited here.

Placeholder still to fill: the support URL marked *(placeholder)*.

## Common

| Field | Value |
|---|---|
| Name | `ContApp SPV` |
| Category | Productivity (if a subcategory is asked, pick the closest workflow/tools one) |
| Language | Romanian |
| Homepage | `https://contapp.ro` |
| Support URL | `https://contapp.ro` *(placeholder — replace with the help/contact page when there is one)* |
| Support e-mail | `suport@contapp.ro` |
| Privacy policy URL | `https://kronos-it-support-consulting.github.io/contapp-spv-extension/PRIVACY` |
| Visibility | Chrome: *Unlisted* · Edge: *Hidden* · Firefox: unlisted / self-distributed |

### Short description

Chrome shows the manifest `description` as the summary (limit 132 characters), so the Romanian text is exactly the
one in `manifest.json`. Change both together. Chrome only offers a listing in the locales present in a `_locales/`
directory, and the extension ships none, so on the Chrome Web Store the EN texts below cannot be entered; they are for
Edge Partner Center (which has its own per-language fields) and for AMO if a listing is ever created.

RO (92 characters):

```
Permite ContApp să citească mesajele din SPV ANAF folosind certificatul digital din browser.
```

EN (90 characters):

```
Lets ContApp read ANAF SPV messages using the digital certificate already in your browser.
```

### Detailed description — RO

```
ContApp SPV conectează aplicația ContApp la Spațiul Privat Virtual (SPV) al ANAF folosind certificatul digital calificat pe care îl aveți deja în browser (token USB sau certificat în cloud).

Ce face
• Citește lista mesajelor din SPV, ca să le vedeți în ContApp la firma potrivită.
• Descarcă documentele PDF din mesaje; ContApp le păstrează apoi în contul dumneavoastră.
• Trimite către ANAF cererile de documente completate în ContApp; răspunsul apare ulterior ca mesaj nou.

Serviciul SPV al ANAF răspunde numai după autentificarea cu certificat, iar o pagină web nu poate citi singură răspunsul. Extensia face legătura: pagina ContApp îi cere o adresă din serviciul SPV, browserul face autentificarea cu certificatul, iar extensia predă răspunsul ANAF, neschimbat, paginii ContApp.

Pentru cine este
Pentru clienții ContApp (firme și contabili) care au un certificat digital cu acces la SPV. Aveți nevoie de un cont ContApp și de certificat pe calculatorul respectiv, cu programul tokenului sau al semnăturii în cloud instalat. Fără un cont ContApp, extensia nu are nicio utilitate.

Ce nu face
• Nu vede PIN-ul și nu are acces la cheia privată: PIN-ul este cerut de programul tokenului sau de sistemul de operare.
• Nu stochează nimic și nu are pagină de setări.
• Nu face nimic din proprie inițiativă: nu verifică singură SPV și acționează doar când o pagină ContApp îi cere.
• Nu accesează alte site-uri decât serviciul SPV al ANAF și paginile ContApp.
• Nu folosește analiză de trafic, reclame sau cod încărcat de pe internet.

Instalare și dezinstalare
Instalați extensia din ContApp: pagina Certificat SPV afișează mesajul „Instalează extensia ContApp SPV” cu legătura de instalare. După instalare reîncărcați pagina ContApp. Pentru dezinstalare: pagina de extensii a browserului → ContApp SPV → Eliminați. Mesajele și documentele deja sincronizate rămân în ContApp.

Suport: suport@contapp.ro
```

### Detailed description — EN

```
ContApp SPV connects the ContApp application to ANAF's Virtual Private Space (SPV), the Romanian tax authority's online inbox, using the qualified digital certificate you already have in your browser (USB token or cloud certificate).

What it does
• Reads the SPV message list, so you see the messages in ContApp under the right company.
• Downloads the PDF documents attached to messages; ContApp then keeps them in your account.
• Sends to ANAF the document requests you fill in on ContApp; the answer later arrives as a new message.

ANAF's SPV service only answers after certificate authentication, and a web page cannot read the answer by itself. The extension bridges the gap: the ContApp page asks it for an SPV address, the browser performs the certificate authentication, and the extension hands ANAF's response, unchanged, back to the ContApp page.

Who it is for
ContApp customers (businesses and accountants) who hold a digital certificate with SPV access. You need a ContApp account and the certificate on that computer, with the token or cloud-signature software installed. Without a ContApp account the extension does nothing useful.

What it does not do
• It never sees the PIN and has no access to the private key: the PIN is asked by the token software or the operating system.
• It stores nothing and has no settings page.
• It does nothing on its own initiative: it does not check SPV on its own and only acts when a ContApp page asks.
• It does not access any site other than ANAF's SPV service and ContApp pages.
• It uses no analytics, no advertising and no code loaded from the internet.

Install and uninstall
Install the extension from ContApp: the SPV certificate page shows the "Instalează extensia ContApp SPV" callout with the install link. Reload the ContApp page after installing. To uninstall: the browser's extensions page → ContApp SPV → Remove. Messages and documents already synced stay in ContApp.

Support: suport@contapp.ro
```

## Chrome Web Store → Privacy tab

### Single purpose

RO:

```
Extensia are un singur scop: permite aplicației ContApp să citească serviciul SPV al ANAF (https://webserviced.anaf.ro/SPVWS2/rest/) folosind certificatul digital calificat al utilizatorului. O pagină ContApp deschisă de utilizator îi cere o adresă SPV (lista mesajelor, descărcarea unui mesaj, o cerere de document); extensia face cererea, browserul realizează autentificarea TLS reciprocă (mutual TLS) cu certificatul, iar extensia întoarce răspunsul ANAF, neschimbat, paginii ContApp. Extensia refuză orice altă adresă, nu stochează date și acționează numai la cererea paginii ContApp.
```

EN:

```
The extension has a single purpose: it lets the ContApp application read ANAF's SPV web service (https://webserviced.anaf.ro/SPVWS2/rest/) using the user's qualified digital certificate. A ContApp page the user opened asks it for an SPV address (message list, message download, document request); the extension makes the request, the browser performs the mutual-TLS handshake with the certificate, and the extension returns ANAF's response, unchanged, to the ContApp page. It refuses any other address, stores no data and only acts when the ContApp page asks.
```

### Permission justifications

The manifest declares no API permission. Opening the ANAF login tab (`chrome.tabs.create`) needs none; if a form
asks why the extension opens tabs:

```
When the user clicks "Autentificare ANAF" in ContApp, the extension opens the ANAF SPV address in a new tab (chrome.tabs.create, which needs no permission). A request made by the service worker cannot show the browser's client-certificate picker or the token's PIN prompt; a visible tab can. After the user picks the certificate in that tab, the browser can reuse it for the extension's requests. The extension does not query or read any tab.
```

Host permission `https://webserviced.anaf.ro/*`:

```
ANAF's SPV web service only answers over mutual TLS and sends no CORS headers, so a web page cannot read its responses. The service worker fetches the SPV URL the ContApp page asked for, with credentials included, so the browser performs the client-certificate handshake. The code accepts only URLs starting with https://webserviced.anaf.ro/SPVWS2/rest/ and rejects everything else.
```

Content script on `https://*.contapp.ro/*`:

```
The content script is the bridge between the ContApp page and the service worker: it receives the page's requests through window.postMessage (same origin only), forwards them to the service worker and posts the answer back. It also marks the page (data-spv-extension attribute) so ContApp knows the extension is installed. It runs only on ContApp domains.
```

Remote code: **No, I am not using remote code.**

```
All code ships in the package (background.js, content.js); nothing is downloaded or evaluated at runtime.
```

### Data usage

Categories collected: tick **Personally identifiable information** and **Financial and payment information**; leave
Health information, Authentication information, Personal communications, Location, Web history, User activity and
Website content unticked.

Reasoning: Chrome counts transmitting and sharing as handling user data and requires the disclosure to match the
privacy policy, which lists the certificate holder's CNP, CUIs and tax documents. The extension stores nothing and
sends nothing to its publisher directly, but it relays ANAF's response to the ContApp page the user opened, and that
page sends it to ContApp's server under the user's own account. The certificate, PIN and ANAF cookies are never read,
so *Authentication information* stays unticked. The Firefox build declares the same two categories in
`data_collection_permissions` (see `build.sh`).

Certifications, all three ticked:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

Privacy policy URL: `https://kronos-it-support-consulting.github.io/contapp-spv-extension/PRIVACY`

### Notes for the reviewer

```
ContApp SPV is a companion extension for ContApp (https://contapp.ro), an online accounting application for Romanian businesses and accountants. It is distributed unlisted and installed from inside the ContApp app.

Testing it end to end needs two things a reviewer normally does not have: a ContApp account and a Romanian qualified digital certificate with access to ANAF's SPV (Spațiul Privat Virtual) on a USB token or cloud HSM. The flow is:
1. In ContApp, the SPV certificate page detects the extension (the content script sets <html data-spv-extension="<version>">).
2. ContApp asks the extension, via window.postMessage, to fetch https://webserviced.anaf.ro/SPVWS2/rest/listaMesaje?zile=60. The service worker fetches it with credentials; the first time, the request fails because no certificate has been chosen yet.
3. The user clicks "Autentificare ANAF"; the extension opens that ANAF URL in a new tab (chrome.tabs.create, no extra permission), the browser shows the certificate picker and the token asks for its PIN.
4. Back in ContApp, the same fetch now succeeds; the extension returns the JSON (or, for descarcare?id=..., the PDF bytes) to the ContApp page.

Without a certificate you can still check: on any https://*.contapp.ro page, the extension answers a {channel:"contapp-spv", type:"ping"} message with its version, rejects any URL outside https://webserviced.anaf.ro/SPVWS2/rest/ with "forbidden_url", and a fetch of an SPV URL returns "certificate_required". The source is two short files, background.js and content.js.

We can send a screencast of the full flow with a real certificate on request: suport@contapp.ro.
```

## Edge Add-ons (Partner Center)

Same package as Chrome (`contapp-spv-chrome-<version>.zip`). Fields Partner Center asks for:

| Section | Field | Value |
|---|---|---|
| Availability | Visibility | **Hidden** (install only by direct link) |
| Availability | Markets | All markets (Romania is the only one that matters) |
| Properties | Category | Productivity |
| Properties | Privacy policy required | Yes → `https://kronos-it-support-consulting.github.io/contapp-spv-extension/PRIVACY` |
| Properties | Website URL | `https://contapp.ro` |
| Properties | Support contact | `suport@contapp.ro` (or the support URL above) |
| Properties | Mature content | No |
| Store listing (Romanian; add English as a second language) | Description | Detailed description above (Edge requires at least 250 characters) |
| Store listing | Short description | Read-only: Edge takes it from the manifest `description` |
| Store listing | Extension logo | `store/icon-512.png` (Edge asks for 1:1, 128×128 minimum; 300×300 recommended) |
| Store listing | Screenshots | `store/screenshots/*.png`, 1280×800 |
| Store listing | Small / large promotional tile, YouTube video | Leave empty |
| Store listing | Search terms | `contapp`, `SPV`, `ANAF`, `certificat digital`, `declarații`, `contabilitate` |
| Submission | Notes for certification | Same text as *Notes for the reviewer* above |

## Firefox (AMO)

Nothing to fill: the first `web-ext sign` run in the release workflow creates the add-on (`spv@contapp.ro`) as
unlisted / self-distributed, with no listing page.

If AMO asks for review notes or source code:

```
ContApp SPV is a companion extension for ContApp (https://contapp.ro), a Romanian online accounting application. It relays requests from ContApp pages to ANAF's SPV web service (https://webserviced.anaf.ro/SPVWS2/rest/) so the browser can authenticate with the user's client certificate, and returns the raw response to the ContApp page. It stores nothing itself; because the relayed SPV responses carry the certificate holder's CNP, CUIs and tax documents, which the ContApp page then stores in the user's account, the manifest declares data_collection_permissions.required = [personallyIdentifyingInfo, financialAndPaymentInfo] (Firefox 140+ shows this in the install prompt).

Source: https://github.com/Kronos-IT-Support-Consulting/contapp-spv-extension (public). There is no transpilation, bundling or minification: build.sh copies background.js, content.js and the PNG icons into dist/firefox and uses jq to rewrite manifest.json (background.scripts instead of background.service_worker, plus the data_collection_permissions declaration). To reproduce: ./build.sh (requires jq and zip).

Testing end to end needs a ContApp account and a Romanian qualified certificate with SPV access; a screencast is available on request at suport@contapp.ro.
```

## Assets checklist

- [x] Icon 128×128: `icons/icon-128.png`
- [x] Screenshots 1280×800 in `store/screenshots/`:

  | File | Caption (RO) |
  |---|---|
  | `01-mesaje-spv.png` | Mesajele SPV ale firmei, listate în ContApp. |
  | `02-sincronizare.png` | Sincronizarea mesajelor SPV dintr-un singur clic. |
  | `03-cerere-noua.png` | Cerere nouă de document către ANAF, trimisă din ContApp. |
  | `04-certificat.png` | Certificatul SPV verificat: CNP titular și CUI-urile la care are acces. |
  | `05-autentificare-anaf.png` | Autentificarea la ANAF: browserul cere certificatul, iar tokenul cere PIN-ul. |
  | `06-instalare.png` | Instalarea extensiei din ContApp. |

- [ ] Small promo tile 440×280 (optional, not made)
