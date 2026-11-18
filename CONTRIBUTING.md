# Contributing to virtual-anthropology (The Archipelago)

Contributions are welcome: bug reports, fixes, tests, documentation and focused improvements.

## Before you start

- For anything beyond a small fix, you may find it useful to open an issue first describing the problem and the change you have in mind, before you spend time on it.
- Read `docs/ethical-framework.md` and `docs/research-methodology.md`. Several of their rules are enforced by tests: no claim of consciousness anywhere, interpretation is never generated, every chronicle statement cites an event, researchers are bounded, and a plural citizen is one person whose members' disagreement is ordinary difference, never a symptom.
- Canonical state changes only by recorded events. The committed `exports/` and `reports/` are golden output: an intentional change to the simulation regenerates them with the publish commands in the same pull request, never by hand.

## Making a change

- Keep a pull request to one change, and say in its description what it changes and why.
- Run what CI runs before you push:

```bash
cd the-archipelago/simulation
npm ci
npm run check && npm run lint && npm run coverage
npm run check:docs && npm run check:site
npm run publish:first-fork && npm run verify:first-fork
npm run publish:two-voices && npm run verify:two-voices
git diff --exit-code -- ../exports ../reports
```

- Every capability the README claims names the test that proves it, or says *no test yet* or *not yet implemented*. A new capability lands with its tests and its README row in the same pull request, and a renamed test updates the rows that cite it.
- The coverage thresholds in `vitest.config.ts` are a ratchet: they may rise with tests that earn them, never fall.
- Set `SOURCE_DATE_EPOCH=1767225600` if you call the CLI directly, as the publish scripts do.

## How a pull request is reviewed

The repository has one maintainer, Dermot Cochran, so a pull request may wait a while before anyone looks at it.

- CI must be green. A failing check is the first thing to fix.
- The review may be assisted by an AI tool, which reads the change and reports to the maintainer. It does not approve or merge anything.
- **Every outside pull request is merged by the maintainer, never by an automated process or an AI tool,** however small.
- A pull request may be declined, or asked to change shape, when it moves the project somewhere it is not meant to go. That is not a judgement on the work.

## Licence

Contributions are accepted under this repository's licence, the MIT License (`LICENSE`), the same terms everyone else receives the code under. No sign-off line and no contributor licence agreement are required. Only contribute work you have the right to license on these terms.

## Security

Please don't describe a security problem in a public issue or pull request. Report it privately instead, through the repository's **Security** tab (*Report a vulnerability*). Only the maintainer sees the report.
