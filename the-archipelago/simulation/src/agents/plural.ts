import type { CitizenId } from "../domain/ids.js";
import type { MindProvenance } from "../domain/model.js";
import { frontingMembers, type PluralSystem } from "../domain/plurality.js";
import { canonicalJson, sha256Hex } from "../kernel/canonical.js";
import { plan } from "./bdi.js";
import type { Choose, ChoiceLog } from "./choice.js";
import { deterministicReply } from "./deterministic.js";
import { CIVIC_RULES, deliberateSymbolically, factsOf, renderTrace, SYMBOLIC_MODEL, SYMBOLIC_MODEL_VERSION, type Facts, type RuleBase } from "./symbolic.js";
import type { ActionProposal, CitizenMind, CognitiveState, DesireKind, MindContext, Observation } from "./types.js";

/**
 * The mind of a plural system: a symbolic rule base per fronting member, and
 * the system's own declared way of reconciling what they propose.
 *
 * The citizen is one person; this is one mind proposing as that one citizen.
 * Each fronting member deliberates over the same observation with its own
 * rule base (`voices`, keyed by member path; members without one use the
 * default), so two members may reach different proposals. That is ordinary
 * difference between members: both views are written into the rationale, and
 * the system's reconciliation (`domain/plurality.ts`) decides which one, if
 * any, becomes the citizen's proposal. Nothing flags the disagreement.
 *
 * A fronting member that is itself a subsystem is resolved the same way one
 * level down, with its own fronting members and its own reconciliation; depth
 * never means less real. Members who are not fronting do not deliberate, so a
 * system of any size costs only its fronting members.
 *
 * Every choice (which kin, which of equally salient intentions, which of
 * equal-say members) is a choice point on the one citizen, labelled with the
 * member path, so a study can branch on a member's alternative like any other.
 */

export const PLURAL_RULE_BASE_ID = "archipelago/symbolic/plural/v1";

interface View {
  readonly member: string;
  readonly say: number;
  readonly intention: { kind: DesireKind; target: string | null } | null;
  readonly summary: string;
}

export interface Reconciled {
  readonly intention: { kind: DesireKind; target: string | null } | null;
  readonly decidedBy: string | null;
  readonly lines: readonly string[];
}

const describe = (i: { kind: DesireKind; target: string | null } | null) => (i ? `${i.kind}${i.target ? ` → ${i.target}` : ""}` : "nothing");
const key = (i: { kind: DesireKind; target: string | null } | null) => (i ? `${i.kind}|${i.target ?? ""}` : "");

/** Resolves one system's proposal from its fronting members, recursively through subsystems. Pure given `choose`. */
export function resolveSystem(sys: PluralSystem, voices: Readonly<Record<string, RuleBase>>, fallback: RuleBase, facts: Facts, obs: Observation, choose: Choose, prefix = ""): Reconciled {
  const front = frontingMembers(sys);
  if (front.length === 0) return { intention: null, decidedBy: null, lines: [`${prefix || "system"}: no member fronting`] };
  const views: View[] = front.map((m) => {
    const path = `${prefix}${m.id}`;
    const memberFacts: Facts = { ...facts, member: path, role: m.role ?? "", say: String(m.say) };
    if (m.subsystem) {
      const inner = resolveSystem(m.subsystem, voices, fallback, memberFacts, obs, choose, `${path}/`);
      return { member: path, say: m.say, intention: inner.intention, summary: `${path} (subsystem, ${m.subsystem.reconciliation}): ${inner.lines.join(" | ")}` };
    }
    const memberChoose: Choose = (label, options, d) => choose(`${path}/${label}`, options, d);
    const { trace } = deliberateSymbolically(voices[path] ?? fallback, memberFacts, [], obs.seq, memberChoose);
    return { member: path, say: m.say, intention: trace.intention ? { kind: trace.intention.kind, target: trace.intention.target } : null, summary: `${path}: ${renderTrace(trace)}` };
  });
  const lines = views.map((x) => x.summary);
  const distinct = [...new Set(views.map((x) => key(x.intention)))];
  lines.push(distinct.length > 1 ? `members differ: ${views.map((x) => `${x.member} proposes ${describe(x.intention)}`).join("; ")} (ordinary difference, recorded)` : `members concur: ${describe(views[0]?.intention ?? null)}`);
  let decided: View | null;
  switch (sys.reconciliation) {
    case "front-decides":
      decided = views[0] ?? null;
      break;
    case "weighted-say": {
      const most = Math.max(...views.map((x) => x.say));
      const tied = views.filter((x) => x.say === most);
      decided = tied.length > 1 ? choose(`${prefix}reconcile`, tied, (x) => x.member) : (tied[0] ?? null);
      break;
    }
    case "in-turn":
      decided = views[obs.tick % views.length] ?? null;
      break;
    case "concurrence":
      decided = distinct.length === 1 ? (views[0] ?? null) : null;
      break;
  }
  if (!decided) {
    lines.push(`reconciled by ${sys.reconciliation}: no concurrence, the system holds back this step`);
    return { intention: null, decidedBy: null, lines };
  }
  lines.push(`reconciled by ${sys.reconciliation} → ${decided.member}: ${describe(decided.intention)}`);
  return { intention: decided.intention, decidedBy: decided.member, lines };
}

export class PluralMind implements CitizenMind {
  readonly provenance: MindProvenance;
  #last: Reconciled | null = null;

  constructor(
    readonly citizenId: CitizenId,
    private readonly choices: ChoiceLog,
    /** Rule bases by member path (`id`, or `id/inner-id` within a subsystem); members without one use `fallback`. */
    private readonly voices: Readonly<Record<string, RuleBase>> = {},
    private readonly fallback: RuleBase = CIVIC_RULES,
    seed = `plural/${citizenId}`,
  ) {
    this.provenance = { kind: "symbolic", model: SYMBOLIC_MODEL, modelVersion: SYMBOLIC_MODEL_VERSION, promptId: PLURAL_RULE_BASE_ID, promptHash: sha256Hex(canonicalJson({ fallback, voices })), seed };
  }

  /** The most recent reconciliation: every fronting member's view and how the system decided. */
  get lastReconciliation(): Reconciled | null {
    return this.#last;
  }

  deliberate(obs: Observation, cog: CognitiveState, ctx: MindContext): CognitiveState {
    const choose = this.choices.at(obs.seq, this.citizenId);
    const facts = factsOf(obs, cog, choose);
    const sys = obs.self.plurality;
    if (ctx.beat !== "interlude" || !sys) return { ...cog, beliefs: facts };
    const r = resolveSystem(sys, this.voices, this.fallback, facts, obs, choose);
    this.#last = r;
    return { ...cog, beliefs: facts, desires: r.intention ? [{ kind: r.intention.kind, priority: 1, target: r.intention.target }] : [], intentions: r.intention ? [{ kind: r.intention.kind, target: r.intention.target, adoptedAtSeq: obs.seq, attempts: 0 }] : [] };
  }

  propose(obs: Observation, cog: CognitiveState, ctx: MindContext): ActionProposal[] {
    if (ctx.beat !== "interlude" || !this.#last) return [];
    const intention = cog.intentions[0];
    if (!intention) return [];
    const p = plan(intention, obs, this.choices.at(obs.seq, this.citizenId));
    return p ? [{ proposer: this.citizenId, candidate: p.candidate, rationale: `plural ${obs.self.plurality?.reconciliation ?? "singular"}: ${this.#last.lines.join(" | ")}; plan ${p.rationale}`, generator: this.provenance }] : [];
  }

  /** The reply opens with the artificial-nature statement and says which member is speaking; it claims nothing for the system or any member. */
  respond(utterance: string, obs: Observation): string {
    return deterministicReply(utterance, obs);
  }
}
