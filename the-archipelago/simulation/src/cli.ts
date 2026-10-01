#!/usr/bin/env node
import { join, resolve } from "node:path";
import { publishExperiment, verifyDataset, writeCatalog, writeFiles } from "./export/dataset.js";
import { loadManifest } from "./research/manifest.js";
import { runScenario } from "./scenarios/index.js";

const USAGE = `the-archipelago — deterministic civilization simulation and research pipeline

usage:
  cli run <experiment.yaml>                 run an experiment and print a summary
  cli publish <experiment.yaml> <root>      run and write exports/<id>/, reports/ and exports/catalog.json under <root>
  cli verify <dataset-dir> [experiment]     verify file hashes, replay the event store, check research_manifest.yaml
  cli catalog <exports-root>                rebuild exports/catalog.json

Set SOURCE_DATE_EPOCH to pin research_manifest.yaml timestamps for byte-reproducible output.`;

async function main(argv: string[]): Promise<number> {
  const [cmd, a, b] = argv;
  switch (cmd) {
    case "run": {
      if (!a) break;
      const m = loadManifest(a);
      const run = await runScenario(m);
      console.log(JSON.stringify({ experiment: m.id, headHash: run.headHash, eventCount: run.log.length, expected: m.reproducibility }, null, 2));
      const exp = m.reproducibility.expectedHeadHash;
      if (exp && exp !== run.headHash) {
        console.error("head hash differs from the manifest's expected value");
        return 1;
      }
      return 0;
    }
    case "publish": {
      if (!a || !b) break;
      const m = loadManifest(a);
      const out = await publishExperiment(m);
      const root = resolve(b);
      writeFiles(join(root, "exports", out.experimentId), out.exportFiles);
      writeFiles(root, out.reportFiles);
      writeCatalog(join(root, "exports"));
      console.log(`published ${out.experimentId}: ${Object.keys(out.exportFiles).length} export files, ${Object.keys(out.reportFiles).length} reports (head ${out.headHash}, ${out.eventCount} events)`);
      const exp = m.reproducibility.expectedHeadHash;
      if (exp && exp !== out.headHash) {
        console.error("head hash differs from the manifest's expected value");
        return 1;
      }
      return 0;
    }
    case "verify": {
      if (!a) break;
      const expected = b ? loadManifest(b).reproducibility.expectedHeadHash : null;
      const r = verifyDataset(resolve(a), expected);
      console.log(JSON.stringify(r, null, 2));
      return r.ok ? 0 : 1;
    }
    case "catalog": {
      if (!a) break;
      writeCatalog(resolve(a));
      return 0;
    }
  }
  console.error(USAGE);
  return 2;
}

process.exitCode = await main(process.argv.slice(2));
