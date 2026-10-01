import type { WorldState } from "../domain/model.js";
import type { RecordedEvent } from "../kernel/events.js";
import type { ContinuityEvidence } from "../research/evidence.js";
import type { IslandInterpretation } from "../research/legal.js";
import type { ExperimentManifest } from "../research/manifest.js";
import { firstForkScenarioOutputs } from "./the-first-fork/outputs.js";
import { runFirstFork } from "./the-first-fork/run.js";

/** What every scenario hands to the generic research and export pipeline. */
export interface ScenarioRun {
  readonly log: readonly RecordedEvent[];
  readonly state: WorldState;
  readonly headHash: string;
  readonly analyses: { evidence: ContinuityEvidence | null; legal: readonly IslandInterpretation[] | null };
  /** Scenario-specific dataset content (merged into dataset.json). */
  readonly dataset: Record<string, unknown>;
  /** Scenario-specific report files, relative to the export directory. */
  readonly files: Record<string, string>;
}

/** Registry of reproducible scenarios, keyed by manifest `scenario`. */
export const SCENARIOS: Record<string, (m: ExperimentManifest) => Promise<ScenarioRun>> = {
  "the-first-fork": async (m) => firstForkScenarioOutputs(await runFirstFork({ seed: m.seed, abmRounds: m.parameters.abmRounds, researchBounds: m.researchBounds }), m),
};

export async function runScenario(m: ExperimentManifest): Promise<ScenarioRun> {
  const runner = SCENARIOS[m.scenario];
  if (!runner) throw new Error(`unknown scenario ${m.scenario}; known: ${Object.keys(SCENARIOS).join(", ")}`);
  return runner(m);
}
