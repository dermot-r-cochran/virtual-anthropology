# The Archipelago

A persistent, deterministic, event-sourced virtual civilization of digital persons across four law-governed islands: **Continuity**, **Fork**, **Mnemosyne** and **Concord**. It is a computational research platform for Virtual Anthropology. Every simulation should be publishable.

> The repository studies virtual civilizations. It does not attempt to prove, infer, or assign consciousness. Research outputs must distinguish observations, metrics, hypotheses, and interpretations.

| Directory | Purpose |
|---|---|
| `simulation/` | Civilization engine: TypeScript kernel, agents (BDI, episodic memory), research pipeline, CLI, Evennia bridge |
| `experiments/` | Reproducible experiment definitions (`experiment.yaml`) |
| `exports/` | Published JSON datasets, one directory per experiment, plus `catalog.json` |
| `reports/` | Generated experiment, civilization and chronicle reports |
| `docs/` | Research documentation |
| `site/` | Static GitHub Pages site with interactive visualizations |
| `evennia/` | Evennia world layer (rooms, regions, citizens, events and researcher commands) |

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

- an event timeline;
- a lineage graph;
- a memory-provenance report;
- legal readings from each island;
- identity-continuity evidence;
- a researcher commentary template.

The system never decides which claimant is "the real person".

See [docs/architecture.md](docs/architecture.md) to begin.
