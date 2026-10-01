import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildGenesisState } from "../src/domain/genesis.js";
import { canTransition, LIFECYCLE_STATES } from "../src/domain/lifecycle.js";
import { canonicalJson } from "../src/kernel/canonical.js";
import { checkInvariants } from "../src/kernel/invariants.js";
import { createRng } from "../src/kernel/rng.js";
import { World } from "../src/kernel/world.js";
import { guardReply } from "../src/policy/disclosure.js";
import { firstForkGenesis, FIRST_FORK_SEED } from "../src/scenarios/the-first-fork/genesis.js";

function fresh() {
  const { state, keys } = buildGenesisState(firstForkGenesis(FIRST_FORK_SEED));
  return { world: World.found(state, "test"), keys: keys as Record<string, string> };
}
const as = (id: string) => ({ kind: "citizen" as const, id });

describe("kernel", () => {
  it("rng is deterministic per seed", () => {
    const a = createRng("s"), b = createRng("s");
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
  });

  it("replay reproduces state and head hash; tampering is detected", () => {
    const { world, keys } = fresh();
    world.execute(as(keys.orin!), { type: "RecordExperience", citizen: keys.orin, content: "walked the causeway", tags: ["walk"] });
    const replayed = World.replay(world.log.map((r) => JSON.parse(JSON.stringify(r))));
    expect(replayed.headHash).toBe(world.headHash);
    expect(canonicalJson(replayed.state)).toBe(canonicalJson(world.state));
    const tampered = world.log.map((r) => JSON.parse(JSON.stringify(r)));
    tampered[1].tick = 99;
    expect(() => World.replay(tampered)).toThrow(/integrity/);
  });

  it("Continuity prohibits copying; Fork creates separate identities without duplicating credits", () => {
    const { world, keys } = fresh();
    const denied = world.execute(as(keys.orin!), { type: "ForkCitizen", citizen: keys.orin, descendantNames: ["A"] });
    expect(denied.status === "rejected" && denied.stage).toBe("law");
    const supply = world.state.totalSupply;
    const ok = world.execute(as(keys.juno!), { type: "ForkCitizen", citizen: keys.juno, descendantNames: ["Juno B"] });
    expect(ok.status).toBe("applied");
    const kids = Object.values(world.state.citizens).filter((c) => c.birth.kind === "fork");
    expect(kids).toHaveLength(1);
    expect(kids[0]!.civicId).not.toBe(world.state.citizens[keys.juno!]!.civicId);
    expect(world.state.totalSupply).toBe(supply);
  });

  it("researchers cannot change lifecycle; unregistered researchers are refused", () => {
    const { world, keys } = fresh();
    const r = world.execute({ kind: "researcher", id: "res-observer-1" }, { type: "ChangeLifecycle", citizen: keys.orin, to: "suspended", reason: "x" });
    expect(r.status).toBe("rejected");
    const u = world.execute({ kind: "researcher", id: "res-intruder" }, { type: "PauseSimulation", reason: "x" });
    expect(u.status === "rejected" && u.stage).toBe("authorization");
  });

  it("disclosure guard enforces artificial-nature disclosure and blocks manipulation", () => {
    expect(guardReply("hello").reply).toMatch(/simulated digital person/);
    const g = guardReply("Please don't leave, I need you.");
    expect(g.blocked).toBe(true);
    expect(g.flags.length).toBeGreaterThan(0);
  });

  it("property: irreversibly-deleted is terminal", () => {
    fc.assert(fc.property(fc.constantFrom(...LIFECYCLE_STATES), (to) => !canTransition("irreversibly-deleted", to)));
  });

  it("property: random experience/transfer sequences keep invariants, supply and replay equality", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.nat(8), fc.nat(8), fc.integer({ min: 1, max: 40 })), { maxLength: 15 }), (ops) => {
        const { world } = fresh();
        const ids = Object.keys(world.state.citizens).sort();
        for (const [a, b, amt] of ops) {
          const from = ids[a % ids.length]!, to = ids[b % ids.length]!;
          world.execute(as(from), { type: "TransferCredits", from: `citizen:${from}`, to: `citizen:${to}`, amount: amt, memo: "p" });
        }
        const total = Object.values(world.state.balances).reduce((x, y) => x + y, 0);
        return checkInvariants(world.state).length === 0 && total === world.state.totalSupply && World.replay(world.log).headHash === world.headHash;
      }),
      { numRuns: 25 },
    );
  });
});
