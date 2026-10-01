# Architecture

```
Evennia world layer (evennia/)        rooms · regions · citizens · events · researcher commands
        │  JSON-lines bridge (simulation/src/bridge)
        ▼
Civilization kernel (simulation/src/kernel, domain, policy, agents)
        identity · memory · relationships · governance · resources · culture
        │  event store (hash-chained, append-only)
        ▼
Research layer (simulation/src/research)
        interchange → metrics → observations → findings → publication draft
        chronicle · visualizations · reports · research_manifest.yaml
        │  JSON export (exports/<experiment-id>/)
        ▼
Static site (site/, GitHub Pages) → interactive visualizations
```

## Separation of concerns

| Concern | Location | Rule |
|---|---|---|
| Canonical world state | `kernel/reducer.ts`, `domain/model.ts` | Changed only by recorded events |
| Citizen cognitive state | `agents/` (BDI beliefs, desires and intentions, plus episodic memory) | Private to the agent runtime and never canonical |
| Model-generated proposals | `agents/runtime.ts` | Candidates only. They are logged with a rationale. |
| Policy decisions | `policy/evaluate.ts` | Each command passes schema → authorization → precondition → island law |
| Narrative rendering | `narrative/` | Pure functions of the log and state |
| Research analytics | `research/` | Read only the stable `interchange.ts` contract |

A language model may propose actions or dialogue (`agents/llm.ts`). Only validated commands change the world. Replies from citizens pass a disclosure and anti-manipulation guard.

## Determinism

- All randomness comes from seeded RNGs (`kernel/rng.ts`).
- Every event is hash-chained, and `World.replay` re-verifies the whole chain.
- The configuration hash is the canonical JSON of the experiment manifest without its `reproducibility` block.
- Report timestamps use the wall clock unless `SOURCE_DATE_EPOCH` is set. CI pins it and requires regenerated outputs to be byte-identical to the committed ones.

## Publication pipeline

`export/dataset.ts#publishExperiment` produces:

- `exports/<id>/`:
  - `events.jsonl`, `interchange.json`, `dataset.json` and `research.json`;
  - `lineage_graph.json`, `relationship_network.json`, `governance_events.json`, `memory_history.json`, `civilization_metrics.json` and `.csv`;
  - `research_manifest.yaml`, the authoritative provenance document with sha256 hashes of every output;
  - `publication/`, the scenario `reports/` and `index.json`.
- `reports/experiments/<id>.md`, `reports/civilizations/<civ>.md` and `reports/chronicles/<civ>.md`.

The Research bounded context (`research/domain.ts`) defines these aggregates:

- ResearchQuestion
- Hypothesis (operationalised as `metric comparator threshold`)
- Experiment
- Observation (each must trace to metrics or events)
- Finding (the mechanical result of a hypothesis test)
- Publication (every section is labelled with an epistemic category)
- Visualization
- CivilizationChronicle (every statement cites events; year = tick + 1)
