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
| Plural systems | `domain/plurality.ts`, the optional `plurality` field of a citizen | One citizen, made of members; changed only by the `ChangeFronting` command and its `FrontingChanged` event |
| Symbolic minds | `agents/symbolic.ts`, `agents/plural.ts` | Rule bases are data; the rationale logged with a proposal is the rule trace |
| Policy decisions | `policy/evaluate.ts` | Each command passes schema → authorization → precondition → island law |
| Narrative rendering | `narrative/` | Pure functions of the log and state |
| Research analytics | `research/` | Read only the stable `interchange.ts` contract |

A language model may propose actions or dialogue (`agents/llm.ts`). Only validated commands change the world. Replies from citizens pass a disclosure and anti-manipulation guard.

## Minds

Three kinds of mind sit behind a citizen, all through the one `CitizenMind` interface, and all of them only *propose*:

- **Deterministic placeholders** (`agents/deterministic.ts`, `agents/bdi.ts`): scripted beats, and a Belief–Desire–Intention agent whose priorities are functions of values, law and circumstance.
- **The symbolic mind** (`agents/symbolic.ts`): forward-chaining production rules over the agent's beliefs. Working memory is a set of string facts derived from the scoped observation (`factsOf`); a rule base is data (`RuleBaseSchema`: each rule has an id, a salience, `when` conditions over facts and a `then` that asserts facts or raises an intention); each cycle fires the one eligible rule of highest salience, ties by id, once per deliberation; the intentions raised at the top salience are a choice point when there is more than one; the BDI plan library turns the intention into one candidate command. The rationale recorded with the proposal is the **rule trace**: every rule that fired, the facts it matched, what it asserted or intended, the agenda and the intention, in one line. The rule base's id and the sha256 of its canonical JSON are the mind's provenance (`kind: symbolic`), where a prompt's would be. The civic rule base (`CIVIC_RULES`) writes the BDI desires out as rules.
- **The language-model adapter** (`agents/llm.ts`): untrusted text, parsed into candidates; no client bundled.

**A plural system's mind** (`agents/plural.ts`) composes the symbolic mind: one rule base per fronting member (`voices`, keyed by member path; members without one share a default), each deliberating over the same observation, and the system's own declared reconciliation (`front-decides`, `weighted-say`, `in-turn` or `concurrence`, in `domain/plurality.ts`) deciding which proposal, if any, the one citizen makes. Differing proposals are written into the rationale as ordinary difference and reconciled; nothing flags them. A fronting member that is a subsystem is resolved the same way one level down. Members not fronting do not deliberate, so a system of any size costs its fronting members. Every choice is a choice point on the one citizen, labelled with the member path.

## Plural systems

A citizen may be a plural system (`domain/plurality.ts`): **one digital person** in law and in the record, with one citizen id, one lifecycle, one ledger account and one place in an electorate, made up of **members**. The choice and its reasons: the record's unit is the civic person, the law tables (electorate snapshots, succession, the Branch Compact's descendant count) are written over citizens, and making members citizens would have forced every table to say what a member's vote, estate or lineage is before any island's doctrine had spoken; so members are not citizens, copies, forks or descendants unless a doctrine one day says so, and the Archipelago-wide charter rule `a-plural-system-is-one-person` is cited on every change of front. The representation never assumes a system is small: `members` are the members the record knows, in the system's declared order, and `membership` is either a declared `counted` total (at least the known members) or `unbounded`, so a system of 720,000 members, or one that gives no finite count, is recorded without materialising a member object for each, and known members are never assumed to be all members. Members are unequal and need not be symmetric: each has a role, a `say` (its weight under `weighted-say`) and an `everFronted` flag; `fronting` lists who fronts now, co-fronting when more than one, and may be empty. A member may itself be a system (**subsystem**), to any depth, with its own members, fronting and reconciliation; depth never means less real. Fronting changes only by the citizen's own `ChangeFronting` command, recorded as `FrontingChanged` (with the members fronting for the first time in the record named), allowed on every island because it is the one person acting, not a copy. The invariants check structure only (unique member ids, known fronts, a count no smaller than the known members, no collision with a citizen id); none concerns agreement between members. A branch of a plural system on Fork is itself a plural system with the same members, a separate person; the fork record counts branches, never members. The research snapshot summarises a plural citizen's membership (`plurality`: known members, count or null, depth, fronting, reconciliation) and lists no member; a singular citizen carries no such key, so the published First Fork is unchanged.

## Determinism

- There is no randomness. Where a mind has more than one option it records a **choice point** (`agents/choice.ts`) and takes the first in canonical order; a study takes the alternatives as branching timelines. Agents act in identifier order; an unstated value axis is neutral. The manifest's `seed` is the run's identity in provenance and nothing is derived from it.
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
