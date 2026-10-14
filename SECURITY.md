# Security policy

## Supported versions

Only the latest release on the Chrome Web Store / Edge Add-ons / the GitHub Releases page receives fixes.
Browsers update installed copies automatically within hours of a store release.

## Reporting a vulnerability

E-mail **suport@contapp.ro** with the subject `[contapp SPV extension] security`. Include the browser and
extension version (`chrome://extensions`), what you did, what happened and, if you have one, a proof of concept.
Please do not open a public issue for security problems.

You get an acknowledgement within 2 working days and a fix or a status update within 14 days. Credit is given
in `CHANGELOG.md` unless you prefer otherwise.

## Scope

The extension only forwards requests from contapp pages to `https://webserviced.anaf.ro/SPVWS2/rest/*` and
returns the raw response. Reports about the contapp application itself go to the same address; reports about
ANAF's service go to ANAF.
