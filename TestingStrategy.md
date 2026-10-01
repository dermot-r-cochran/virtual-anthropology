# Testing Strategy

How The Archipelago is tested, what each layer guards, and the policies that keep the gates honest. The rules the gates serve are in `CLAUDE.md`; the research methodology they enforce is in `the-archipelago/docs/research-methodology.md`.

## The governing principle

The repository's claim is that every simulation is publishable: regenerable byte-for-byte from its manifest, with no conclusion in any output that was not computed from the log. So the suite does not mainly check that the simulation produces *plausible* output. It checks that the output is **the same output** (determinism, replay, the committed golden files) and that every sentence in it **traces to something recorded** (chronicle references, findings as metric comparisons, interpretation left blank). A test that passed on a different run than the committed one would be worthless here, which is why the research tests run the real scenario against the real committed export.

## Layer 1 — the simulation suite (`the-archipelago/simulation/test/`, vitest)

Two files, 24 tests, run by `npm test` and, with the typecheck in front of it, by `npm run check`. `tsconfig.json` is strict with `noUncheckedIndexedAccess`, so the typecheck is itself a gate.

- `kernel.test.ts` (12) — the kernel's guarantees, from a fresh *First Fork* genesis each time:
  - a choice log takes the first option by default, applies a flip at its exact (seq, citizen, label, occurrence), counts occurrences, reports moot flips and refuses an out-of-range option;
  - `World.replay` reproduces state and head hash, and tampering with one event is detected;
  - island law: Continuity prohibits copying, Fork creates separate identities without duplicating credits;
  - researchers cannot change a lifecycle state, and unregistered researchers are refused;
  - the disclosure guard requires the artificial-nature statement and blocks manipulation;
  - `EnactAmendment` is applied for the system actor `study` only (a citizen and the clock are refused at authorisation; an empty amendment is refused) and records `LawEnacted`;
  - each island's founding counting rule follows its doctrine (Continuity by the electorate, Concord by consensus, Fork and Mnemosyne by votes cast);
  - the counting rule is island law: one yes and one abstention carries by votes cast and by consensus and fails by the electorate, a tie fails under every rule, consensus needs a yes, and the closed-proposal event names the rule;
  - founding law overrides apply to statutory fields only, and a constitutional field in `laws` fails the schema;
  - every epilogue choice point is at or after the branch seq and taken by default; a timeline branched with no flips reproduces the base run and its choice log exactly; a flipped choice shares the record to its seq and diverges after; a moot flip changes nothing and is reported; an amendment at the branch is the first event after it;
  - **property** (fast-check): `irreversibly-deleted` is terminal under every transition;
  - **property** (fast-check, 25 runs): arbitrary experience and credit-transfer sequences (the generator is fast-check's, exercising the kernel; the simulation itself draws nothing) keep every invariant, conserve total supply, and replay to the same head hash.
- `research.test.ts` (12) — runs the scenario and `publishExperiment` once with a fixed clock, then asserts: the head hash matches the manifest's pinned value; three claimants claim continuity and the evidence returns no verdict; findings are mechanical metric comparisons; every chronicle statement traces to a real event with a matching hash; the experiment report has the standard sections and never generates interpretation; `research_manifest.yaml` carries the required provenance keys; **regeneration is byte-identical to the committed export** for `index.json`, `research_manifest.yaml`, `research.json` and `events.jsonl`; and a manifest claiming consciousness is rejected by the schema; the First Fork is filed as a demonstration and every output (index, provenance manifest, research.json, the report's abstract, design bullet and limitation) says so; and a manifest with a missing or unknown `category` is rejected while `experiment` is accepted; the study replicates the base run as declared (a branch sweep of exactly the budget, every branch completed, at or after the branch seq, distinct from the base and from each other, the `control` timeline reproducing the base head hash, the `juno-maps-instead` flip used, the single-descendant doctrine recorded `infeasible`, the no-integration doctrine completing with zero integrations, the *Study* section and its limitation present, `study:` in the provenance manifest); and a malformed study (duplicate variant ids, a zero branch budget) is rejected while a manifest without a study parses.

## Layer 2 — the Evennia bridge suite (`the-archipelago/evennia/tests/`, unittest)

12 tests, run by `python -m unittest discover -s tests -v`, needing no Evennia install: the client's request shape, refusal and id-mismatch handling and protocol-version check over a fake transport; the world plan's rooms, exits and ferry, and its rejection of duplicate room keys; formatting (the citizen description discloses artificial nature and makes no consciousness claim; `ask` parsing; citizen resolution; events by region); and two **live** tests that start the real bridge server with `npx tsx` and drive it end to end, including the refusal of an unregistered researcher. The live tests therefore need the simulation's `node_modules/` in place.

What is not tested: the Evennia typeclasses, scripts and command set themselves, which need a running Evennia. They are thin over the tested pure modules by design (`worldplan.py`, `formatting.py`, `bridge.py`).

## Layer 3 — CI (`.github/workflows/archipelago.yml`)

On every push to `main` and every pull request, one `test` job: `npm ci`, `npm run check`, then **regenerate and diff** (`publish:first-fork`, `verify:first-fork`, `git diff --exit-code -- ../exports ../reports`), then the Evennia suite on Python 3.12. `SOURCE_DATE_EPOCH` is pinned at the workflow level and again in the publish script.

The diff step is the repository's golden suite. The committed `exports/` and `reports/` are behaviour-as-specification: any change that alters a simulation result fails there, and an intended change regenerates them in the same pull request. Never patch an exported file by hand to make the diff green; the `verify` step would fail on the hash anyway.

A `pages` job runs on `main` only, after `test` passes: it publishes again, copies `site/`, `exports/` (as `data/`) and `reports/` into one artifact and deploys it. Because it does not run on pull requests, a break in site assembly merges green and fails on deploy. The first run on `main` failed at `configure-pages` with *Not Found* because Pages was not enabled for the repository; the workflow passes `enablement: true` since 2026-10-01.

Everything fails; nothing warns. There is no lint and no coverage measurement yet (see gaps).

## Extending

- **A new scenario that should support timelines** implements `ScenarioDriver.branch` and attaches its epilogue minds from the record the way `attachEpilogueMinds` does, with a control-branch test proving the base head hash is reproduced.
- **A new scenario** lands with its manifest, its registry entry in `scenarios/index.ts`, the generated `exports/<id>/` and `reports/` from a pinned-clock publish run, and a `research.test.ts`-style test that runs it and compares against the committed export. From then on CI's diff holds it still.
- **A new invariant** goes in `kernel/invariants.ts` and gets a fast-check property in `kernel.test.ts` that drives arbitrary command sequences through it, the way supply conservation and replay equality are pinned now.
- **A new policy guard** (a disclosure pattern, an authorisation rule, an island-law clause) lands with both verdicts: the case refused and the nearest case admitted.
- **A new metric** is defined in `research/metric-registry.ts`, so it is reproduced in every report and manifest, and used by a hypothesis whose finding the research test can check as a mechanical comparison.
- **A new chronicle or report statement** must cite an event; the traceability test will fail if it does not, which is the intended way to find out.
- **An intentional output change** regenerates the exports in the same change and says in the pull request what moved.

## Known gaps (candidates for next)

- **No coverage measurement.** `coverage/` is already gitignored, but no coverage provider is installed and CI runs none. The account's convention is a ratchet at the measured baseline, raised only with the tests that earn it; measure first, then add the gate at the number measured.
- **No lint.** Neither ESLint nor Biome for the TypeScript, nor ruff for the Python. Add one green on its first run, never red; a permanently failing check is the one everyone learns to ignore.
- **Studies summarise, they do not infer.** Branch sweeps, doctrine variants and timelines exist now, but their summaries are min, median, mean, max and counts; no test checks that a report's language stays descriptive beyond the printed limitation, because that is a judgement. The next step on the research side, if wanted, is a declared comparison between groups with its own operationalisation, never a generated one.
- **The Pages job is untested on pull requests.** A dry assembly step in the `test` job (copy the three directories, check the site's `index.html` and `catalog.json` are where `app.js` looks) would catch a broken site before `main`.
- **Actions pinned to Node 20 majors.** The runner warns that `checkout@v4`, `setup-node@v4` and `configure-pages@v5` target the deprecated Node 20; bump them when their next majors are stable.
- **Two identical docs.** `docs/evennia.md` and `evennia/README.md` are byte-identical; a diff check in CI, or collapsing one into a pointer, stops them drifting.
