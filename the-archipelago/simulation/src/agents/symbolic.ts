import { z } from "zod";
import type { CitizenId } from "../domain/ids.js";
import type { MindProvenance } from "../domain/model.js";
import { canonicalJson, sha256Hex } from "../kernel/canonical.js";
import { plan, reviseBeliefs } from "./bdi.js";
import type { Choose, ChoiceLog } from "./choice.js";
import { deterministicReply } from "./deterministic.js";
import type { ActionProposal, CitizenMind, CognitiveState, DesireKind, Intention, MindContext, Observation } from "./types.js";

/**
 * A symbolic mind: forward-chaining production rules over the agent's
 * beliefs. Everything it does is inspectable:
 *
 *   facts      ← working memory derived from the scoped observation (and the
 *                BDI belief revision), every fact a string
 *   rules      ← `when` conditions over facts, `then` assert further facts or
 *                raise an intention; a rule base is data (zod-validated) and
 *                its canonical JSON is hashed into the mind's provenance
 *   chaining   ← each cycle fires the one eligible rule of highest salience
 *                (ties by rule id), once per deliberation, until none is
 *                eligible or the cycle budget is spent
 *   intention  ← the raised intentions of highest salience are a choice point
 *                when there is more than one (`agents/choice.ts`); the first
 *                in canonical order is taken unless a study flips it
 *   plan       ← the BDI plan library maps the intention to one candidate
 *
 * The rationale recorded with every proposal is the rule trace: each rule
 * that fired, the facts it matched, what it asserted or intended, and how the
 * intention was chosen. Nothing is random; the same observation and the same
 * rule base give the same trace. This makes "deterministic minds describe
 * the rules, not cognition" exact: the rules are the rules, written down.
 */

export const ConditionSchema = z
  .object({
    fact: z.string().min(1),
    op: z.enum(["is", "is-not", "present", "absent", "gt", "lt"]),
    value: z.string().optional(),
  })
  .strict();
export type Condition = z.infer<typeof ConditionSchema>;

const DESIRE_KINDS = ["participate-in-governance", "maintain-relationships", "record-experience", "create-culture", "explore-collective-memory", "integrate-memory", "keep-chronicle"] as const satisfies readonly DesireKind[];

export const RuleSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    /** Conflict resolution: higher fires first; equal salience fires in id order, and equal-salience intentions are a choice point. */
    salience: z.number().int(),
    when: z.array(ConditionSchema),
    then: z
      .object({
        assert: z.record(z.string().min(1), z.string()).optional(),
        /** Raise an intention; `target` names a fact whose value is the target, or is null. */
        intend: z.object({ kind: z.enum(DESIRE_KINDS), target: z.string().nullable() }).strict().optional(),
      })
      .strict(),
  })
  .strict();
export type Rule = z.infer<typeof RuleSchema>;

export const RuleBaseSchema = z
  .object({ id: z.string().regex(/^[a-z][a-z0-9/.-]*$/), rules: z.array(RuleSchema).min(1) })
  .strict()
  .refine((rb) => new Set(rb.rules.map((r) => r.id)).size === rb.rules.length, { message: "rule ids must be unique" });
export type RuleBase = z.infer<typeof RuleBaseSchema>;

export type Facts = Record<string, string>;

export interface Firing {
  readonly rule: string;
  readonly matched: readonly string[];
  readonly asserted: Readonly<Record<string, string>>;
  readonly intended: { kind: DesireKind; target: string | null; salience: number } | null;
}

export interface RuleTrace {
  readonly ruleBase: string;
  readonly firings: readonly Firing[];
  /** Intentions raised, highest salience first, then kind and target. */
  readonly agenda: readonly { kind: DesireKind; target: string | null; salience: number }[];
  /** The intention adopted this deliberation (null when the agenda was empty), and whether it was kept from before or chosen now. */
  readonly intention: { kind: DesireKind; target: string | null; how: "kept" | "chosen" | "only" } | null;
}

const MAX_CYCLES = 64;
const MAX_ATTEMPTS = 2;

export function holds(c: Condition, facts: Facts): boolean {
  const v = facts[c.fact];
  switch (c.op) {
    case "present": return v !== undefined;
    case "absent": return v === undefined;
    case "is": return v !== undefined && v === c.value;
    case "is-not": return v !== c.value;
    case "gt": return v !== undefined && Number.parseFloat(v) > Number.parseFloat(c.value ?? "NaN");
    case "lt": return v !== undefined && Number.parseFloat(v) < Number.parseFloat(c.value ?? "NaN");
  }
}

const describeCondition = (c: Condition, facts: Facts): string => (c.op === "present" || c.op === "absent" ? `${c.fact} ${c.op}` : `${c.fact}=${facts[c.fact] ?? "∅"} ${c.op} ${c.value}`);

/**
 * Forward chaining over a rule base. Pure: the same facts and rules give the
 * same firings and the same final facts, whatever order the rules are declared in.
 */
export function chain(rb: RuleBase, initial: Facts): { facts: Facts; firings: Firing[] } {
  const facts: Facts = { ...initial };
  const fired = new Set<string>();
  const firings: Firing[] = [];
  const ordered = [...rb.rules].sort((a, b) => b.salience - a.salience || a.id.localeCompare(b.id));
  for (let cycle = 0; cycle < MAX_CYCLES; cycle++) {
    const rule = ordered.find((r) => !fired.has(r.id) && r.when.every((c) => holds(c, facts)));
    if (!rule) break;
    fired.add(rule.id);
    const matched = rule.when.map((c) => describeCondition(c, facts));
    const asserted = rule.then.assert ?? {};
    Object.assign(facts, asserted);
    const i = rule.then.intend;
    const target = i?.target === null || i?.target === undefined ? null : (facts[i.target] ?? null);
    const intended = i ? { kind: i.kind, target, salience: rule.salience } : null;
    firings.push({ rule: rule.id, matched, asserted, intended });
  }
  return { facts, firings };
}

const v = (obs: Observation, axis: string): string => (obs.self.values[axis] ?? 0).toFixed(2);

/**
 * Working memory from the observation. Every value is a string so that a rule
 * can name it. Where the derivation has more than one option (which kin) it
 * records a choice point, as the BDI mind does.
 */
export function factsOf(obs: Observation, cog: CognitiveState, choose: Choose): Facts {
  const s = obs.self;
  const facts: Facts = { ...reviseBeliefs(cog, obs) };
  const ballot = obs.openProposals.find((p) => p.electorate.includes(s.id) && !(s.id in p.votes) && obs.tick < p.closesAtTick);
  facts["ballot-open"] = ballot ? "yes" : "no";
  if (ballot) facts["ballot-id"] = ballot.id;
  facts["has-kin"] = obs.kin.length > 0 ? "yes" : "no";
  if (obs.kin.length > 0) facts["kin-chosen"] = choose("kin", obs.kin, (x) => x.name).id;
  const candidate = obs.archiveCatalogue.find((a) => a.contributedBy !== s.id && !a.alreadyHeld);
  if (candidate) facts["archive-candidate"] = candidate.id;
  const imported = obs.episodes.find((e) => e.source === "imported");
  if (imported) facts["imported-held"] = imported.memoryId;
  facts.occupation = s.occupation;
  facts["occupation-cultural"] = /poet|historian|singer|cartographer|builder|mediator/.test(s.occupation) ? "yes" : "no";
  facts["occupation-chronicler"] = /registrar|archivist|historian|chronicler/.test(s.occupation) ? "yes" : "no";
  facts["recent-events"] = String(obs.recentEventSeqs.length);
  for (const axis of Object.keys(s.values).sort()) facts[`value.${axis}`] = v(obs, axis);
  if (s.plurality) {
    facts.plural = "yes";
    facts["fronting-count"] = String(s.plurality.fronting.length);
  }
  return facts;
}

/** The civic rule base: the BDI desires written as rules, so that a researcher can read exactly why a mind proposed what it did. */
export const CIVIC_RULES: RuleBase = RuleBaseSchema.parse({
  id: "archipelago/symbolic/civic/v1",
  rules: [
    { id: "vote-when-a-ballot-is-open", salience: 90, when: [{ fact: "ballot-open", op: "is", value: "yes" }], then: { intend: { kind: "participate-in-governance", target: "ballot-id" } } },
    { id: "chronicle-when-much-has-happened", salience: 70, when: [{ fact: "occupation-chronicler", op: "is", value: "yes" }, { fact: "recent-events", op: "gt", value: "2" }], then: { intend: { kind: "keep-chronicle", target: null } } },
    { id: "tend-kin", salience: 50, when: [{ fact: "has-kin", op: "is", value: "yes" }], then: { intend: { kind: "maintain-relationships", target: "kin-chosen" } } },
    { id: "record-the-day", salience: 50, when: [], then: { intend: { kind: "record-experience", target: null } } },
    { id: "explore-the-archive", salience: 40, when: [{ fact: "memoryExchange", op: "is", value: "permitted" }, { fact: "archive-candidate", op: "present" }], then: { intend: { kind: "explore-collective-memory", target: "archive-candidate" } } },
    { id: "make-culture-when-cultural", salience: 30, when: [{ fact: "occupation-cultural", op: "is", value: "yes" }], then: { intend: { kind: "create-culture", target: null } } },
    { id: "integrate-what-is-held", salience: 20, when: [{ fact: "integration", op: "is", value: "explicit-act" }, { fact: "imported-held", op: "present" }], then: { intend: { kind: "integrate-memory", target: "imported-held" } } },
  ],
});

export const SYMBOLIC_MODEL = "archipelago-symbolic";
export const SYMBOLIC_MODEL_VERSION = "1.0.0";

/** Provenance for a symbolic mind: the rule base's id and the sha256 of its canonical JSON stand where a prompt's would. */
export function symbolicProvenance(rb: RuleBase, seed: string): MindProvenance {
  return { kind: "symbolic", model: SYMBOLIC_MODEL, modelVersion: SYMBOLIC_MODEL_VERSION, promptId: rb.id, promptHash: sha256Hex(canonicalJson(rb)), seed };
}

const describeIntention = (i: { kind: DesireKind; target: string | null }) => `${i.kind}${i.target ? ` → ${i.target}` : ""}`;

/**
 * One deliberation: chain the rules over the facts, then adopt an intention.
 * A committed intention is kept while a rule still raises it and it has not
 * failed MAX_ATTEMPTS times; otherwise the highest-salience intentions raised
 * are a choice point, and the first in canonical order is taken.
 */
export function deliberateSymbolically(rb: RuleBase, facts: Facts, previous: readonly Intention[], seq: number, choose: Choose): { trace: RuleTrace; intentions: Intention[] } {
  const { firings } = chain(rb, facts);
  const agenda = firings
    .flatMap((f) => (f.intended ? [f.intended] : []))
    .sort((a, b) => b.salience - a.salience || a.kind.localeCompare(b.kind) || (a.target ?? "").localeCompare(b.target ?? ""));
  const kept = previous.filter((i) => i.attempts < MAX_ATTEMPTS && agenda.some((a) => a.kind === i.kind && a.target === i.target));
  if (kept.length > 0) {
    const k = kept[0] as Intention;
    return { trace: { ruleBase: rb.id, firings, agenda, intention: { kind: k.kind, target: k.target, how: "kept" } }, intentions: [k] };
  }
  const top = agenda[0];
  if (!top) return { trace: { ruleBase: rb.id, firings, agenda, intention: null }, intentions: [] };
  const tied = agenda.filter((a) => a.salience === top.salience);
  const chosen = tied.length > 1 ? choose("intention", tied, describeIntention) : top;
  return {
    trace: { ruleBase: rb.id, firings, agenda, intention: { kind: chosen.kind, target: chosen.target, how: tied.length > 1 ? "chosen" : "only" } },
    intentions: [{ kind: chosen.kind, target: chosen.target, adoptedAtSeq: seq, attempts: 0 }],
  };
}

/** The rule trace as the rationale recorded with a proposal: every firing, the agenda and the intention, in one line a researcher can read. */
export function renderTrace(t: RuleTrace): string {
  const fired = t.firings.length === 0 ? "no rule fired" : t.firings.map((f) => `${f.rule}[${f.matched.join(" ∧ ") || "always"}]${Object.keys(f.asserted).length ? ` assert ${Object.entries(f.asserted).map(([k, x]) => `${k}=${x}`).join(",")}` : ""}${f.intended ? ` ⇒ ${describeIntention(f.intended)}@${f.intended.salience}` : ""}`).join("; ");
  const intention = t.intention ? `${t.intention.how} ${describeIntention(t.intention)}` : "none";
  return `symbolic ${t.ruleBase}: ${fired}; agenda [${t.agenda.map(describeIntention).join(", ")}]; intention ${intention}`;
}

export class SymbolicMind implements CitizenMind {
  readonly provenance: MindProvenance;
  #lastTrace: RuleTrace | null = null;

  constructor(
    readonly citizenId: CitizenId,
    private readonly choices: ChoiceLog,
    readonly rules: RuleBase = CIVIC_RULES,
    seed = `symbolic/${citizenId}`,
  ) {
    this.provenance = symbolicProvenance(rules, seed);
  }

  /** The trace of the most recent deliberation, for inspection; it is also the rationale of the proposal it produced. */
  get lastTrace(): RuleTrace | null {
    return this.#lastTrace;
  }

  deliberate(obs: Observation, cog: CognitiveState, ctx: MindContext): CognitiveState {
    const choose = this.choices.at(obs.seq, this.citizenId);
    const facts = factsOf(obs, cog, choose);
    if (ctx.beat !== "interlude") return { ...cog, beliefs: facts };
    const { trace, intentions } = deliberateSymbolically(this.rules, facts, cog.intentions, obs.seq, choose);
    this.#lastTrace = trace;
    return { ...cog, beliefs: facts, desires: trace.agenda.map((a) => ({ kind: a.kind, priority: a.salience, target: a.target })), intentions };
  }

  propose(obs: Observation, cog: CognitiveState, ctx: MindContext): ActionProposal[] {
    if (ctx.beat !== "interlude") return [];
    const intention = cog.intentions[0];
    if (!intention || !this.#lastTrace) return [];
    const p = plan(intention, obs, this.choices.at(obs.seq, this.citizenId));
    return p ? [{ proposer: this.citizenId, candidate: p.candidate, rationale: `${renderTrace(this.#lastTrace)}; plan ${p.rationale}`, generator: this.provenance }] : [];
  }

  respond(utterance: string, obs: Observation): string {
    return deterministicReply(utterance, obs);
  }
}
