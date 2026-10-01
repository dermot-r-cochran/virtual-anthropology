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
