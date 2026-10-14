# Politica de confidențialitate — extensia ContApp SPV

Data intrării în vigoare: 14.10.2026 · Ultima actualizare: 14.10.2026 · [English version below](#privacy-policy--contapp-spv-extension)

Această politică explică ce date prelucrează extensia de browser **ContApp SPV**, de ce, pe ce temei și ce drepturi
aveți, conform art. 13 din Regulamentul (UE) 2016/679 (GDPR). Ea completează
[Politica de confidențialitate ContApp](https://contapp.ro/politica-de-confidentialitate/),
[Termenii și condițiile](https://contapp.ro/termeni-si-conditii/) și
[Politica de utilizare cookies](https://contapp.ro/politica-utilizare-cookies/).

## 1. Cine suntem

Extensia este publicată de **Kronos IT Support & Consulting SRL**, operatorul platformei [ContApp](https://contapp.ro):

- sediul social: Loc. Tifești, Județul Vrancea, Str. Secundară 58, nr. 24, cod 627375, România;
- Registrul Comerțului: J39/10237/2006, CUI 18256126;
- e-mail: [contact@contapp.ro](mailto:contact@contapp.ro), telefon: +40 791 512 012;
- responsabil cu protecția datelor (DPO): [dpo@contapp.ro](mailto:dpo@contapp.ro).

## 2. Ce face extensia

Extensia permite aplicației ContApp să citească mesajele din Spațiul Privat Virtual (SPV) al ANAF, să descarce
documentele din ele și să trimită cereri de documente, folosind certificatul digital calificat din browserul
dumneavoastră (token USB sau certificat în cloud). Acest lucru este necesar pentru că serviciul SPV al ANAF acceptă
numai conexiuni autentificate cu certificat, iar o pagină web nu poate citi singură răspunsul.

Extensia acționează numai când o pagină ContApp deschisă de dumneavoastră îi cere:

1. pagina ContApp cere o adresă din serviciul ANAF `https://webserviced.anaf.ro/SPVWS2/rest/` (lista mesajelor,
   descărcarea unui mesaj, o cerere de document);
2. extensia trimite cererea către ANAF, iar browserul și sistemul de operare fac autentificarea cu certificatul;
3. extensia întoarce răspunsul ANAF (date JSON sau un fișier PDF), neschimbat, paginii ContApp care l-a cerut.

Extensia refuză orice altă adresă. Nu rulează în fundal, nu verifică singură SPV, nu are pagină de setări și nu ia
decizii automate.

## 3. Ce date prelucrează, în ce scop și pe ce temei

| Date | Scop | Temei legal |
|---|---|---|
| Răspunsurile SPV: lista mesajelor (id, tip, dată, CIF, detalii, CNP-ul titularului certificatului, CUI-urile la care are acces) și documentele descărcate, care pot conține date personale și fiscale | Afișarea și păstrarea mesajelor și documentelor SPV în contul dumneavoastră ContApp, la cererea dumneavoastră | Executarea contractului de utilizare a platformei ContApp (art. 6 alin. (1) lit. b) GDPR) |
| Parametrii cererilor de documente (tip, CUI, an, lună, motiv) | Transmiterea către ANAF a cererii completate în ContApp | Executarea contractului (art. 6 alin. (1) lit. b) GDPR) |

**Ce nu prelucrează extensia:**

- **Certificatul și PIN-ul.** Alegerea certificatului și introducerea PIN-ului sunt gestionate de browser, de
  sistemul de operare și de programul tokenului sau al semnăturii în cloud. Extensia nu vede PIN-ul și nu are acces
  la cheia privată.
- **Cookie-uri.** Extensia nu setează, nu citește și nu salvează cookie-uri. După autentificare, browserul
  păstrează cookie-ul de sesiune setat de ANAF, ca la orice site.
- **Istoric de navigare, conținutul altor site-uri, date de utilizare.** Extensia nu le accesează.

Pentru datele contului dumneavoastră ContApp, Kronos IT Support & Consulting SRL este operator. Pentru datele din
documentele SPV ale firmelor pe care le administrați, ContApp acționează ca persoană împuternicită, în numele
dumneavoastră, conform capitolului XXII din [Termeni și condiții](https://contapp.ro/termeni-si-conditii/).

Folosirea extensiei este opțională. Fără ea, sincronizarea mesajelor SPV prin certificatul din browser nu este
disponibilă, dar restul platformei ContApp funcționează.

## 4. Destinatari

- **ANAF.** Cererile pleacă direct din browserul dumneavoastră către serverul SPV al ANAF, ca atunci când intrați în
  SPV din browser.
- **ContApp.** Pagina ContApp care primește răspunsul îl trimite serverelor ContApp, în contul în care sunteți
  autentificat. De acolo datele sunt prelucrate de Kronos IT Support & Consulting SRL și de furnizorii săi
  (persoane împuternicite) enumerați în
  [Politica de confidențialitate ContApp](https://contapp.ro/politica-de-confidentialitate/), secțiunea
  „Cu cine partajăm datele?”.
- **Nimeni altcineva.** Extensia nu trimite date către alte servere, nu folosește servicii de analiză, telemetrie
  sau reclame, nu încarcă cod de pe internet, nu vinde date și nu creează profiluri.

Folosirea informațiilor primite prin extensie respectă
[Politica privind datele utilizatorilor din Chrome Web Store](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq),
inclusiv cerințele de utilizare limitată (Limited Use).

## 5. Transferuri în afara Spațiului Economic European

Extensia nu transferă date în afara SEE: ea comunică numai cu ANAF și cu pagina ContApp din browserul dumneavoastră.
Eventualele transferuri făcute de furnizorii ContApp și garanțiile aplicate (decizii de adecvare, clauze
contractuale standard) sunt descrise în
[Politica de confidențialitate ContApp](https://contapp.ro/politica-de-confidentialitate/), secțiunea
„Transferuri internaționale”.

## 6. Cât timp păstrăm datele

- **Extensia:** nu păstrează nimic. Răspunsurile ANAF stau în memoria browserului doar cât durează transferul către
  pagina ContApp. Extensia nu are permisiunea de stocare.
- **ContApp:** mesajele și documentele sincronizate rămân în contul dumneavoastră până le ștergeți sau până la
  închiderea contului, apoi conform perioadelor din
  [Politica de confidențialitate ContApp](https://contapp.ro/politica-de-confidentialitate/), secțiunea
  „Perioada de stocare”, sau celor impuse de lege.

## 7. Securitate

Toate conexiunile folosesc HTTPS. Conexiunea cu ANAF este autentificată cu certificatul dumneavoastră calificat.
Extensia acceptă cereri numai de la paginile ContApp și numai pentru adrese din serviciul SPV al ANAF. Codul sursă
este public, la [github.com/Kronos-IT-Support-Consulting/contapp-spv-extension](https://github.com/Kronos-IT-Support-Consulting/contapp-spv-extension).

## 8. Permisiunile extensiei

| Permisiune | De ce |
|---|---|
| `tabs` | Deschide o filă nouă pe adresa SPV a ANAF, ca browserul să poată afișa alegerea certificatului și cererea de PIN. Extensia nu citește filele deschise. |
| Acces la `https://webserviced.anaf.ro/*` | Citește răspunsurile serviciului SPV al ANAF, pe care paginile web nu le pot citi direct. Extensia acceptă doar adrese care încep cu `https://webserviced.anaf.ro/SPVWS2/rest/`. |
| Script de conținut pe `https://*.contapp.ro/*` | Primește cererile paginii ContApp și îi întoarce răspunsurile. Nu rulează pe alte site-uri. |

## 9. Drepturile dumneavoastră

Conform GDPR aveți dreptul de acces (art. 15), de rectificare (art. 16), de ștergere (art. 17), de restricționare
a prelucrării (art. 18), la portabilitatea datelor (art. 20) și de opoziție (art. 21). Nu sunteți supus unor
decizii bazate exclusiv pe prelucrare automată (art. 22).

Extensia nu păstrează date despre dumneavoastră, deci cererile privesc datele ajunse în contul ContApp. Le puteți
trimite la [dpo@contapp.ro](mailto:dpo@contapp.ro) sau prin poștă la sediul de mai sus. Răspundem în cel mult o lună
de la primire (art. 12 alin. (3) GDPR).

Aveți dreptul să depuneți plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter
Personal (ANSPDCP), B-dul G-ral. Gheorghe Magheru nr. 28-30, sector 1, București,
[anspdcp@dataprotection.ro](mailto:anspdcp@dataprotection.ro), [dataprotection.ro](https://www.dataprotection.ro),
și să vă adresați instanței.

## 10. Dezinstalare

- Chrome: `chrome://extensions` → ContApp SPV → Eliminați.
- Edge: `edge://extensions` → ContApp SPV → Eliminați.
- Firefox: `about:addons` → ContApp SPV → Eliminați.

Dezinstalarea nu șterge nimic din ContApp: mesajele și documentele sincronizate rămân în cont. Pentru ștergerea lor,
vedeți secțiunea 9.

## 11. Modificări

Publicăm orice versiune nouă a acestei politici la aceeași adresă și actualizăm data de mai sus. Dacă o versiune
nouă a extensiei ar prelucra date în alt mod, actualizăm politica înainte de publicarea acelei versiuni.

---

# Privacy policy — ContApp SPV extension

Effective date: 14 October 2026 · Last updated: 14 October 2026

This policy explains what data the **ContApp SPV** browser extension processes, why, on what legal basis and what
rights you have, under Article 13 of Regulation (EU) 2016/679 (GDPR). It supplements the
[ContApp privacy policy](https://contapp.ro/politica-de-confidentialitate/), the
[terms and conditions](https://contapp.ro/termeni-si-conditii/) and the
[cookie policy](https://contapp.ro/politica-utilizare-cookies/) (all in Romanian).

## 1. Who we are

The extension is published by **Kronos IT Support & Consulting SRL**, the operator of [ContApp](https://contapp.ro):

- registered office: Loc. Tifești, Vrancea County, Str. Secundară 58, nr. 24, 627375, Romania;
- Trade Register no. J39/10237/2006, tax ID (CUI) 18256126;
- e-mail: [contact@contapp.ro](mailto:contact@contapp.ro), phone: +40 791 512 012;
- data protection officer (DPO): [dpo@contapp.ro](mailto:dpo@contapp.ro).

## 2. What the extension does

The extension lets the ContApp application read messages from ANAF's Virtual Private Space (SPV, the Romanian tax
authority's portal), download the documents in them and send document requests, using the qualified digital
certificate in your browser (USB token or cloud certificate). This is needed because ANAF's SPV service only accepts
certificate-authenticated connections, and a web page cannot read the response on its own.

It only acts when a ContApp page you opened asks it to:

1. the ContApp page asks for an address under ANAF's `https://webserviced.anaf.ro/SPVWS2/rest/` service (message
   list, message download, document request);
2. the extension sends the request to ANAF, and the browser and operating system perform the certificate
   authentication;
3. the extension returns ANAF's response (JSON data or a PDF file), unchanged, to the ContApp page that asked for it.

The extension refuses any other address. It does not run in the background, does not check SPV on its own, has no
settings page and makes no automated decisions.

## 3. What data it processes, for what purpose and on what legal basis

| Data | Purpose | Legal basis |
|---|---|---|
| SPV responses: the message list (id, type, date, tax ID, details, the certificate holder's personal identification number, the tax IDs it can access) and downloaded documents, which can contain personal and tax data | Showing and keeping your SPV messages and documents in your ContApp account, at your request | Performance of the ContApp platform contract (Art. 6(1)(b) GDPR) |
| Document request parameters (type, tax ID, year, month, reason) | Sending the request you filled in on ContApp to ANAF | Performance of the contract (Art. 6(1)(b) GDPR) |

**What the extension does not process:**

- **Certificate and PIN.** Choosing the certificate and entering the PIN are handled by the browser, the operating
  system and the token or cloud-signature software. The extension never sees the PIN and has no access to the
  private key.
- **Cookies.** The extension sets, reads and saves no cookies. After authentication the browser keeps the session
  cookie set by ANAF, as it does for any website.
- **Browsing history, other sites' content, usage data.** The extension does not access them.

For your ContApp account data, Kronos IT Support & Consulting SRL is the controller. For the data in the SPV
documents of the companies you manage, ContApp acts as a processor on your behalf, under chapter XXII of the
[terms and conditions](https://contapp.ro/termeni-si-conditii/).

Using the extension is optional. Without it, syncing SPV messages through the certificate in your browser is not
available, but the rest of the ContApp platform works.

## 4. Recipients

- **ANAF.** Requests go directly from your browser to ANAF's SPV server, as when you open SPV in your browser.
- **ContApp.** The ContApp page that receives the response sends it to ContApp's servers, under the account you are
  signed in to. From there the data is processed by Kronos IT Support & Consulting SRL and its processors listed in
  the [ContApp privacy policy](https://contapp.ro/politica-de-confidentialitate/), section "Cu cine partajăm datele?".
- **Nobody else.** The extension sends no data to any other server, uses no analytics, telemetry or advertising,
  loads no code from the internet, does not sell data and does not build profiles.

The use of information received through the extension adheres to the
[Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq),
including the Limited Use requirements.

## 5. Transfers outside the European Economic Area

The extension transfers no data outside the EEA: it only talks to ANAF and to the ContApp page in your browser. Any
transfers made by ContApp's providers, and the safeguards applied (adequacy decisions, standard contractual clauses),
are described in the [ContApp privacy policy](https://contapp.ro/politica-de-confidentialitate/), section
"Transferuri internaționale".

## 6. How long data is kept

- **The extension:** keeps nothing. ANAF's responses stay in browser memory only while being handed to the ContApp
  page. The extension has no storage permission.
- **ContApp:** synced messages and documents stay in your account until you delete them or close the account, then
  for the periods in the [ContApp privacy policy](https://contapp.ro/politica-de-confidentialitate/), section
  "Perioada de stocare", or those required by law.

## 7. Security

All connections use HTTPS. The connection to ANAF is authenticated with your qualified certificate. The extension
only accepts requests from ContApp pages and only for addresses in ANAF's SPV service. The source code is public at
[github.com/Kronos-IT-Support-Consulting/contapp-spv-extension](https://github.com/Kronos-IT-Support-Consulting/contapp-spv-extension).

## 8. Extension permissions

| Permission | Why |
|---|---|
| `tabs` | Opens a new tab on ANAF's SPV address so the browser can show the certificate picker and the PIN prompt. The extension does not read open tabs. |
| Host access to `https://webserviced.anaf.ro/*` | Reads responses from ANAF's SPV service, which web pages cannot read directly. The extension only accepts addresses starting with `https://webserviced.anaf.ro/SPVWS2/rest/`. |
| Content script on `https://*.contapp.ro/*` | Receives the ContApp page's requests and returns the answers. It does not run on any other site. |

## 9. Your rights

Under the GDPR you have the right of access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction of
processing (Art. 18), data portability (Art. 20) and objection (Art. 21). You are not subject to decisions based
solely on automated processing (Art. 22).

The extension keeps no data about you, so requests concern the data that reached your ContApp account. Send them to
[dpo@contapp.ro](mailto:dpo@contapp.ro) or by post to the registered office above. We answer within one month of
receipt (Art. 12(3) GDPR).

You have the right to lodge a complaint with the Romanian data protection authority, ANSPDCP, B-dul G-ral. Gheorghe
Magheru nr. 28-30, sector 1, Bucharest, [anspdcp@dataprotection.ro](mailto:anspdcp@dataprotection.ro),
[dataprotection.ro](https://www.dataprotection.ro), and to go to court.

## 10. Uninstalling

- Chrome: `chrome://extensions` → ContApp SPV → Remove.
- Edge: `edge://extensions` → ContApp SPV → Remove.
- Firefox: `about:addons` → ContApp SPV → Remove.

Uninstalling deletes nothing in ContApp: synced messages and documents stay in your account. To have them deleted,
see section 9.

## 11. Changes

We publish every new version of this policy at the same address and update the date above. If a new version of the
extension would process data differently, we update this policy before that version is published.
