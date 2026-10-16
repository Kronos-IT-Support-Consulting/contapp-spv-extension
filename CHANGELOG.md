# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- URLs are parsed and normalised before the SPV prefix check, so `…/SPVWS2/rest/../x` no longer reaches another
  path on the ANAF host; the request and the login tab use the normalised URL.
- The `tabs` permission is gone: opening the login tab never needed it, and it made Chrome warn about reading
  browsing history.
- Release workflow: store secrets are scoped to the step that uses them, the Chrome Web Store uploader is a pinned
  dev dependency instead of an unpinned `npx` download, and a pushed `v*` tag is only released when its commit is
  on `main`.

### Changed

- A fetch gives up after 90 s and answers `timeout`. A handshake stuck on a certificate picker or PIN prompt that
  never showed used to hang forever and hold one of the browser's connections to ANAF, so after a few retries
  every request, the login tab included, queued behind them until the browser restarted.
- `login` deletes the browser's `webserviced.anaf.ro` cookies before it opens the tab, so a session ANAF's gateway
  marked as failed no longer sends every new login to its error page. This adds the `cookies` permission.
- The Firefox build declares `data_collection_permissions` as personally identifying and financial information
  (the relayed SPV responses), which Firefox 140+ shows in the install prompt; Firefox 140 and Chrome 110 are the
  minimum versions.
- A fetch now answers `network` (with a message) instead of `certificate_required` when the ANAF host permission
  has been revoked, and when the response is too large to hand to the page (above 47 MiB).
- The service worker keeps itself alive while an SPV response is pending, so a slow download no longer dies with
  Chrome's idle timeout.
- Release workflow: one release at a time; a re-run after a partial failure reuses the version and refreshes the
  assets instead of bumping again; every configured store is attempted even when another one fails; the Edge
  Add-ons step reports API errors instead of waiting them out.
- Store zips contain only the PNG icons the manifest references.
- Privacy policy and store texts: cookies, background behaviour, data categories and the processor's legal entity
  are stated as they are; rights and the ANSPDCP address follow the official wording.

### Fixed

- The login's cookie reset can see and delete every ANAF session cookie in Chrome: the extension now has host
  access to `anaf.ro` (for cookies set on `.anaf.ro`) and over `http://` (for cookies without the Secure attribute),
  without which Chrome leaves those cookies out of `cookies.getAll`. It still only requests
  `https://webserviced.anaf.ro/SPVWS2/rest/`.
- A login on a lost session also cancels the fetches queued behind the stuck ones, and fetches sent while the
  cookies are being cleared wait for it, so none goes out with the dead session.
- A reply the content script cannot decode now answers `extension` instead of leaving the page waiting forever.
- Sandboxed (opaque-origin) ContApp documents get no bridge instead of a bridge whose replies throw.

## [1.1.0] — 2026-10-14

### Added

- Release workflow publishes to Edge Add-ons when its secrets are configured.
- MIT licence, security policy, contribution guide, code owners, Dependabot and a pull request template.
- Store listing texts, the 512 px store icon and six 1280×800 screenshots in `store/`.
- CI checks that release manifests carry only production hosts.

### Changed

- Release: Actions → Release → Run workflow bumps the version from the latest tag and releases `main`; the tag is the only version source.
- Name and texts spell the brand ContApp.
- Icons use the ContApp mark in brand green with an "SPV" badge (toolbar size: the mark alone); sources in `icons/icon.svg` and `icons/icon-small.svg`, store icon in `store/icon-512.png`.
- Privacy policy follows GDPR Art. 13 (controller details, DPO, purposes and legal bases, recipients, transfers, retention, rights, ANSPDCP) and is published from `PRIVACY.md` by GitHub Pages.
- Release builds only match `https://*.contapp.ro/*`.
- `shell-quote` (a dev-only dependency of `web-ext`) is overridden to a patched version.

## [1.0.0] — 2026-10-13

First standalone release, moved out of the ContApp application repository.

### Added

- `ping` answers the extension version; the version is also exposed as `<html data-spv-extension>` on
  ContApp pages.
- `fetch` proxies a GET to ANAF SPV with the browser's client certificate and returns status, final URL and
  the body as an ArrayBuffer; a missing certificate is reported as `certificate_required`.
- `login` opens the SPV URL in a new tab so the browser can show the certificate picker and PIN prompt.
- Only URLs under `https://webserviced.anaf.ro/SPVWS2/rest/` are accepted; everything else answers
  `forbidden_url`.
- Chrome/Edge and Firefox builds, zipped by `build.sh` and attached to each GitHub release.

[Unreleased]: https://github.com/Kronos-IT-Support-Consulting/contapp-spv-extension/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/Kronos-IT-Support-Consulting/contapp-spv-extension/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Kronos-IT-Support-Consulting/contapp-spv-extension/releases/tag/v1.0.0
