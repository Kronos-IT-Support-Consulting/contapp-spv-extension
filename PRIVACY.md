# Politica de confidențialitate — extensia contapp SPV

Ultima actualizare: 2026-10-13

## Română

Extensia **contapp SPV** permite aplicației contapp să citească mesajele din Spațiul Privat Virtual (SPV)
al ANAF folosind certificatul digital deja disponibil în browserul dumneavoastră.

**Ce face extensia**

- Contactează exclusiv serviciul ANAF `https://webserviced.anaf.ro/SPVWS2/rest/` și numai la cererea unei
  pagini contapp deschise de dumneavoastră.
- Transmite răspunsul primit de la ANAF doar paginii contapp care l-a cerut.

**Ce nu face extensia**

- Nu stochează date: nu păstrează mesaje, documente, cookie-uri sau setări proprii.
- Nu trimite date către alte servere, nici către dezvoltator.
- Nu folosește analiză de trafic, telemetrie sau reclame.
- Nu accesează niciodată cheia privată a certificatului și nu vede PIN-ul. Autentificarea cu certificat
  (TLS mutual) este realizată de browser și de sistemul de operare (token USB, HSM în cloud, keychain).

**Permisiuni folosite**

| Permisiune | De ce |
|---|---|
| `tabs` | Deschide o filă nouă pe adresa ANAF, ca browserul să poată afișa alegerea certificatului și cererea de PIN. |
| Acces la `https://webserviced.anaf.ro/*` | Citește răspunsurile serviciului SPV ANAF, care nu permite acces direct din pagini web. |
| Script de conținut pe `*.contapp.ro` (și `contapp.test` pentru dezvoltare) | Primește cererile paginii contapp și îi întoarce răspunsurile. Nu rulează pe alte site-uri. |

**Contact**

<!-- DE COMPLETAT de proprietar înainte de publicare -->
Întrebări despre această politică: **[adresa de contact]**

## English

The **contapp SPV** extension lets the contapp application read messages from ANAF's Virtual Private Space
(SPV) using the digital certificate already available in your browser.

**What the extension does**

- It only contacts ANAF's `https://webserviced.anaf.ro/SPVWS2/rest/` service, and only when a contapp page
  you opened asks it to.
- It relays ANAF's response only to the contapp page that asked for it.

**What the extension does not do**

- It stores no data: no messages, documents, cookies or settings of its own.
- It sends nothing to any other server, including the developer.
- It has no analytics, telemetry or advertising.
- It never accesses the certificate's private key and never sees the PIN. The certificate (mutual TLS)
  handshake is performed by the browser and the operating system (USB token, cloud HSM, keychain).

**Permissions**

| Permission | Why |
|---|---|
| `tabs` | Opens a new tab on the ANAF address so the browser can show the certificate picker and PIN prompt. |
| Host access to `https://webserviced.anaf.ro/*` | Reads responses from ANAF's SPV service, which web pages cannot read directly. |
| Content script on `*.contapp.ro` (and `contapp.test` for development) | Receives the contapp page's requests and returns the answers. It does not run on any other site. |

**Contact**: see the contact line in the Romanian section above.
