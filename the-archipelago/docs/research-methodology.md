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

## No invented conclusions

- Findings are template text over a computed comparison. Their outcome is one of consistent, inconsistent or undetermined, and they hold only "in this single deterministic run".
- Chronicle statements are built only from event payloads and snapshot names. Each cites `seq:type` and the event hash. A test checks every reference against the log.
- Anthropological observations in civilization reports restate the metrics they cite.

## Metrics

Definitions live in `simulation/src/research/metric-registry.ts`. They are reproduced in every experiment report and in `research_manifest.yaml`.

## Adding an experiment

1. Add `experiments/<name>/experiment.yaml`, with schemaVersion 2 (see `research/manifest.ts`).
2. Register the scenario in `simulation/src/scenarios/index.ts`.
3. Run `npx tsx src/cli.ts publish ../experiments/<name>/experiment.yaml ..` and pin `reproducibility`.
