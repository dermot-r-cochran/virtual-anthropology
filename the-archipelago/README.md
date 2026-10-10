<img src="site/favicon.svg" alt="The Archipelago: four islands on a dark sea" width="72" align="left" style="margin-right:1rem">

# The Archipelago

A persistent, deterministic, event-sourced virtual civilization of digital persons across four law-governed islands: **Continuity**, **Fork**, **Mnemosyne** and **Concord**. It is a computational research platform for Virtual Anthropology. Every simulation should be publishable.

> The repository studies virtual civilizations. It does not attempt to prove, infer, or assign consciousness. Research outputs must distinguish observations, metrics, hypotheses, and interpretations.

| Directory | Purpose | Proved by |
|---|---|---|
| `simulation/` | Civilization engine: TypeScript kernel, agents (BDI, episodic memory), research pipeline, CLI, Evennia bridge | `simulation/test/kernel.test.ts` (e.g. "replay reproduces state and head hash; tampering is detected"), `simulation/test/research.test.ts`, `simulation/test/enumeration.test.ts`; the CLI through CI's publish and verify steps, the bridge server through `evennia/tests/test_bridge.py`'s `LiveBridgeTests` |
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

See [docs/architecture.md](docs/architecture.md) to begin.
