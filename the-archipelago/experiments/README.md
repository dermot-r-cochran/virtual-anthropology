# Experiments

Each directory holds an `experiment.yaml`, the authoritative definition of a reproducible run. It records:

- the `category`: `demonstration` (scenario-authored outcome) or `experiment` (unscripted outcome) (`simulation/test/research.test.ts`: "manifest validation rejects a missing or unknown category");
- the research question and operationalised hypotheses (`research.test.ts`: "research_manifest.yaml carries the required provenance keys", "findings are mechanical metric comparisons");
- the seed, minds and researchers (the seed in the same provenance test; registered researchers in `simulation/test/kernel.test.ts`: "researchers cannot change lifecycle; unregistered researchers are refused"; the minds no test yet beyond the pinned run below);
- the research bounds and parameters (no test yet);
- an optional `study`: branch sweeps, doctrine variants and alternate timelines, each replicated deterministically (`research.test.ts`: "the study replicates the base run under its declared variations, and the control timeline reproduces it exactly", "manifest validation rejects a malformed study");
- ethics, limitations and future work (`research.test.ts`: "experiment report has the standard sections and never generates interpretation"; no test yet that ethics is carried);
- the pinned `reproducibility` head hash and event count (`research.test.ts`: "is deterministic and matches the manifest's pinned head hash").

To publish an experiment:

```sh
cd ../simulation && SOURCE_DATE_EPOCH=1767225600 npx tsx src/cli.ts publish ../experiments/the-first-fork/experiment.yaml ..
```
