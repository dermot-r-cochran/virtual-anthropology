import { runInstitutions } from "../agents/institutions.js";
import type { AgentRuntime } from "../agents/runtime.js";
import { createRng } from "../kernel/rng.js";
import type { World } from "../kernel/world.js";
import { measure, type WorldMetrics } from "./metrics.js";

export interface AbmOptions {
  readonly rounds: number;
  readonly seed: string;
  readonly ticksPerRound: number;
}

export interface RoundMetrics extends WorldMetrics {
  readonly round: number;
  readonly activationOrder: readonly string[];
  readonly applied: number;
  readonly rejected: number;
}

/**
 * Agent-based modelling loop with seeded random activation: each round every
 * hosted agent perceives, deliberates and proposes in a shuffled order, the
 * institutions act, the clock advances, and population metrics are recorded.
 * The activation order is part of the output so runs can be audited.
 */
export async function runAgentBasedRounds(world: World, runtime: AgentRuntime, options: AbmOptions): Promise<RoundMetrics[]> {
  const out: RoundMetrics[] = [];
  for (let round = 1; round <= options.rounds; round++) {
    const rng = createRng(`${options.seed}/round-${round}`);
    const order = runtime.agentIds();
    for (let i = order.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [order[i], order[j]] = [order[j] as string, order[i] as string];
    }
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
