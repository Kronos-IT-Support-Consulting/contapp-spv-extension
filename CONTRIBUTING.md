# Contributing

Issues and pull requests are welcome. Keep in mind that this extension is one half of a protocol: the other
half is `spv-bridge.js` in the ContApp application, and installed copies update hours after a store release.

## Rules of the road

- Open an issue first for anything beyond a small fix, so the protocol impact can be discussed.
- Keep the page-facing protocol (see README → Protocol) backward compatible. A breaking change needs the
  ContApp side to support both shapes for at least one release.
- No new permissions, hosts or dependencies without a stated reason in the PR; every store reviewer reads them.
- `main` only takes pull requests; CI must be green.

## Working locally

```sh
npm install
npm test          # node:test suites in test/
./build.sh        # dist/chrome, dist/firefox and the zips
npm run lint      # web-ext lint on dist/firefox
```

Load the repository folder unpacked in Chrome (it matches the local ContApp host too), `dist/firefox` in
Firefox. Add or update a test in `test/` for every behaviour change.

## Releasing

Maintainers only: Actions → **Release** → **Run workflow** on `main` with the bump you want (`patch` by default).
The tag is the version; nothing needs bumping by hand (README → Release process).
