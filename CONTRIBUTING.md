# Contributing

Issues and pull requests are welcome. Keep in mind that this extension is one half of a protocol: the other
half is `spv-bridge.js` in the contapp application, and installed copies update hours after a store release.

## Rules of the road

- Open an issue first for anything beyond a small fix, so the protocol impact can be discussed.
- Keep the page-facing protocol (see README → Protocol) backward compatible. A breaking change needs the
  contapp side to support both shapes for at least one release.
- No new permissions, hosts or dependencies without a stated reason in the PR; every store reviewer reads them.
- `main` only takes pull requests; CI must be green.

## Working locally

```sh
npm install
npm test          # node:test suites in test/
./build.sh        # dist/chrome, dist/firefox and the zips
npm run lint      # web-ext lint on dist/firefox
```

Load the repository folder unpacked in Chrome (it matches the local contapp host too), `dist/firefox` in
Firefox. Add or update a test in `test/` for every behaviour change.

## Releasing

Maintainers only. Bump `version` in `manifest.json` and `package.json` (`npm install` syncs the lockfile), add a
`CHANGELOG.md` entry, merge, then tag `vX.Y.Z` on `main` and push the tag. The release workflow does the rest
(README → Release process).
