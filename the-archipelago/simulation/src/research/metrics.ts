import { ISLAND_IDS, type IslandId } from "../domain/ids.js";
import { LIFECYCLE_STATES, type LifecycleState } from "../domain/lifecycle.js";
import type { WorldState } from "../domain/model.js";

export interface WorldMetrics {
  readonly seq: number;
  readonly tick: number;
  readonly citizens: number;
  readonly residents: Record<IslandId, number>;
  readonly lifecycle: Record<LifecycleState, number>;
  readonly memories: Record<string, number>;
  readonly activeRelationships: number;
  readonly artefacts: number;
  readonly institutions: number;
  readonly openProposals: number;
  readonly forks: number;
  readonly continuityClaims: number;
  /** Gini coefficient of citizen credit balances (0 = equal). */
  readonly creditGini: number;
  readonly meanReputation: number;
}

const round4 = (x: number) => Math.round(x * 10000) / 10000;

export function gini(values: readonly number[]): number {
  const xs = [...values].sort((a, b) => a - b);
  const n = xs.length;
  const total = xs.reduce((a, b) => a + b, 0);
  if (n === 0 || total === 0) return 0;
  let weighted = 0;
  xs.forEach((x, i) => (weighted += (i + 1) * x));
  return round4((2 * weighted) / (n * total) - (n + 1) / n);
}

/** Population-level metrics of a world state; a pure function. */
export function measure(s: WorldState): WorldMetrics {
  const citizens = Object.values(s.citizens);
  const residents = Object.fromEntries(ISLAND_IDS.map((i) => [i, 0])) as Record<IslandId, number>;
  const lifecycle = Object.fromEntries(LIFECYCLE_STATES.map((l) => [l, 0])) as Record<LifecycleState, number>;
  for (const c of citizens) {
    lifecycle[c.lifecycle] += 1;
    if (c.lifecycle !== "irreversibly-deleted" && c.lifecycle !== "identity-discontinuous") residents[c.residence] += 1;
  }
  const memories: Record<string, number> = {};
  for (const m of Object.values(s.memories)) memories[m.status] = (memories[m.status] ?? 0) + 1;
  return {
    seq: s.seq,
    tick: s.tick,
    citizens: citizens.length,
    residents,
    lifecycle,
    memories,
    activeRelationships: Object.values(s.relationships).filter((r) => r.status === "active").length,
    artefacts: Object.keys(s.artefacts).length,
    institutions: Object.keys(s.institutions).length,
    openProposals: Object.values(s.proposals).filter((p) => p.status === "open").length,
    forks: Object.keys(s.forks).length,
    continuityClaims: s.claims.length,
    creditGini: gini(citizens.map((c) => s.balances[`citizen:${c.id}`] ?? 0)),
    meanReputation: citizens.length === 0 ? 0 : round4(citizens.reduce((a, c) => a + c.reputation, 0) / citizens.length),
  };
}
