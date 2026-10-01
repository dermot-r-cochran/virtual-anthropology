import type { ChoicePoint, Flip } from "../agents/choice.js";
import type { IslandId } from "../domain/ids.js";
import type { LawAmendment } from "../domain/law.js";
import type { WorldState } from "../domain/model.js";
import type { RecordedEvent } from "../kernel/events.js";
import type { ContinuityEvidence } from "../research/evidence.js";
import type { IslandInterpretation } from "../research/legal.js";
import type { ExperimentManifest } from "../research/manifest.js";
import { firstForkScenarioOutputs } from "./the-first-fork/outputs.js";
import { branchFirstFork, runFirstFork, type FirstForkRun } from "./the-first-fork/run.js";

/** What every scenario hands to the generic research and export pipeline. */
export interface ScenarioRun {
  readonly log: readonly RecordedEvent[];
  readonly state: WorldState;
  readonly headHash: string;
  /** The seq of the last scripted event, after which a timeline may branch; null when the scenario has no branch point. */
  readonly branchSeq: number | null;
  /** The choice points after the branch point, in order, with the option taken at each. */
  readonly choices: readonly ChoicePoint[];
  /** Flips declared for this run whose choice point never occurred. */
  readonly unusedFlips: readonly string[];
  readonly analyses: { evidence: ContinuityEvidence | null; legal: readonly IslandInterpretation[] | null };
  /** Scenario-specific dataset content (merged into dataset.json). */
  readonly dataset: Record<string, unknown>;
  /** Scenario-specific report files, relative to the export directory. */
  readonly files: Record<string, string>;
}

/** A study's variation of the base run: statutory law overridden at founding. */
export interface ScenarioVariation {
  readonly laws?: Partial<Record<IslandId, LawAmendment>>;
}

/** A study's alternate timeline: the base record to its branch point, then an epilogue with these flips taken, after this amendment if any. */
export interface ScenarioBranch {
  readonly rounds: number;
  readonly flips?: readonly Flip[];
  readonly amendment?: { readonly island: IslandId; readonly amendment: LawAmendment };
}

export interface ScenarioDriver {
  run(m: ExperimentManifest, variation?: ScenarioVariation): Promise<ScenarioRun>;
  /** Absent when the scenario has no branch point. */
  branch?(m: ExperimentManifest, branch: ScenarioBranch): Promise<ScenarioRun>;
}

const firstForkOptions = (m: ExperimentManifest, v?: ScenarioVariation) => ({
  seed: m.seed,
  abmRounds: m.parameters.abmRounds,
  researchBounds: m.researchBounds,
  researchers: m.researchers.map((r) => r.id),
  ...(v?.laws ? { laws: v.laws } : {}),
});
const firstForkBase = new Map<string, Promise<FirstForkRun>>();

/** Registry of reproducible scenarios, keyed by manifest `scenario`. */
export const SCENARIOS: Record<string, ScenarioDriver> = {
  "the-first-fork": {
    async run(m, v) {
      return firstForkScenarioOutputs(await runFirstFork(firstForkOptions(m, v)), m);
    },
    async branch(m, b) {
      const key = `${m.seed}|${m.parameters.abmRounds}`;
      let base = firstForkBase.get(key);
      if (!base) {
        base = runFirstFork(firstForkOptions(m));
        firstForkBase.set(key, base);
      }
      return firstForkScenarioOutputs(await branchFirstFork(await base, b), m);
    },
  },
};

export function scenarioDriver(m: ExperimentManifest): ScenarioDriver {
  const driver = SCENARIOS[m.scenario];
  if (!driver) throw new Error(`unknown scenario ${m.scenario}; known: ${Object.keys(SCENARIOS).join(", ")}`);
  return driver;
}

export async function runScenario(m: ExperimentManifest): Promise<ScenarioRun> {
  return scenarioDriver(m).run(m);
}
