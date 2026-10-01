import { runInstitutions } from "../agents/institutions.js";
import type { AgentRuntime } from "../agents/runtime.js";
import type { World } from "../kernel/world.js";
import { measure, type WorldMetrics } from "./metrics.js";

export interface AbmOptions {
  readonly rounds: number;
  readonly ticksPerRound: number;
}

export interface RoundMetrics extends WorldMetrics {
  readonly round: number;
  readonly activationOrder: readonly string[];
  readonly applied: number;
  readonly rejected: number;
}

/**
 * Agent-based modelling loop: each round every hosted agent perceives,
 * deliberates and proposes in identifier order, the institutions act, the
 * clock advances, and population metrics are recorded. The order is a fixed
 * convention, not a draw; what a mind chooses within its turn is a recorded
 * choice point a study may branch on. The order is still part of the output.
 */
export async function runAgentBasedRounds(world: World, runtime: AgentRuntime, options: AbmOptions): Promise<RoundMetrics[]> {
  const out: RoundMetrics[] = [];
  for (let round = 1; round <= options.rounds; round++) {
    const order = runtime.agentIds();
    let applied = 0;
    let rejected = 0;
    for (const id of order) {
      for (const r of await runtime.stepAgent("interlude", id)) r.outcome === "applied" ? applied++ : rejected++;
    }
    runInstitutions(world);
    world.execute({ kind: "system", id: "clock" }, { type: "AdvanceTime", ticks: options.ticksPerRound });
    out.push({ round, activationOrder: order, applied, rejected, ...measure(world.state) });
  }
  return out;
}
