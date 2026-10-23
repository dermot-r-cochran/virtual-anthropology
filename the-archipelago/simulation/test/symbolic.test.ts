import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ChoiceLog } from "../src/agents/choice.js";
import { AgentRuntime } from "../src/agents/runtime.js";
import { chain, CIVIC_RULES, factsOf, RuleBaseSchema, SymbolicMind, symbolicProvenance, type Facts } from "../src/agents/symbolic.js";
import { initialCognition } from "../src/agents/observe.js";
import { buildGenesisState } from "../src/domain/genesis.js";
import { canonicalJson, sha256Hex } from "../src/kernel/canonical.js";
import { World } from "../src/kernel/world.js";
import { firstForkGenesis, FIRST_FORK_SEED } from "../src/scenarios/the-first-fork/genesis.js";

function fresh() {
  const { state, keys } = buildGenesisState(firstForkGenesis(FIRST_FORK_SEED));
  return { world: World.found(state, "test-symbolic"), keys: keys as Record<string, string> };
}
const as = (id: string) => ({ kind: "citizen" as const, id });

describe("the symbolic mind", () => {
  it("proposes through the choice log, and its rationale is the rule trace: every rule that fired, what it matched, the agenda and the intention", async () => {
    const { world, keys } = fresh();
    const juno = keys.juno!;
    const choices = new ChoiceLog();
    const runtime = new AgentRuntime(world);
    const mind = new SymbolicMind(juno, choices);
    runtime.attach(mind);
    const [record] = await runtime.step("interlude");
    expect(record).toBeDefined();
    expect(record!.outcome).toBe("applied");
    expect(record!.generator).toEqual({ kind: "symbolic", model: "archipelago-symbolic", modelVersion: "1.0.0", promptId: "archipelago/symbolic/civic/v1", promptHash: sha256Hex(canonicalJson(CIVIC_RULES)), seed: `symbolic/${juno}` });
    expect(record!.rationale).toMatch(/^symbolic archipelago\/symbolic\/civic\/v1: /);
    // Juno has kin (Pell) and no open ballot: tend-kin and record-the-day tie at salience 50, and the tie is a recorded choice point.
    expect(record!.rationale).toMatch(/record-the-day\[always\] ⇒ record-experience@50/);
    expect(record!.rationale).toMatch(new RegExp(`tend-kin\\[has-kin=yes is yes\\] ⇒ maintain-relationships → ${keys.pell}@50`));
    expect(record!.rationale).toMatch(/agenda \[maintain-relationships → cit-\d+, record-experience\]; intention chosen maintain-relationships → cit-\d+; plan BDI intention maintain-relationships/);
    expect(record!.rationale).not.toMatch(/vote-when-a-ballot-is-open/);
    expect(choices.points.map((p) => p.label)).toEqual(["kin", "intention"]);
    expect(choices.points[1]!.options).toEqual([`maintain-relationships → ${keys.pell}`, "record-experience"]);
    expect(world.log.at(-1)!.event.type).toBe("CitizenEndorsed");
    expect(mind.lastTrace?.intention).toEqual({ kind: "maintain-relationships", target: keys.pell, how: "chosen" });
  });

  it("a rule fires when its conditions hold and the trace says which: an open ballot raises the vote at salience 90 above everything else", async () => {
    const { world, keys } = fresh();
    const juno = keys.juno!, pell = keys.pell!;
    expect(world.execute(as(juno), { type: "SubmitProposal", proposer: juno, island: "fork", title: "Test Act", rationale: "x", amendment: null, closesAtTick: 4 }).status).toBe("applied");
    const runtime = new AgentRuntime(world);
    runtime.attach(new SymbolicMind(pell, new ChoiceLog()));
    const [record] = await runtime.step("interlude");
    expect(record!.outcome).toBe("applied");
    expect(record!.rationale).toMatch(/^symbolic archipelago\/symbolic\/civic\/v1: vote-when-a-ballot-is-open\[ballot-open=yes is yes\] ⇒ participate-in-governance → prop-0001@90; /);
    expect(record!.rationale).toMatch(/intention only participate-in-governance → prop-0001; plan BDI intention participate-in-governance → prop-0001; values lean/);
    const ev = world.log.at(-1)!.event;
    expect(ev.type === "VoteCast" && ev.voter).toBe(pell);
    // Outside an interlude the mind revises its facts and proposes nothing, as the BDI mind does.
    expect(await runtime.step("prelude")).toEqual([]);
  });

  it("is deterministic: the same world, the same rule base and a fresh choice log give the same proposals, trace and choice points", async () => {
    const run = async () => {
      const { world, keys } = fresh();
      const choices = new ChoiceLog();
      const runtime = new AgentRuntime(world);
      for (const k of ["tamsin", "juno", "sefa", "mae"]) runtime.attach(new SymbolicMind(keys[k]!, choices));
      const records = [];
      for (let i = 0; i < 3; i++) {
        records.push(...(await runtime.step("interlude")));
        world.execute({ kind: "system", id: "clock" }, { type: "AdvanceTime", ticks: 1 });
      }
      return { records, points: choices.points, head: world.headHash };
    };
    const a = await run(), b = await run();
    expect(a.records.length).toBeGreaterThan(0);
    expect(canonicalJson(a.records)).toBe(canonicalJson(b.records));
    expect(a.points).toEqual(b.points);
    expect(a.head).toBe(b.head);
    expect(a.records.every((r) => r.rationale.startsWith("symbolic archipelago/symbolic/civic/v1: "))).toBe(true);
  });

  it("property: forward chaining fires the same rules in the same order whatever order the rules are declared in, over arbitrary facts", () => {
    const factArb = fc.record({
      "ballot-open": fc.constantFrom("yes", "no"),
      "has-kin": fc.constantFrom("yes", "no"),
      "occupation-chronicler": fc.constantFrom("yes", "no"),
      "occupation-cultural": fc.constantFrom("yes", "no"),
      "recent-events": fc.nat(6).map(String),
      memoryExchange: fc.constantFrom("permitted", "prohibited"),
      integration: fc.constantFrom("explicit-act", "prohibited"),
    }) as fc.Arbitrary<Facts>;
    const optional = fc.record({ "ballot-id": fc.constant("prop-0001"), "kin-chosen": fc.constant("cit-0002"), "archive-candidate": fc.constant("mem-0009"), "imported-held": fc.constant("mem-0010") }, { requiredKeys: [] }) as fc.Arbitrary<Facts>;
    fc.assert(
      fc.property(factArb, optional, fc.shuffledSubarray(CIVIC_RULES.rules, { minLength: CIVIC_RULES.rules.length }), (facts, extra, shuffled) => {
        const all = { ...facts, ...extra };
        const a = chain(CIVIC_RULES, all);
        const b = chain({ ...CIVIC_RULES, rules: shuffled }, all);
        expect(b.firings).toEqual(a.firings);
        expect(b.facts).toEqual(a.facts);
        // Salience is honoured: each firing's salience is no greater than the one before.
        const saliences = a.firings.map((f) => CIVIC_RULES.rules.find((r) => r.id === f.rule)!.salience);
        expect(saliences.every((s, i) => i === 0 || s <= saliences[i - 1]!)).toBe(true);
        // A rule's conditions are exactly what the trace says it matched.
        expect(a.firings.find((f) => f.rule === "vote-when-a-ballot-is-open") !== undefined).toBe(all["ballot-open"] === "yes");
        expect(a.firings.find((f) => f.rule === "record-the-day")?.matched).toEqual([]);
      }),
      { numRuns: 60 },
    );
  });

  it("a rule base is data, validated and hashed into provenance; a symbolic provenance may be declared for a citizen at genesis", () => {
    expect(() => RuleBaseSchema.parse({ id: "x", rules: [{ id: "a", salience: 1, when: [], then: {} }, { id: "a", salience: 1, when: [], then: {} }] })).toThrow(/unique/);
    expect(() => RuleBaseSchema.parse({ id: "x", rules: [{ id: "a", salience: 1, when: [], then: { intend: { kind: "conquer", target: null } } }] })).toThrow();
    expect(() => RuleBaseSchema.parse({ id: "x", rules: [] })).toThrow();
    const rb = RuleBaseSchema.parse({ id: "test/one", rules: [{ id: "a", salience: 1, when: [{ fact: "f", op: "gt", value: "2" }], then: { assert: { g: "yes" } } }] });
    expect(chain(rb, { f: "3" })).toEqual({ facts: { f: "3", g: "yes" }, firings: [{ rule: "a", matched: ["f=3 gt 2"], asserted: { g: "yes" }, intended: null }] });
    expect(chain(rb, { f: "1" }).firings).toEqual([]);
    const prov = symbolicProvenance(rb, "seed");
    expect(prov).toEqual({ kind: "symbolic", model: "archipelago-symbolic", modelVersion: "1.0.0", promptId: "test/one", promptHash: sha256Hex(canonicalJson(rb)), seed: "seed" });
    const g = firstForkGenesis(FIRST_FORK_SEED);
    const { state, keys } = buildGenesisState({ ...g, citizens: g.citizens.map((c) => (c.key === "pell" ? { ...c, provenance: prov } : c)) });
    expect(state.citizens[keys.pell!]!.provenance.kind).toBe("symbolic");
    expect(state.citizens[keys.juno!]!.provenance.kind).toBe("deterministic");
  });

  it("facts are strings a rule can name, derived from the observation, including the kin choice as a recorded choice point", () => {
    const { world, keys } = fresh();
    const runtime = new AgentRuntime(world);
    const log = new ChoiceLog();
    const facts = factsOf(runtime.observation(keys.orin!), initialCognition(keys.orin!), log.at(0, keys.orin!));
    expect(facts).toMatchObject({ residence: "continuity", doctrine: "single-continuous-process", "ballot-open": "no", "has-kin": "yes", "occupation-cultural": "yes", "occupation-chronicler": "no", memoryExchange: "prohibited", "value.curiosity": "0.80" });
    expect(facts["kin-chosen"]).toBe(keys.tamsin); // the first kin in the observation's order (relationships in record order), as the BDI mind takes it
    expect(log.points).toEqual([{ seq: 0, citizen: keys.orin, label: "kin", occurrence: 0, options: ["Tamsin Reed", "Ilan Cho"], chosen: 0 }]);
    expect(facts.plural).toBeUndefined();
  });
});
