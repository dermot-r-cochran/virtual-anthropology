# Research methodology

## Epistemic categories

Every publication section is labelled with one of these categories:

| Category | Meaning | Generated? |
|---|---|---|
| observation | Restates recorded events or computed values, with a trace | yes |
| metric | The value of a documented, deterministic function of the interchange | yes |
| hypothesis | A researcher-authored statement, operationalised as `metric comparator threshold` | no (authored) |
| method / provenance | The declared design, configuration and identifiers | yes, from the manifest |
| interpretation | Meaning and speculation | **never generated**; it is left as a labelled placeholder |
| limitation | Known limits | from the manifest, plus standard caveats |

## Demonstrations and experiments

Every manifest declares a `category`, and the field is required because a default would file a run silently:

| Category | Meaning | What a consistent finding shows |
|---|---|---|
| demonstration | The protagonists' actions are authored by the scenario | That the platform and the declared law tables produce the declared outcome. Not evidence about what citizens would do. |
| experiment | The outcome is not scripted | An observation of this run under the declared rules, seed and parameters |

The category is printed in the experiment report's abstract and design section, in `research_manifest.yaml`, in `index.json` and `catalog.json`, and on the site. A demonstration's report also carries the limitation above verbatim. *The First Fork* is a demonstration: it validates the kernel, the law tables and the publication pipeline, and its three findings are read as that.

## Studies: branch sweeps, doctrine variants and alternate timelines

A manifest may declare a `study`, and the base run is then replicated under declared variations. Every replication is a deterministic run of its own, identified by its head hash, and `study.json` is regenerated and diffed like every other output.

| Group | What varies | How |
|---|---|---|
| `branches` | One recorded choice | Choice points after the branch point are taken differently, one flip per timeline, up to `budget` timelines, in a declared order that is fair, unbiased and representative (below) |
| `doctrines` | Statutory law at founding | One island's amendable fields are overridden in genesis (`laws` in the genesis config); constitutional fields define the island and cannot be varied |
| `timelines` | What follows the branch point | The base record is replayed to the scenario's branch point (The First Fork: after the last scripted beat, before the agent-based epilogue), an amendment is enacted there by the system actor `study` if declared, and the epilogue runs with the variant's declared flips; a variant with neither is a control |

Three rules keep a study honest. **Nothing is random, so branching replaces sampling**: wherever a mind has more than one option (which kin to tend, which intention among those within a margin of the strongest, which place, activity or artefact kind) it records a choice point and takes the first option in canonical order; a flip names a point by (seq, citizen, label, occurrence) and takes another option; a flip whose point never occurs is reported as moot. **The sweep's order is declared, and it is fair, unbiased and representative** (Dermot's principle, 2026-10-02, verbatim: *the enumeration order needs to be fair, unbiased and representative; randomness just means underdetermined or not fully known*): every citizen takes one alternative before any takes a second; within a citizen the kinds of choice rotate and within a point the alternatives are taken in canonical order one per visit; within one citizen and kind, points are visited in van der Corput (bit-reversed) order of their position in the record, so a budget of twelve is spread across the epilogue rather than clustered at its start. The order is named in `study.json` (`enumeration`) and in the provenance manifest, and `research/enumeration.ts` is its one definition. **The epilogue is built from the record**: at the branch point every mind is re-attached from canonical state in a fixed order, so a timeline branched with no flips reproduces the base run byte for byte (a test holds this). **A variation the scenario cannot proceed under is a result, not a crash**: the run is recorded as `infeasible` with the scenario's own reason. **Summaries are min, median, mean and max over completed runs**, and per hypothesis a count of consistent, inconsistent and undetermined outcomes; nothing is inferred from them. The report's *Study* section and the site's *Study* view print exactly these.

## No invented conclusions

- Findings are template text over a computed comparison. Their outcome is one of consistent, inconsistent or undetermined, and they hold only "in this single deterministic run".
- Chronicle statements are built only from event payloads and snapshot names. Each cites `seq:type` and the event hash. A test checks every reference against the log.
- Anthropological observations in civilization reports restate the metrics they cite.

## Metrics

Definitions live in `simulation/src/research/metric-registry.ts`. They are reproduced in every experiment report and in `research_manifest.yaml`.

## Adding an experiment

1. Add `experiments/<name>/experiment.yaml`, with schemaVersion 2 (see `research/manifest.ts`) and a `category` of `demonstration` or `experiment`.
2. Register the scenario in `simulation/src/scenarios/index.ts`.
3. Run `npx tsx src/cli.ts publish ../experiments/<name>/experiment.yaml ..` and pin `reproducibility`.
4. Optionally declare a `study` (see above); a scenario needs a branch point (`ScenarioDriver.branch`) before it can run timelines.
