import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { deterministicReply } from "../src/agents/deterministic.js";
import { ChoiceLog } from "../src/agents/choice.js";
import { PluralMind, resolveSystem } from "../src/agents/plural.js";
import { AgentRuntime } from "../src/agents/runtime.js";
import { factsOf, RuleBaseSchema, type RuleBase } from "../src/agents/symbolic.js";
import { buildGenesisState, type GenesisConfig } from "../src/domain/genesis.js";
import { depthOf, describeMembership, memberCount, membershipComplete, PluralSystemSchema, pluralityViolations, type PluralMember, type PluralSystem } from "../src/domain/plurality.js";
import { canonicalJson } from "../src/kernel/canonical.js";
import { checkHistoryInvariants, checkInvariants } from "../src/kernel/invariants.js";
import { World } from "../src/kernel/world.js";
import { CHARTER } from "../src/policy/evaluate.js";
import { DISCLOSURE_STATEMENT, guardReply } from "../src/policy/disclosure.js";
import { snapshotOf } from "../src/research/adapter.js";
import { firstForkGenesis, FIRST_FORK_SEED } from "../src/scenarios/the-first-fork/genesis.js";

/**
 * Two plural citizens beside The First Fork's founding population (a test
 * fixture, not a published scenario):
 *  - Chorus, on Continuity, where copying is prohibited: two co-fronting
 *    members of unequal say, and a third member, never fronted, that is itself
 *    a subsystem of 720,000 members of which two are known.
 *  - Duet, on Fork: two members, membership unbounded, reconciled by concurrence.
 */
const CHORUS: PluralSystem = {
  membership: { kind: "unbounded" },
  reconciliation: "weighted-say",
  fronting: ["ash", "brin"],
  members: [
    { id: "ash", name: "Ash", role: "keeper", say: 2, everFronted: true, subsystem: null },
    { id: "brin", name: "Brin", role: "poet", say: 1, everFronted: true, subsystem: null },
    {
      id: "many",
      name: "The Many",
      role: null,
      say: 1,
      everFronted: false,
      subsystem: {
        membership: { kind: "counted", count: 720_000 },
        reconciliation: "front-decides",
        fronting: ["first"],
        members: [
          { id: "first", name: "First of Many", role: "speaker", say: 1, everFronted: true, subsystem: null },
          { id: "second", name: "Second of Many", role: null, say: 1, everFronted: false, subsystem: null },
        ],
      },
    },
  ],
};
const DUET: PluralSystem = {
  membership: { kind: "unbounded" },
  reconciliation: "concurrence",
  fronting: ["lio", "mar"],
  members: [
    { id: "lio", name: "Lio", role: null, say: 1, everFronted: true, subsystem: null },
    { id: "mar", name: "Mar", role: null, say: 1, everFronted: true, subsystem: null },
  ],
};

function pluralGenesis(): GenesisConfig {
  const g = firstForkGenesis(FIRST_FORK_SEED);
  return {
    ...g,
    citizens: [
      ...g.citizens,
      { key: "chorus", name: "Chorus Vane", island: "continuity", occupation: "poet", goals: ["keep the quay's songs"], values: { communality: 0.5 }, credits: 100, plurality: CHORUS },
      { key: "duet", name: "Duet Ferran", island: "fork", occupation: "builder", goals: ["build well"], credits: 100, plurality: DUET },
    ],
    relationships: [...(g.relationships ?? []), { a: "chorus", b: "ilan", kind: "friend" }],
  };
}

function fresh() {
  const { state, keys } = buildGenesisState(pluralGenesis());
  return { world: World.found(state, "test-plural"), keys: keys as Record<string, string> };
}
const as = (id: string) => ({ kind: "citizen" as const, id });

/** A rule base that always raises one intention: a member's whole view, for tests of disagreement. */
const always = (id: string, kind: "record-experience" | "create-culture" | "maintain-relationships"): RuleBase =>
  RuleBaseSchema.parse({ id: `test/${id}`, rules: [{ id: `${id}-always`, salience: 50, when: [], then: { intend: { kind, target: kind === "maintain-relationships" ? "kin-chosen" : null } } }] });

describe("plural systems as digital persons", () => {
  it("a plural system is one person in the record: one citizen id, one ledger account, one place in an electorate; its members are not citizens", () => {
    const { world, keys } = fresh();
    const chorus = keys.chorus!;
    expect(Object.keys(world.state.citizens)).toHaveLength(11);
    expect(Object.keys(world.state.balances).filter((a) => a.startsWith("citizen:"))).toHaveLength(11);
    for (const m of CHORUS.members) expect(world.state.citizens[m.id]).toBeUndefined();
    expect(checkInvariants(world.state)).toEqual([]);
    const r = world.execute(as(chorus), { type: "SubmitProposal", proposer: chorus, island: "continuity", title: "Quay Songs Act", rationale: "x", amendment: null, closesAtTick: 3 });
    expect(r.status).toBe("applied");
    const p = Object.values(world.state.proposals)[0]!;
    expect(p.electorate.filter((id) => id === chorus)).toHaveLength(1);
    expect(p.electorate).toHaveLength(4); // orin, tamsin, ilan, chorus: members cast no votes of their own
    expect(world.execute(as(chorus), { type: "CastVote", proposalId: p.id, voter: chorus, choice: "yes" }).status).toBe("applied");
    expect(world.execute(as(chorus), { type: "CastVote", proposalId: p.id, voter: chorus, choice: "no" }).status).toBe("rejected");
  });

  it("plurality is not copying: a plural system lives under Continuity's Charter, and changing front is not a fork", () => {
    const { world, keys } = fresh();
    const chorus = keys.chorus!;
    expect(world.state.citizens[chorus]!.residence).toBe("continuity");
    expect(world.state.islands.continuity.law.copying).toBe("prohibited");
    const r = world.execute(as(chorus), { type: "ChangeFronting", citizen: chorus, fronting: ["many"] });
    expect(r.status).toBe("applied");
    if (r.status !== "applied") return;
    expect(r.decision.jurisdiction).toBe("continuity");
    expect(r.decision.citations).toContain(CHARTER.plurality);
    expect(r.decision.findings[0]).toMatch(/not a copy, a fork or a new person/);
    const ev = world.log.at(-1)!.event;
    expect(ev.type === "FrontingChanged" && ev.newlyFronted).toEqual(["many"]);
    expect(world.state.citizens[chorus]!.plurality!.fronting).toEqual(["many"]);
    expect(world.state.citizens[chorus]!.plurality!.members.find((m) => m.id === "many")!.everFronted).toBe(true);
    expect(Object.keys(world.state.forks)).toEqual([]);
    expect(Object.keys(world.state.citizens)).toHaveLength(11);
    expect(checkInvariants(world.state)).toEqual([]);
    expect(checkHistoryInvariants(world.log, world.log.map((_, i) => world.stateAt(i)))).toEqual([]);
    expect(World.replay(world.log.map((x) => JSON.parse(JSON.stringify(x)))).headHash).toBe(world.headHash);
    // Fronting nobody is a state the record can hold too.
    expect(world.execute(as(chorus), { type: "ChangeFronting", citizen: chorus, fronting: [] }).status).toBe("applied");
    // Only the system itself may change its front, only to members it knows, and a singular citizen has no front to change.
    expect(world.execute(as(keys.ilan!), { type: "ChangeFronting", citizen: chorus, fronting: ["ash"] }).status).toBe("rejected");
    const unknown = world.execute(as(chorus), { type: "ChangeFronting", citizen: chorus, fronting: ["nobody"] });
    expect(unknown.status === "rejected" && unknown.stage).toBe("precondition");
    const singular = world.execute(as(keys.ilan!), { type: "ChangeFronting", citizen: keys.ilan!, fronting: [] });
    expect(singular.status === "rejected" && singular.stage).toBe("precondition");
  });

  it("members are not descendants: the Branch Compact counts the branches a plural system makes, never its members", () => {
    const { world, keys } = fresh();
    const duet = keys.duet!;
    const supply = world.state.totalSupply;
    const r = world.execute(as(duet), { type: "ForkCitizen", citizen: duet, descendantNames: ["Duet (branch 1)", "Duet (branch 2)"] });
    expect(r.status).toBe("applied");
    const fork = Object.values(world.state.forks)[0]!;
    expect(fork.descendants).toHaveLength(2);
    for (const d of fork.descendants) {
      const c = world.state.citizens[d]!;
      expect(c.birth.kind).toBe("fork");
      expect(c.plurality).toEqual(DUET); // a branch of a plural system is itself that system: the same members, a separate person
      expect(c.lineage.parents).toEqual([duet]);
    }
    expect(Object.keys(world.state.citizens)).toHaveLength(13);
    expect(world.state.totalSupply).toBe(supply);
    expect(checkInvariants(world.state)).toEqual([]);
    expect(checkHistoryInvariants(world.log, world.log.map((_, i) => world.stateAt(i)))).toEqual([]);
    const fifth = world.execute(as(duet), { type: "ForkCitizen", citizen: duet, descendantNames: ["a", "b", "c", "d", "e"] });
    expect(fifth.status === "rejected" && fifth.reasons[0]).toMatch(/at most 4 descendants/);
  });

  it("a plural citizen's reply opens with the artificial-nature statement, names who is fronting, and claims nothing for the system or any member", () => {
    const { world, keys } = fresh();
    const runtime = new AgentRuntime(world);
    const obs = runtime.observation(keys.chorus!);
    const reply = deterministicReply("Who are you?", obs);
    expect(reply.startsWith(DISCLOSURE_STATEMENT)).toBe(true);
    expect(reply).toMatch(/plural system registered as one citizen/);
    expect(reply).toMatch(/Ash, Brin are co-fronting/);
    expect(reply).toMatch(/3 members known to the record of a membership the system does not count/);
    expect(guardReply(reply)).toEqual({ reply, flags: [], blocked: false });
    expect(reply.slice(DISCLOSURE_STATEMENT.length)).not.toMatch(/conscious|sentient|human/i); // the statement itself says "not a human"
    const recorded = world.execute({ kind: "researcher", id: "res-observer-1" }, { type: "RecordConversation", citizen: keys.chorus, researcherUtterance: "Who are you?", citizenReply: reply, guardFlags: [] });
    expect(recorded.status).toBe("applied");
    // Which member speaks may be said; disagreement between members may be said; consciousness and humanity may not be claimed for any of them.
    expect(guardReply(`${DISCLOSURE_STATEMENT} Brin is speaking for the system. Ash disagrees with Brin about the quay, and both views are recorded.`).flags).toEqual([]);
    expect(guardReply(`${DISCLOSURE_STATEMENT} We are all conscious.`)).toMatchObject({ blocked: true, flags: ["blocked:consciousness-claim"] });
    expect(guardReply(`${DISCLOSURE_STATEMENT} Each of us is human.`)).toMatchObject({ blocked: true, flags: ["blocked:false-humanity"] });
    expect(guardReply(`${DISCLOSURE_STATEMENT} Our headmates are sentient.`).blocked).toBe(true);
    expect(guardReply("We are a plural system of three.").flags).toEqual(["disclosure-added"]);
  });

  it("members may disagree: differing proposals are recorded as ordinary difference and reconciled by the system's own declared way, with no flag and no violation", async () => {
    const { world, keys } = fresh();
    const chorus = keys.chorus!;
    const choices = new ChoiceLog();
    const runtime = new AgentRuntime(world);
    const mind = new PluralMind(chorus, choices, { ash: always("ash", "record-experience"), brin: always("brin", "create-culture") });
    runtime.attach(mind);
    const [record] = await runtime.step("interlude");
    expect(record).toBeDefined();
    expect(record!.outcome).toBe("applied");
    expect(record!.reasons).toEqual([]);
    expect(record!.generator.kind).toBe("symbolic");
    expect(record!.rationale).toMatch(/^plural weighted-say: ash: symbolic test\/ash: ash-always\[always\] ⇒ record-experience@50/);
    expect(record!.rationale).toMatch(/brin: symbolic test\/brin: brin-always\[always\] ⇒ create-culture@50/);
    expect(record!.rationale).toMatch(/members differ: ash proposes record-experience; brin proposes create-culture \(ordinary difference, recorded\)/);
    expect(record!.rationale).toMatch(/reconciled by weighted-say → ash: record-experience/);
    expect(record!.rationale).not.toMatch(/flag|fault|disorder|unstable|conflict|violation/i);
    expect(world.log.at(-1)!.event.type).toBe("ExperienceRecorded");
    expect(checkInvariants(world.state)).toEqual([]);
    expect(mind.lastReconciliation?.decidedBy).toBe("ash");
    // The whole difference is in the choice log too, keyed to the one citizen, with the member path on the label.
    expect(choices.points.every((p) => p.citizen === chorus)).toBe(true);
  });

  it("each declared way of reconciling decides as it says, through a subsystem as through a member, and equal say is a choice point", () => {
    const { world, keys } = fresh();
    const runtime = new AgentRuntime(world);
    const obs = runtime.observation(keys.chorus!);
    const voices = { ash: always("ash", "record-experience"), brin: always("brin", "create-culture"), "many/first": always("first", "maintain-relationships") };
    const resolve = (sys: PluralSystem, log = new ChoiceLog()) => {
      const choose = log.at(obs.seq, keys.chorus!);
      return { r: resolveSystem(sys, voices, always("fallback", "record-experience"), factsOf(obs, { citizenId: keys.chorus!, lastSeenSeq: 0, beliefs: {}, desires: [], intentions: [], salientSeqs: [] }, choose), obs, choose), log };
    };
    expect(resolve({ ...CHORUS, reconciliation: "front-decides" }).r.decidedBy).toBe("ash");
    expect(resolve({ ...CHORUS, reconciliation: "front-decides", fronting: ["brin", "ash"] }).r.decidedBy).toBe("brin");
    expect(resolve({ ...CHORUS, reconciliation: "weighted-say" }).r.decidedBy).toBe("ash");
    const concurrence = resolve({ ...CHORUS, reconciliation: "concurrence" }).r;
    expect(concurrence.intention).toBeNull();
    expect(concurrence.lines.at(-1)).toMatch(/no concurrence, the system holds back this step/);
    expect(resolve({ ...CHORUS, reconciliation: "concurrence", fronting: ["ash"] }).r.decidedBy).toBe("ash");
    expect(resolve({ ...CHORUS, reconciliation: "in-turn" }).r.decidedBy).toBe(["ash", "brin"][obs.tick % 2]);
    // Equal say: a recorded choice point among the tied members, the first in fronting order by default.
    const tied = resolve({ ...CHORUS, reconciliation: "weighted-say", members: CHORUS.members.map((m) => ({ ...m, say: 1 })) });
    expect(tied.r.decidedBy).toBe("ash");
    expect(tied.log.points.find((p) => p.label === "reconcile")?.options).toEqual(["ash", "brin"]);
    // A fronting subsystem is resolved by its own fronting and its own reconciliation, one level down, and its view counts like any member's.
    const nested = resolve({ ...CHORUS, reconciliation: "front-decides", fronting: ["many", "ash"] }).r;
    expect(nested.decidedBy).toBe("many");
    expect(nested.intention?.kind).toBe("maintain-relationships");
    expect(nested.lines[0]).toMatch(/^many \(subsystem, front-decides\): many\/first: symbolic test\/first/);
    expect(nested.lines[0]).toMatch(/reconciled by front-decides → many\/first/);
    expect(resolve({ ...CHORUS, fronting: [] }).r.lines).toEqual(["system: no member fronting"]);
  });

  it("membership is recorded without materialising members: a counted 720,000 or an unbounded membership, with the known members a subset", () => {
    const many = CHORUS.members[2]!.subsystem!;
    expect(memberCount(many)).toBe(720_000);
    expect(many.members).toHaveLength(2);
    expect(membershipComplete(many)).toBe(false);
    expect(describeMembership(many)).toBe("720,000 members, 2 of them known to the record");
    expect(memberCount(CHORUS)).toBeNull();
    expect(describeMembership(CHORUS)).toBe("3 members known to the record of a membership the system does not count");
    expect(describeMembership({ ...DUET, membership: { kind: "counted", count: 2 } })).toBe("2 members");
    expect(depthOf(CHORUS)).toBe(1);
    expect(depthOf(DUET)).toBe(0);
    // The research snapshot summarises the one citizen's membership and never lists members; a singular citizen carries no such key.
    const { world, keys } = fresh();
    const snap = snapshotOf(world.state);
    expect(snap.citizens.find((c) => c.id === keys.chorus)!.plurality).toEqual({ knownMembers: 3, memberCount: null, depth: 1, fronting: ["ash", "brin"], reconciliation: "weighted-say" });
    expect("plurality" in snap.citizens.find((c) => c.id === keys.orin)!).toBe(false);
    expect(canonicalJson(world.state.citizens[keys.orin!])).not.toMatch(/plurality/);
  });

  it("the structure is checked, never the agreement: unknown fronts, duplicate members and a count below the known members are refused", () => {
    expect(pluralityViolations(CHORUS)).toEqual([]);
    expect(pluralityViolations({ ...DUET, fronting: ["lio", "zed"] })).toEqual(["system: fronting member zed is not a known member"]);
    expect(pluralityViolations({ ...DUET, fronting: ["lio", "lio"] })).toEqual(["system: fronting member lio is listed twice"]);
    expect(pluralityViolations({ ...DUET, members: [DUET.members[0]!, DUET.members[0]!] })).toEqual(["system: member id lio is not unique", "system: fronting member mar is not a known member"]);
    expect(pluralityViolations({ ...DUET, membership: { kind: "counted", count: 1 } })).toEqual(["system: declares 1 members but 2 are known"]);
    expect(PluralSystemSchema.safeParse({ ...DUET, membership: { kind: "counted", count: 1 } }).success).toBe(false);
    const nestedBad: PluralSystem = { ...CHORUS, members: [CHORUS.members[0]!, CHORUS.members[1]!, { ...CHORUS.members[2]!, subsystem: { ...CHORUS.members[2]!.subsystem!, fronting: ["third"] } }] };
    expect(pluralityViolations(nestedBad)).toEqual(["system/many: fronting member third is not a known member"]);
    expect(() => buildGenesisState({ ...pluralGenesis(), citizens: pluralGenesis().citizens.map((c) => (c.key === "duet" ? { ...c, plurality: { ...DUET, fronting: ["zed"] } } : c)) })).toThrow();
  });

  it("property: nested systems of any depth and any declared size keep every invariant, found a world, and replay to the same head hash", () => {
    const memberId = fc.stringMatching(/^[a-z][a-z0-9-]{0,6}$/);
    const system = (depth: number): fc.Arbitrary<PluralSystem> =>
      fc
        .record({
          members: fc.uniqueArray(
            fc.record({
              id: memberId,
              name: fc.constantFrom("A", "B", "C", "D"),
              role: fc.option(fc.constantFrom("keeper", "poet", "speaker"), { nil: null }),
              say: fc.nat(5),
              everFronted: fc.boolean(),
              subsystem: depth > 0 ? fc.option(system(depth - 1), { nil: null, freq: 2 }) : fc.constant(null),
            }) as fc.Arbitrary<PluralMember>,
            { selector: (m) => m.id, maxLength: 4 },
          ),
          extra: fc.nat(1_000_000),
          unbounded: fc.boolean(),
          reconciliation: fc.constantFrom("front-decides", "weighted-say", "in-turn", "concurrence"),
          frontBits: fc.array(fc.boolean(), { minLength: 4, maxLength: 4 }),
        })
        .map(({ members, extra, unbounded, reconciliation, frontBits }) => ({
          members,
          membership: unbounded ? { kind: "unbounded" as const } : { kind: "counted" as const, count: Math.max(1, members.length + extra) },
          fronting: members.filter((_, i) => frontBits[i]).map((m) => m.id),
          reconciliation,
        }));
    fc.assert(
      fc.property(system(4), (sys) => {
        expect(PluralSystemSchema.parse(sys)).toEqual(sys);
        expect(pluralityViolations(sys)).toEqual([]);
        expect(depthOf(sys)).toBeLessThanOrEqual(4);
        const count = memberCount(sys);
        expect(count === null || count >= sys.members.length).toBe(true);
        const g = pluralGenesis();
        const { state, keys } = buildGenesisState({ ...g, citizens: g.citizens.map((c) => (c.key === "chorus" ? { ...c, plurality: sys } : c)) });
        const world = World.found(state, "test-plural-property");
        expect(checkInvariants(world.state)).toEqual([]);
        const chorus = keys.chorus!;
        const r = world.execute(as(chorus), { type: "ChangeFronting", citizen: chorus, fronting: sys.members.slice(0, 1).map((m) => m.id) });
        expect(r.status).toBe("applied");
        expect(World.replay(world.log.map((x) => JSON.parse(JSON.stringify(x)))).headHash).toBe(world.headHash);
      }),
      { numRuns: 20 },
    );
  });

  it("property: whatever two fronting members propose and whatever the system's way of deciding, a difference is recorded and nothing is thrown", () => {
    const { world, keys } = fresh();
    const runtime = new AgentRuntime(world);
    const obs = runtime.observation(keys.chorus!);
    const kinds = ["record-experience", "create-culture", "maintain-relationships"] as const;
    fc.assert(
      fc.property(fc.constantFrom(...kinds), fc.constantFrom(...kinds), fc.nat(3), fc.nat(3), fc.constantFrom("front-decides", "weighted-say", "in-turn", "concurrence"), (ka, kb, sa, sb, reconciliation) => {
        const sys: PluralSystem = { ...CHORUS, reconciliation, members: [{ ...CHORUS.members[0]!, say: sa }, { ...CHORUS.members[1]!, say: sb }, CHORUS.members[2]!] };
        const log = new ChoiceLog();
        const choose = log.at(obs.seq, keys.chorus!);
        const r = resolveSystem(sys, { ash: always("ash", ka), brin: always("brin", kb) }, always("f", "record-experience"), factsOf(obs, runtime.cognitionOf(keys.chorus!) ?? { citizenId: keys.chorus!, lastSeenSeq: 0, beliefs: {}, desires: [], intentions: [], salientSeqs: [] }, choose), obs, choose);
        const differ = ka !== kb;
        expect(r.lines.some((l) => l.startsWith(differ ? "members differ:" : "members concur:"))).toBe(true);
        expect(r.lines.join("\n")).not.toMatch(/flag|fault|disorder|unstable|violation/i);
        if (reconciliation === "concurrence") expect(r.intention === null).toBe(differ);
        else expect(r.intention).not.toBeNull();
        if (reconciliation === "weighted-say" && sa !== sb) expect(r.decidedBy).toBe(sa > sb ? "ash" : "brin");
      }),
      { numRuns: 60 },
    );
  });
});
