<img src="site/favicon.svg" alt="The Archipelago: four islands on a dark sea" width="72" align="left" style="margin-right:1rem">

# The Archipelago

A persistent, deterministic, event-sourced virtual civilization of digital persons across four law-governed islands: **Continuity**, **Fork**, **Mnemosyne** and **Concord**. It is a computational research platform for Virtual Anthropology. Every simulation should be publishable.

> The repository studies virtual civilizations. It does not attempt to prove, infer, or assign consciousness. Research outputs must distinguish observations, metrics, hypotheses, and interpretations.

| Directory | Purpose | Proved by |
|---|---|---|
| `simulation/` | Civilization engine: TypeScript kernel, agents (BDI, symbolic rule minds, episodic memory), plural systems as citizens, research pipeline, CLI, Evennia bridge | `simulation/test/kernel.test.ts` (e.g. "replay reproduces state and head hash; tampering is detected"), `simulation/test/research.test.ts`, `simulation/test/enumeration.test.ts`, `simulation/test/symbolic.test.ts`, `simulation/test/plural.test.ts`; the CLI through CI's publish and verify steps, the bridge server through `evennia/tests/test_bridge.py`'s `LiveBridgeTests` |
| `experiments/` | Reproducible experiment definitions (`experiment.yaml`) | `simulation/test/research.test.ts`: "is deterministic and matches the manifest's pinned head hash" |
| `exports/` | Published JSON datasets, one directory per experiment, plus `catalog.json` | `simulation/test/research.test.ts`: "regeneration with a fixed clock is byte-identical to the committed export"; every file, `catalog.json` included, by CI's regenerate-and-diff step |
| `reports/` | Generated experiment, civilization and chronicle reports | `simulation/test/research.test.ts`: "experiment report has the standard sections and never generates interpretation", "every chronicle statement traces to real events with matching hashes"; CI's regenerate-and-diff step |
| `docs/` | Research documentation | Documentation, not a capability; its links are checked by `simulation/scripts/check-docs.ts` |
| `site/` | Static GitHub Pages site with interactive visualizations | No test yet (the Pages job runs on `main` only) |
| `evennia/` | Evennia world layer (rooms, regions, citizens, events and researcher commands) | `evennia/tests/test_bridge.py`: `WorldPlanTests.test_rooms_exits_and_ferry`, `LiveBridgeTests.test_end_to_end`; the typeclasses, scripts and commands themselves need Evennia and have no test yet |

"CI's regenerate-and-diff step" is the step *Regenerate research outputs and require them to match the committed ones* in `.github/workflows/archipelago.yml`: it republishes *The First Fork*, verifies every output's sha256 against the manifest, and fails on any difference from the committed `exports/` and `reports/`. Each capability row and bullet in this README names the test that proves it or says it has none yet (the README-proof convention, 10 October 2026); `simulation/scripts/check-docs.ts` (`npm run check:docs`, run in CI) holds the README's links, front matter, directory table, island count and outputs list to the disk.

## Quick start

```sh
cd simulation
npm ci
npm run check                 # typecheck + unit and property-based tests
npm run publish:first-fork    # simulation → event store → exports/, reports/, research_manifest.yaml
npm run verify:first-fork     # replay the hash chain and check every file hash
python3 -m http.server -d ..  # then open http://localhost:8000/site/
```

The full simulation runs with deterministic placeholder citizens and needs no model credentials.

## First scenario: The First Fork

A citizen of Continuity migrates to Fork and creates two descendants. One stays on Fork, one moves to Mnemosyne and imports communal memories, and the original returns to Continuity. All three later claim continuity with the pre-fork person. The outputs are:

- an event timeline (CI's regenerate-and-diff step; no unit test yet);
- a lineage graph (CI's regenerate-and-diff step; no unit test yet);
- a memory-provenance report (CI's regenerate-and-diff step; no unit test yet);
- legal readings from each island (`simulation/test/research.test.ts`: "three claimants claim continuity; evidence returns no verdict", which counts four readings);
- identity-continuity evidence (the same test);
- a researcher commentary template (CI's regenerate-and-diff step; no unit test yet).

The system never decides which claimant is "the real person" (`simulation/test/research.test.ts`: "three claimants claim continuity; evidence returns no verdict").

## Symbolic minds and plural systems

Since 23 October 2026 a citizen may be a plural system, and a symbolic mind sits beside the deterministic placeholders and the language-model adapter ([docs/architecture.md](docs/architecture.md), *Minds* and *Plural systems*; [docs/glossary.md](docs/glossary.md); [docs/ethical-framework.md](docs/ethical-framework.md), point 7). The published First Fork is unchanged by either (CI's regenerate-and-diff step).

- A symbolic mind reasons by explicit production rules over its beliefs, proposes through the choice log, and records the rule trace as the rationale of every proposal (`simulation/test/symbolic.test.ts`: "proposes through the choice log, and its rationale is the rule trace", "a rule fires when its conditions hold and the trace says which"); it is deterministic and its chaining is independent of the order rules are declared in (the same file: "is deterministic", the property "forward chaining fires the same rules in the same order whatever order the rules are declared in"); a rule base is validated data hashed into provenance ("a rule base is data, validated and hashed into provenance").
- A plural system is one digital person: one citizen id, one ledger account, one place in an electorate, and its members are not citizens (`simulation/test/plural.test.ts`: "a plural system is one person in the record"). It is not a copy and not a fork: it lives under Continuity's Charter, a change of front is not a fork, and the Branch Compact counts the branches a plural system makes, never its members ("plurality is not copying", "members are not descendants").
- Members are unequal (role, say, whether they have ever fronted), membership may be counted in the hundreds of thousands or unbounded without materialising members, and subsystems nest to any depth ("membership is recorded without materialising members"; the property "nested systems of any depth and any declared size keep every invariant, found a world, and replay to the same head hash").
- Members may disagree; differing proposals are recorded as ordinary difference and reconciled by the system's own declared way, with no flag and no violation ("members may disagree", "each declared way of reconciling decides as it says", the property "whatever two fronting members propose and whatever the system's way of deciding, a difference is recorded and nothing is thrown").
- A plural citizen's reply opens with the artificial-nature statement, may name who is fronting, and claims neither consciousness nor humanity for the system or any member ("a plural citizen's reply opens with the artificial-nature statement, names who is fronting, and claims nothing").
- No demonstration of a plural citizen is published yet; the fixture in `simulation/test/plural.test.ts` is test-only (not yet implemented as an experiment).

See [docs/architecture.md](docs/architecture.md) to begin.
