# Experiments

Each directory holds an `experiment.yaml`, the authoritative definition of a reproducible run. It records:

- the `category`: `demonstration` (scenario-authored outcome) or `experiment` (unscripted outcome);
- the research question and operationalised hypotheses;
- the seed, minds and researchers;
- the research bounds and parameters;
- an optional `study`: branch sweeps, doctrine variants and alternate timelines, each replicated deterministically;
- ethics, limitations and future work;
- the pinned `reproducibility` head hash and event count.

To publish an experiment:

```sh
cd ../simulation && SOURCE_DATE_EPOCH=1767225600 npx tsx src/cli.ts publish ../experiments/the-first-fork/experiment.yaml ..
```
