import { scenarioDriver, type ScenarioRun } from "../scenarios/index.js";
import { ENUMERATION, fairEnumeration } from "./enumeration.js";
import { toResearchInput } from "./adapter.js";
import type { ExperimentManifest, StudyPlan } from "./manifest.js";
import { computeMetrics } from "./metric-registry.js";
import { deriveFindings, deriveObservations } from "./pipeline.js";

export type StudyGroup = "branches" | "doctrines" | "timelines";

export interface StudyRun {
  readonly id: string;
  readonly group: StudyGroup;
  /** What was varied, as declared: the flipped choice, founding law, or the timeline's flips and amendment. */
  readonly variation: Record<string, unknown>;
  /** `infeasible`: the scenario could not proceed under this variation; the reason is the scenario's own. */
  readonly status: "completed" | "infeasible";
  readonly reason: string | null;
  readonly headHash: string | null;
  readonly eventCount: number | null;
  readonly branchSeq: number | null;
  readonly metrics: Record<string, number>;
  readonly findings: readonly { hypothesisId: string; observedValue: number | null; outcome: string }[];
}

export interface StudySummaryMetric {
  readonly n: number;
  readonly min: number;
  readonly median: number;
  readonly mean: number;
  readonly max: number;
}

export interface StudyGroupSummary {
  readonly runs: number;
  readonly completed: number;
  readonly infeasible: number;
  /** Over completed runs; min, median, mean and max are the documented functions and nothing else. */
  readonly metrics: Record<string, StudySummaryMetric>;
  readonly hypotheses: Record<string, { consistent: number; inconsistent: number; undetermined: number; n: number }>;
}

export interface StudyResult {
  readonly schema: "archipelago/study/v1";
  readonly base: { headHash: string; eventCount: number; branchSeq: number | null };
  readonly plan: StudyPlan;
  /** The declared order a branch sweep takes alternatives in (see research/enumeration.ts). */
  readonly enumeration: string;
  readonly runs: readonly StudyRun[];
  readonly summary: Partial<Record<StudyGroup, StudyGroupSummary>>;
}

const r4 = (x: number) => Math.round(x * 10000) / 10000;

function measureRun(m: ExperimentManifest, run: ScenarioRun): Pick<StudyRun, "metrics" | "findings"> {
  const input = toResearchInput(run.log, run.state, run.analyses);
  const metrics = computeMetrics(input);
  const observations = deriveObservations(input, metrics, m.hypotheses);
  const findings = deriveFindings(m.hypotheses, metrics, observations);
  return {
    metrics: Object.fromEntries(metrics.map((x) => [x.metric, x.value])),
    findings: findings.map((f) => ({ hypothesisId: f.hypothesisId, observedValue: f.observedValue, outcome: f.outcome })),
  };
}

function completed(m: ExperimentManifest, id: string, group: StudyGroup, variation: Record<string, unknown>, run: ScenarioRun): StudyRun {
  return { id, group, variation: run.unusedFlips.length > 0 ? { ...variation, unusedFlips: run.unusedFlips } : variation, status: "completed", reason: null, headHash: run.headHash, eventCount: run.log.length, branchSeq: run.branchSeq, ...measureRun(m, run) };
}

function infeasible(id: string, group: StudyGroup, variation: Record<string, unknown>, error: unknown): StudyRun {
  const reason = error instanceof Error ? error.message : String(error);
  return { id, group, variation, status: "infeasible", reason, headHash: null, eventCount: null, branchSeq: null, metrics: {}, findings: [] };
}

function summarise(runs: readonly StudyRun[], hypothesisIds: readonly string[]): StudyGroupSummary {
  const done = runs.filter((r) => r.status === "completed");
  const metricIds = [...new Set(done.flatMap((r) => Object.keys(r.metrics)))].sort();
  const metrics: Record<string, StudySummaryMetric> = {};
  for (const id of metricIds) {
    const values = done.map((r) => r.metrics[id]).filter((v): v is number => typeof v === "number").sort((a, b) => a - b);
    if (values.length === 0) continue;
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 ? (values[mid] as number) : ((values[mid - 1] as number) + (values[mid] as number)) / 2;
    metrics[id] = { n: values.length, min: values[0] as number, median: r4(median), mean: r4(values.reduce((a, b) => a + b, 0) / values.length), max: values[values.length - 1] as number };
  }
  const hypotheses: StudyGroupSummary["hypotheses"] = {};
  for (const h of hypothesisIds) {
    const tally = { consistent: 0, inconsistent: 0, undetermined: 0, n: 0 };
    for (const r of done) {
      const f = r.findings.find((x) => x.hypothesisId === h);
      if (!f) continue;
      tally.n++;
      if (f.outcome === "consistent-with-hypothesis") tally.consistent++;
      else if (f.outcome === "inconsistent-with-hypothesis") tally.inconsistent++;
      else tally.undetermined++;
    }
    hypotheses[h] = tally;
  }
  return { runs: runs.length, completed: done.length, infeasible: runs.length - done.length, metrics, hypotheses };
}

/**
 * Runs the study a manifest declares against its base run. Every replication
 * is deterministic and identified by its own head hash; the whole study is
 * therefore reproducible from the manifest, and `study.json` is held to the
 * same byte-identical regeneration as every other output.
 */
export async function runStudy(m: ExperimentManifest, base: ScenarioRun): Promise<StudyResult | null> {
  const plan = m.study;
  if (!plan) return null;
  const driver = scenarioDriver(m);
  const hypothesisIds = m.hypotheses.map((h) => h.id);
  const runs: StudyRun[] = [];
  const summary: Partial<Record<StudyGroup, StudyGroupSummary>> = {};

  if (plan.branches) {
    if (!driver.branch) throw new Error(`scenario ${m.scenario} has no branch point; it cannot run branches`);
    const rounds = m.parameters.abmRounds;
    const names = Object.fromEntries(Object.values(base.state.citizens).map((c) => [c.id, c.name]));
    const group: StudyRun[] = [];
    for (const alt of fairEnumeration(base.choices, plan.branches.budget)) {
      const { point, option } = alt;
      const id = `branch-${alt.rank}`;
      const flip = { seq: point.seq, citizen: point.citizen, label: point.label, occurrence: point.occurrence, option };
      const variation = { rank: alt.rank, pass: alt.pass, enumeration: ENUMERATION, at: point.seq, citizen: names[point.citizen] ?? point.citizen, choice: point.label, from: point.options[point.chosen], to: point.options[option] };
      try {
        group.push(completed(m, id, "branches", variation, await driver.branch(m, { rounds, flips: [flip] })));
      } catch (e) {
        group.push(infeasible(id, "branches", variation, e));
      }
    }
    runs.push(...group);
    summary.branches = summarise(group, hypothesisIds);
  }

  if (plan.doctrines) {
    const group: StudyRun[] = [];
    for (const d of plan.doctrines) {
      const variation = { island: d.island, amendment: d.amendment };
      try {
        group.push(completed(m, d.id, "doctrines", variation, await driver.run(m, { laws: { [d.island]: d.amendment } })));
      } catch (e) {
        group.push(infeasible(d.id, "doctrines", variation, e));
      }
    }
    runs.push(...group);
    summary.doctrines = summarise(group, hypothesisIds);
  }

  if (plan.timelines) {
    if (!driver.branch) throw new Error(`scenario ${m.scenario} has no branch point; it cannot run timelines`);
    const group: StudyRun[] = [];
    for (const v of plan.timelines.variants) {
      const variation = { flips: v.flips ?? [], amendment: v.amendment ?? null, rounds: plan.timelines.rounds };
      try {
        group.push(completed(m, v.id, "timelines", variation, await driver.branch(m, { rounds: plan.timelines.rounds, flips: v.flips ?? [], ...(v.amendment ? { amendment: v.amendment } : {}) })));
      } catch (e) {
        group.push(infeasible(v.id, "timelines", variation, e));
      }
    }
    runs.push(...group);
    summary.timelines = summarise(group, hypothesisIds);
  }

  return { schema: "archipelago/study/v1", base: { headHash: base.headHash, eventCount: base.log.length, branchSeq: base.branchSeq }, plan, enumeration: ENUMERATION, runs, summary };
}

/** study.csv: one row per completed run and metric. */
export function studyCsv(study: StudyResult): string {
  const rows = ["group,run,status,metric,value"];
  for (const r of study.runs) {
    if (r.status !== "completed") {
      rows.push(`${r.group},${r.id},${r.status},,`);
      continue;
    }
    for (const [k, v] of Object.entries(r.metrics)) rows.push(`${r.group},${r.id},${r.status},${k},${v}`);
  }
  return rows.join("\n") + "\n";
}
