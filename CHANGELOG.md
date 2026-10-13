# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] — 2026-10-13

First standalone release, moved out of the contapp application repository.

### Added

- `ping` answers the extension version; the version is also exposed as `<html data-spv-extension>` on
  contapp pages.
- `fetch` proxies a GET to ANAF SPV with the browser's client certificate and returns status, final URL and
  the body as an ArrayBuffer; a missing certificate is reported as `certificate_required`.
- `login` opens the SPV URL in a new tab so the browser can show the certificate picker and PIN prompt.
- Only URLs under `https://webserviced.anaf.ro/SPVWS2/rest/` are accepted; everything else answers
  `forbidden_url`.
- Chrome/Edge and Firefox builds, zipped by `build.sh` and attached to each GitHub release.

[Unreleased]: https://github.com/Kronos-IT-Support-Consulting/contapp-spv-extension/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Kronos-IT-Support-Consulting/contapp-spv-extension/releases/tag/v1.0.0
