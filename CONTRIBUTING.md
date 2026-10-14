# Contributing

Issues and pull requests are welcome. Keep in mind that this extension is one half of a protocol: the other
half is `spv-bridge.js` in the ContApp application, and installed copies update hours after a store release.

## Rules of the road

- Open an issue first for anything beyond a small fix, so the protocol impact can be discussed.
- Keep the page-facing protocol (see README → Protocol) backward compatible: no new or renamed `error` codes,
  no changed reply shapes; carry detail in `message`. A breaking change needs the ContApp side to support both
  shapes for at least one release.
- No new permissions, hosts or dependencies without a stated reason in the PR; every store reviewer reads them.
- `main` only takes pull requests; CI must be green and a code owner must approve (repository ruleset).
- Add a line under *Unreleased* in `CHANGELOG.md` for anything a user or integrator would notice.

## Working locally

```sh
npm install
npm test          # node:test suites in test/
./build.sh        # dist/chrome, dist/firefox and the zips
npm run lint      # web-ext lint on dist/firefox
```

Load the repository folder unpacked in Chrome (it matches the local ContApp host too), `dist/firefox` in
Firefox. Add or update a test in `test/` for every behaviour change.

Test conventions: each file runs its script in a `node:vm` realm with `chrome.*` stubbed at the top of the file.
Prefer a new row in an existing table-driven test over a new test. Errors a test throws into the script must be the
realm's own classes (see `throwing()`), because the worker checks `instanceof`. Values captured from the realm are
cloned before `deepEqual`. When you add a `chrome.*` call, add its stub.

## Releasing

Maintainers only. First move the *Unreleased* entries in `CHANGELOG.md` under the new version with today's date
(the workflow does not touch the changelog). Then Actions → **Release** → **Run workflow** on `main` with the bump
you want (`patch` by default). The tag is the version; nothing needs bumping by hand (README → Release process).
