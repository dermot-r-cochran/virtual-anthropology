import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildGenesisState } from "../src/domain/genesis.js";
import { canTransition, LIFECYCLE_STATES } from "../src/domain/lifecycle.js";
import { canonicalJson } from "../src/kernel/canonical.js";
import { checkInvariants } from "../src/kernel/invariants.js";
import { ChoiceLog } from "../src/agents/choice.js";
import { World } from "../src/kernel/world.js";
import { guardReply } from "../src/policy/disclosure.js";
import { firstForkGenesis, FIRST_FORK_SEED } from "../src/scenarios/the-first-fork/genesis.js";
import { branchFirstFork, runFirstFork } from "../src/scenarios/the-first-fork/run.js";

function fresh() {
  const { state, keys } = buildGenesisState(firstForkGenesis(FIRST_FORK_SEED));
  return { world: World.found(state, "test"), keys: keys as Record<string, string> };
}
const as = (id: string) => ({ kind: "citizen" as const, id });

describe("kernel", () => {
  it("a choice log takes the first option by default, applies a flip at its exact point, counts occurrences and reports moot flips", () => {
    const plain = new ChoiceLog();
    expect(plain.choose(5, "cit-0001", "place", ["quay", "garden", "stacks"], String)).toBe("quay");
    expect(plain.choose(5, "cit-0001", "place", ["quay", "garden"], String)).toBe("quay");
    expect(plain.points.map((p) => p.occurrence)).toEqual([0, 1]);
    const flipped = new ChoiceLog([{ seq: 5, citizen: "cit-0001", label: "place", occurrence: 1, option: 1 }, { seq: 9, citizen: "cit-0002", label: "kin", option: 0 }]);
    expect(flipped.choose(5, "cit-0001", "place", ["quay", "garden", "stacks"], String)).toBe("quay");
    expect(flipped.choose(5, "cit-0001", "place", ["quay", "garden"], String)).toBe("garden");
    expect(flipped.points[1]?.chosen).toBe(1);
    expect(flipped.unusedFlips()).toEqual(["9:cit-0002:kin#0"]);
    expect(() => new ChoiceLog([{ seq: 1, citizen: "c", label: "x", option: 3 }]).choose(1, "c", "x", ["a", "b"], String)).toThrow(/not one of 2/);
    expect(() => plain.choose(1, "c", "x", [], String)).toThrow(/no options/);
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

  it("a study-declared amendment is enacted only by the system actor `study`, and only as a valid law", () => {
    const { world, keys } = fresh();
    const version = world.state.islands.fork.law.version;
    const ok = world.execute({ kind: "system", id: "study" }, { type: "EnactAmendment", island: "fork", amendment: { immigration: "closed" } });
    expect(ok.status).toBe("applied");
    expect(world.state.islands.fork.law.immigration).toBe("closed");
    expect(world.state.islands.fork.law.version).toBe(version + 1);
    expect(world.log[world.log.length - 1]?.event.type).toBe("LawEnacted");
    const citizen = world.execute(as(keys.juno!), { type: "EnactAmendment", island: "fork", amendment: { immigration: "open" } });
    expect(citizen.status === "rejected" && citizen.stage).toBe("authorization");
    const clock = world.execute({ kind: "system", id: "clock" }, { type: "EnactAmendment", island: "fork", amendment: { immigration: "open" } });
    expect(clock.status === "rejected" && clock.stage).toBe("authorization");
    const empty = world.execute({ kind: "system", id: "study" }, { type: "EnactAmendment", island: "fork", amendment: {} });
    expect(empty.status).toBe("rejected");
  });

  it("each island's founding counting rule follows its doctrine", () => {
    const { world } = fresh();
    expect(Object.fromEntries(Object.values(world.state.islands).map((i) => [i.law.island, i.law.countingRule]))).toEqual({
      continuity: "majority-of-electorate",
      fork: "majority-of-votes-cast",
      mnemosyne: "majority-of-votes-cast",
      concord: "consensus",
    });
  });

  it("the counting rule is island law: the same tally carries or fails by the rule in force", () => {
    const outcomeUnder = (rule: "majority-of-votes-cast" | "majority-of-electorate" | "consensus", votes: Record<string, "yes" | "no" | "abstain">) => {
      const { world, keys } = fresh();
      const r = world.execute({ kind: "system", id: "study" }, { type: "EnactAmendment", island: "fork", amendment: { countingRule: rule } });
      expect(r.status).toBe("applied");
      const submitted = world.execute(as(keys.juno!), { type: "SubmitProposal", proposer: keys.juno, island: "fork", title: "Test Act", rationale: "x", amendment: null, closesAtTick: 1 });
      expect(submitted.status).toBe("applied");
      const p = Object.values(world.state.proposals)[0]!;
      expect(p.electorate).toEqual([keys.juno, keys.pell].sort());
      for (const [k, choice] of Object.entries(votes)) expect(world.execute(as(keys[k]!), { type: "CastVote", proposalId: p.id, voter: keys[k], choice }).status).toBe("applied");
      world.execute({ kind: "system", id: "clock" }, { type: "AdvanceTime", ticks: 1 });
      const closed = world.execute({ kind: "system", id: "clock" }, { type: "CloseProposal", proposalId: p.id });
      expect(closed.status).toBe("applied");
      const ev = world.log[world.log.length - 1]!.event;
      expect(ev.type === "ProposalClosed" && ev.countingRule).toBe(rule);
      return world.state.proposals[p.id]!.status;
    };
    // one yes, one abstention: carried by votes cast, not by the electorate, carried by consensus
    expect(outcomeUnder("majority-of-votes-cast", { juno: "yes", pell: "abstain" })).toBe("adopted");
    expect(outcomeUnder("majority-of-electorate", { juno: "yes", pell: "abstain" })).toBe("rejected");
    expect(outcomeUnder("consensus", { juno: "yes", pell: "abstain" })).toBe("adopted");
    // a tie fails under every rule
    expect(outcomeUnder("majority-of-votes-cast", { juno: "yes", pell: "no" })).toBe("rejected");
    expect(outcomeUnder("majority-of-electorate", { juno: "yes", pell: "no" })).toBe("rejected");
    expect(outcomeUnder("consensus", { juno: "yes", pell: "no" })).toBe("rejected");
    // consensus needs at least one yes
    expect(outcomeUnder("consensus", { juno: "abstain", pell: "abstain" })).toBe("rejected");
  });

  it("founding law can be overridden on statutory fields only (a doctrine variant)", () => {
    const { state } = buildGenesisState({ ...firstForkGenesis(FIRST_FORK_SEED), laws: { mnemosyne: { importedMemoryIntegration: "prohibited" } } });
    expect(state.islands.mnemosyne.law.importedMemoryIntegration).toBe("prohibited");
    expect(state.islands.mnemosyne.lawHistory[0]?.importedMemoryIntegration).toBe("prohibited");
    expect(state.islands.fork.law.importedMemoryIntegration).toBe("explicit-act");
    expect(() => buildGenesisState({ ...firstForkGenesis(FIRST_FORK_SEED), laws: { continuity: { copying: "permitted" } as never } })).toThrow();
  });

  it("a timeline branched at the epilogue with no flips reproduces the base run exactly; a flip or an amendment diverges", async () => {
    const base = await runFirstFork({ abmRounds: 2 });
    expect(base.choices.length).toBeGreaterThan(0);
    expect(base.choices.every((p) => p.seq >= base.branchSeq && p.chosen === 0)).toBe(true);
    const control = await branchFirstFork(base, { rounds: 2 });
    expect(control.world.headHash).toBe(base.world.headHash);
    expect(control.world.log.length).toBe(base.world.log.length);
    expect(control.choices).toEqual(base.choices);
    const point = base.choices.find((p) => p.options.length > 1)!;
    const other = await branchFirstFork(base, { rounds: 2, flips: [{ seq: point.seq, citizen: point.citizen, label: point.label, occurrence: point.occurrence, option: 1 }] });
    expect(other.world.log.slice(0, point.seq + 1).map((r) => r.hash)).toEqual(base.world.log.slice(0, point.seq + 1).map((r) => r.hash));
    expect(other.world.headHash).not.toBe(base.world.headHash);
    expect(other.choices.find((p) => p.seq === point.seq && p.citizen === point.citizen && p.label === point.label)?.chosen).toBe(1);
    expect(other.unusedFlips).toEqual([]);
    const moot = await branchFirstFork(base, { rounds: 2, flips: [{ seq: 9999, citizen: "pell", label: "place", option: 1 }] });
    expect(moot.world.headHash).toBe(base.world.headHash);
    expect(moot.unusedFlips).toHaveLength(1);
    const amended = await branchFirstFork(base, { rounds: 2, amendment: { island: "fork", amendment: { immigration: "closed" } } });
    expect(amended.world.log[base.branchSeq + 1]?.event.type).toBe("LawEnacted");
    expect(amended.world.state.islands.fork.law.immigration).toBe("closed");
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
