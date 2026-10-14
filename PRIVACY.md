# Politica de confidențialitate — extensia contapp SPV

Data intrării în vigoare: 2026-10-14 · [English version below](#privacy-policy--contapp-spv-extension)

### 1. Cine suntem

Extensia de browser **contapp SPV** este publicată de **Kronos IT Support & Consulting S.R.L.**, România, firma care
operează [contapp](https://contapp.ro), aplicație online de contabilitate pentru firme mici și contabili.

[date firmă]

Contact: [suport@contapp.ro](mailto:suport@contapp.ro)

### 2. Ce face extensia

Extensia permite aplicației contapp să citească mesajele din Spațiul Privat Virtual (SPV) al ANAF, să descarce
documentele din ele și să trimită cereri de documente, folosind certificatul digital calificat din browserul
dumneavoastră (token USB sau certificat în cloud).

Extensia acționează numai când o pagină contapp deschisă de dumneavoastră îi cere acest lucru:

- pagina contapp cere o adresă din serviciul ANAF `https://webserviced.anaf.ro/SPVWS2/rest/` (lista mesajelor,
  descărcarea unui mesaj, o cerere de document);
- extensia trimite cererea către ANAF, iar browserul și sistemul de operare fac autentificarea cu certificatul;
- extensia întoarce răspunsul ANAF (date JSON sau un fișier PDF), neschimbat, paginii contapp care l-a cerut.

Extensia refuză orice altă adresă. Nu rulează în fundal, nu verifică singură SPV și nu are pagină de setări.

### 3. Ce date prelucrează

- **Răspunsurile ANAF.** Lista mesajelor SPV și documentele descărcate pot conține date personale și fiscale (de
  exemplu CNP, CUI, nume, conținutul declarațiilor). Extensia le ține doar în memoria browserului cât durează
  transferul către pagina contapp și nu le salvează.
- **Certificatul și PIN-ul.** Alegerea certificatului și introducerea PIN-ului sunt gestionate de browser, de
  sistemul de operare și de programul tokenului sau al semnăturii în cloud. Extensia nu vede PIN-ul și nu are acces
  la cheia privată.
- **Sesiunea ANAF.** După autentificare, browserul păstrează cookie-ul de sesiune ANAF, ca la orice site. Extensia nu
  citește și nu salvează cookie-uri.

Extensia nu stochează nimic: nu are permisiunea de stocare și nu păstrează mesaje, documente, cookie-uri sau setări.

### 4. Unde ajung datele

- **ANAF.** Cererile pleacă direct din browserul dumneavoastră către serverul SPV al ANAF.
- **contapp.** Pagina contapp care a primit răspunsul îl trimite serverelor contapp, în contul în care sunteți
  autentificat, ca să afișeze și să păstreze mesajele și documentele. Această prelucrare este acoperită de politica
  de confidențialitate a contapp, publicată pe [contapp.ro](https://contapp.ro).
- **Nimeni altcineva.** Extensia nu trimite date către alte servere, nu folosește servicii de analiză, telemetrie sau
  reclame, nu încarcă cod de pe internet, nu vinde date și nu creează profiluri.

### 5. Permisiuni folosite

| Permisiune | De ce |
|---|---|
| `tabs` | Deschide o filă nouă pe adresa SPV a ANAF, ca browserul să poată afișa alegerea certificatului și cererea de PIN. Extensia nu citește filele deschise. |
| Acces la `https://webserviced.anaf.ro/*` | Citește răspunsurile serviciului SPV al ANAF, pe care paginile web nu le pot citi direct. Extensia acceptă doar adrese care încep cu `https://webserviced.anaf.ro/SPVWS2/rest/`. |
| Script de conținut pe `*.contapp.ro` (și `contapp.test`, adresă folosită doar la dezvoltare) | Primește cererile paginii contapp și îi întoarce răspunsurile. Nu rulează pe alte site-uri. |

### 6. Drepturile dumneavoastră

Conform Regulamentului (UE) 2016/679 (GDPR) aveți dreptul de acces, rectificare, ștergere, restricționare,
portabilitate și opoziție. Extensia nu păstrează date despre dumneavoastră, deci nu are ce să vă furnizeze sau să
șteargă. Pentru datele ajunse în contul contapp, scrieți la [suport@contapp.ro](mailto:suport@contapp.ro). Aveți și
dreptul să depuneți plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal
([dataprotection.ro](https://www.dataprotection.ro)).

### 7. Dezinstalare

- Chrome: `chrome://extensions` → contapp SPV → Eliminați.
- Edge: `edge://extensions` → contapp SPV → Eliminați.
- Firefox: `about:addons` → contapp SPV → Eliminați.

Dezinstalarea nu șterge nimic din contapp: mesajele și documentele sincronizate rămân în cont.

### 8. Modificări

Dacă politica se schimbă, publicăm versiunea nouă la aceeași adresă și actualizăm data de mai sus. Dacă o versiune
nouă a extensiei ar prelucra date în alt mod, actualizăm politica înainte de publicarea acelei versiuni.

### 9. Contact

Întrebări despre această politică: [suport@contapp.ro](mailto:suport@contapp.ro)

## Privacy policy — contapp SPV extension

Effective date: 2026-10-14

### 1. Who we are

The **contapp SPV** browser extension is published by **Kronos IT Support & Consulting S.R.L.**, Romania, the company
that operates [contapp](https://contapp.ro), an online accounting application for small businesses and accountants.

[date firmă]

Contact: [suport@contapp.ro](mailto:suport@contapp.ro)

### 2. What the extension does

The extension lets the contapp application read messages from ANAF's Virtual Private Space (SPV), download the
documents in them and send document requests, using the qualified digital certificate in your browser (USB token or
cloud certificate).

It only acts when a contapp page you opened asks it to:

- the contapp page asks for an address under ANAF's `https://webserviced.anaf.ro/SPVWS2/rest/` service (message
  list, message download, document request);
- the extension sends the request to ANAF, and the browser and operating system perform the certificate
  authentication;
- the extension returns ANAF's response (JSON data or a PDF file), unchanged, to the contapp page that asked for it.

The extension refuses any other address. It does not run in the background, does not check SPV on its own and has no
settings page.

### 3. What data it processes

- **ANAF's responses.** The SPV message list and downloaded documents can contain personal and tax data (for example
  personal identification numbers, company tax IDs, names, the content of tax returns). The extension keeps them only
  in browser memory while handing them to the contapp page, and does not save them.
- **Certificate and PIN.** Choosing the certificate and entering the PIN are handled by the browser, the operating
  system and the token or cloud-signature software. The extension never sees the PIN and has no access to the
  private key.
- **ANAF session.** After authentication the browser keeps ANAF's session cookie, as it does for any website. The
  extension does not read or save cookies.

The extension stores nothing: it has no storage permission and keeps no messages, documents, cookies or settings.

### 4. Where the data goes

- **ANAF.** Requests go directly from your browser to ANAF's SPV server.
- **contapp.** The contapp page that received the response sends it to contapp's servers, under the account you are
  signed in to, so the messages and documents can be shown and kept. That processing is covered by contapp's privacy
  policy, published on [contapp.ro](https://contapp.ro).
- **Nobody else.** The extension sends no data to any other server, uses no analytics, telemetry or advertising,
  loads no code from the internet, does not sell data and does not build profiles.

### 5. Permissions

| Permission | Why |
|---|---|
| `tabs` | Opens a new tab on ANAF's SPV address so the browser can show the certificate picker and the PIN prompt. The extension does not read open tabs. |
| Host access to `https://webserviced.anaf.ro/*` | Reads responses from ANAF's SPV service, which web pages cannot read directly. The extension only accepts addresses starting with `https://webserviced.anaf.ro/SPVWS2/rest/`. |
| Content script on `*.contapp.ro` (and `contapp.test`, a development-only address) | Receives the contapp page's requests and returns the answers. It does not run on any other site. |

### 6. Your rights

Under Regulation (EU) 2016/679 (GDPR) you have the right of access, rectification, erasure, restriction, portability
and objection. The extension keeps no data about you, so it has nothing to provide or erase. For data that reached
your contapp account, write to [suport@contapp.ro](mailto:suport@contapp.ro). You can also lodge a complaint with the
Romanian data protection authority, ANSPDCP ([dataprotection.ro](https://www.dataprotection.ro)).

### 7. Uninstalling

- Chrome: `chrome://extensions` → contapp SPV → Remove.
- Edge: `edge://extensions` → contapp SPV → Remove.
- Firefox: `about:addons` → contapp SPV → Remove.

Uninstalling deletes nothing in contapp: synced messages and documents stay in your account.

### 8. Changes

If this policy changes, we publish the new version at the same address and update the date above. If a new version of
the extension would process data differently, we update this policy before that version is published.

### 9. Contact

Questions about this policy: [suport@contapp.ro](mailto:suport@contapp.ro)
