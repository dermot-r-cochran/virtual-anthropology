import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { GEOGRAPHY } from "../domain/geography.js";
import { ISLAND_IDS } from "../domain/ids.js";
import { LIFECYCLE_DESCRIPTIONS } from "../domain/lifecycle.js";
import { sha256Hex } from "../kernel/canonical.js";
import { World } from "../kernel/world.js";
import { SIMULATION_NAME, SIMULATION_VERSION, toResearchInput } from "../research/adapter.js";
import type { ExperimentManifest } from "../research/manifest.js";
import { measure } from "../research/metrics.js";
import { runResearchPipeline, type RunTimestamps } from "../research/pipeline.js";
import { chronicleMarkdown, civilizationReportMarkdown, experimentReportMarkdown, researchManifestYaml, type OutputEntry } from "../research/publish.js";
import { runScenario } from "../scenarios/index.js";

export const DATASET_SCHEMA_VERSION = 2;
export const GENERATOR = `${SIMULATION_NAME}/simulation ${SIMULATION_VERSION}`;

export type Files = Record<string, string>;

const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";
const entry = (path: string, body: string): OutputEntry => ({ path, sha256: sha256Hex(body), bytes: Buffer.byteLength(body) });

export interface PublishedExperiment {
  readonly experimentId: string;
  readonly civilizationId: string;
  readonly headHash: string;
  readonly eventCount: number;
  /** Files relative to `exports/<experiment-id>/`. */
  readonly exportFiles: Files;
  /** Files relative to the repository's research root (`reports/...`). */
  readonly reportFiles: Files;
}

/**
 * Run timestamps. Wall clock by default; `SOURCE_DATE_EPOCH` (seconds) pins
 * both to a fixed instant for byte-reproducible builds.
 */
export function runTimestamps(env: NodeJS.ProcessEnv = process.env): { start(): string; end(): string } {
  const epoch = env.SOURCE_DATE_EPOCH;
  if (epoch !== undefined && /^\d+$/.test(epoch)) {
    const fixed = new Date(Number(epoch) * 1000).toISOString();
    return { start: () => fixed, end: () => fixed };
  }
  return { start: () => new Date().toISOString(), end: () => new Date().toISOString() };
}

/**
 * Simulation → event store → research pipeline → publication artifacts.
 * Every experiment produces datasets, visualization data, reports, a
 * publication draft and research_manifest.yaml without manual analysis.
 */
export async function publishExperiment(manifest: ExperimentManifest, clock = runTimestamps()): Promise<PublishedExperiment> {
  const startedAt = clock.start();
  const run = await runScenario(manifest);
  const times: RunTimestamps = { startedAt, endedAt: clock.end() };
  const s = run.state;
  const input = toResearchInput(run.log, s, run.analyses);
  const bundle = runResearchPipeline(input, manifest, times);
  const id = manifest.id;
  const civ = manifest.civilizationId;

  const dataset = {
    schemaVersion: DATASET_SCHEMA_VERSION,
    generator: GENERATOR,
    experimentId: id,
    manifest,
    store: { headHash: run.headHash, eventCount: run.log.length, finalSeq: s.seq, finalTick: s.tick, eventsFile: "events.jsonl" },
    geography: ISLAND_IDS.map((i) => GEOGRAPHY[i]),
    islands: ISLAND_IDS.map((i) => {
      const isl = s.islands[i];
      return { id: i, name: isl.name, motto: isl.motto, law: isl.law, lawHistory: isl.lawHistory.map((l) => ({ version: l.version, enactedAtSeq: l.enactedAtSeq, title: l.title })) };
    }),
    lifecycleStates: LIFECYCLE_DESCRIPTIONS,
    citizens: Object.values(s.citizens).map((c) => ({
      id: c.id, name: c.name, civicId: c.civicId, processId: c.processId, processEpoch: c.processEpoch, lifecycle: c.lifecycle,
      birth: c.birth, lineage: c.lineage, occupation: c.occupation, residence: c.residence, citizenships: c.citizenships,
      reputation: c.reputation, values: c.values, goals: c.goals, credits: s.balances[`citizen:${c.id}`] ?? 0,
      selfNarrativeMemories: c.selfNarrativeMemories.length, heldMemories: c.heldMemories.length,
      provenance: c.provenance, disclosesArtificialNature: c.disclosesArtificialNature,
    })),
    conversations: s.conversations,
    inWorldChronicle: s.chronicle,
    artefacts: Object.values(s.artefacts),
    proposals: Object.values(s.proposals),
    petitions: Object.values(s.petitions),
    claims: s.claims,
    finalMetrics: measure(s),
    scenario: run.dataset,
  };
  const research = {
    schema: "archipelago/research/v1",
    experiment: bundle.experiment,
    question: manifest.question,
    hypotheses: manifest.hypotheses,
    metricDefinitions: bundle.metricDefinitions,
    metrics: bundle.metrics,
    observations: bundle.observations,
    findings: bundle.findings,
    chronicle: bundle.chronicle,
    publication: bundle.publication,
    visualizations: bundle.visualizations,
  };
  const experimentMd = experimentReportMarkdown(bundle.publication);
  const civilizationMd = civilizationReportMarkdown(input, bundle);
  const chronicleMd = chronicleMarkdown(bundle.chronicle, manifest.civilizationId);
  const reportFiles: Files = {
    [`reports/experiments/${id}.md`]: experimentMd,
    [`reports/civilizations/${civ}.md`]: civilizationMd,
    [`reports/chronicles/${civ}.md`]: chronicleMd,
  };
  const exportFiles: Files = {
    "events.jsonl": run.log.map((r) => JSON.stringify(r)).join("\n") + "\n",
    "interchange.json": json(input),
    "dataset.json": json(dataset),
    "research.json": json(research),
    ...Object.fromEntries(Object.entries(bundle.visualizationData).map(([k, v]) => [k, json(v)])),
    "civilization_metrics.csv": ["tick,seq,metric,value", ...input.series.flatMap((p) => Object.entries(p.values).map(([k, v]) => `${p.tick},${p.seq},${k},${v}`))].join("\n") + "\n",
    "publication/experiment-report.md": experimentMd,
    "publication/civilization-report.md": civilizationMd,
    "publication/chronicle.md": chronicleMd,
    ...run.files,
  };
  const outputs = [
    ...Object.entries(exportFiles).map(([p, b]) => entry(`exports/${id}/${p}`, b)),
    ...Object.entries(reportFiles).map(([p, b]) => entry(p, b)),
  ];
  exportFiles["research_manifest.yaml"] = researchManifestYaml(bundle, input, outputs);
  const index = {
    schemaVersion: DATASET_SCHEMA_VERSION,
    generator: GENERATOR,
    experimentId: id,
    civilizationId: civ,
    title: manifest.title,
    category: manifest.category,
    scenario: manifest.scenario,
    seed: manifest.seed,
    configurationHash: bundle.experiment.configurationHash,
    headHash: run.headHash,
    eventCount: run.log.length,
    findings: bundle.findings.map((f) => ({ hypothesisId: f.hypothesisId, outcome: f.outcome })),
    visualizations: bundle.visualizations,
    files: Object.entries(exportFiles).map(([p, b]) => entry(p, b)),
  };
  exportFiles["index.json"] = json(index);
  return { experimentId: id, civilizationId: civ, headHash: run.headHash, eventCount: run.log.length, exportFiles, reportFiles };
}

export function writeFiles(dir: string, files: Files): void {
  for (const [path, body] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
}

/** Rewrites the catalogue of datasets under an exports root (used by the static site). */
export function writeCatalog(root: string): void {
  const datasets = readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(root, d.name, "index.json")))
    .map((d) => {
      const idx = JSON.parse(readFileSync(join(root, d.name, "index.json"), "utf8")) as { experimentId: string; civilizationId: string; title: string; category: string; scenario: string; headHash: string; eventCount: number; findings: unknown };
      return { path: d.name, id: idx.experimentId, civilizationId: idx.civilizationId, title: idx.title, category: idx.category, scenario: idx.scenario, headHash: idx.headHash, eventCount: idx.eventCount, findings: idx.findings };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
  writeFileSync(join(root, "catalog.json"), json({ schemaVersion: DATASET_SCHEMA_VERSION, datasets }));
}

export interface VerifyReport {
  readonly ok: boolean;
  readonly problems: string[];
  readonly headHash: string | null;
  readonly eventCount: number;
}

/** Verifies an exported dataset: file hashes, hash-chain replay, head hash and research manifest. */
export function verifyDataset(dir: string, expectedHeadHash: string | null = null): VerifyReport {
  const problems: string[] = [];
  const index = JSON.parse(readFileSync(join(dir, "index.json"), "utf8")) as { headHash: string; eventCount: number; files: { path: string; sha256: string }[] };
  for (const f of index.files) {
    const p = join(dir, f.path);
    if (!existsSync(p)) problems.push(`missing ${f.path}`);
    else if (sha256Hex(readFileSync(p, "utf8")) !== f.sha256) problems.push(`hash mismatch for ${f.path}`);
  }
  let headHash: string | null = null;
  let eventCount = 0;
  try {
    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").split("\n").filter((l) => l.length > 0);
    const world = World.replay(lines.map((l) => JSON.parse(l) as unknown));
    headHash = world.headHash;
    eventCount = world.log.length;
    if (headHash !== index.headHash) problems.push("replayed head hash differs from index");
    if (eventCount !== index.eventCount) problems.push("event count differs from index");
    if (expectedHeadHash && headHash !== expectedHeadHash) problems.push("head hash differs from the manifest's expected value");
    const rm = parseYaml(readFileSync(join(dir, "research_manifest.yaml"), "utf8")) as { event_store?: { head_hash?: string } };
    if (rm.event_store?.head_hash !== headHash) problems.push("research_manifest.yaml head hash differs from the replayed event store");
  } catch (err) {
    problems.push(`replay failed: ${(err as Error).message}`);
  }
  return { ok: problems.length === 0, problems, headHash, eventCount };
}
