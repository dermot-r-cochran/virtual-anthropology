import type { World, ExecutionResult } from "../kernel/world.js";

/**
 * Deterministic institutional processes run by system actors: island registries
 * review migration petitions under their law, and the clock closes proposals
 * whose voting period has ended. Order is by identifier for reproducibility.
 */
export function runInstitutions(world: World): ExecutionResult[] {
  const results: ExecutionResult[] = [];
  const petitions = Object.values(world.state.petitions)
    .filter((p) => p.status === "pending")
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const p of petitions) {
    for (const side of ["exit", "entry"] as const) {
      const current = world.state.petitions[p.id];
      if (!current || current.status !== "pending" || current[side] !== null) continue;
      const island = side === "exit" ? p.from : p.to;
      results.push(world.execute({ kind: "system", id: `registry:${island}` }, { type: "ReviewPetition", petitionId: p.id, side }));
    }
  }
  const due = Object.values(world.state.proposals)
    .filter((p) => p.status === "open" && world.state.tick >= p.closesAtTick)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const p of due) results.push(world.execute({ kind: "system", id: "clock" }, { type: "CloseProposal", proposalId: p.id }));
  return results;
}
