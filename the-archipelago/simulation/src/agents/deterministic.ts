import type { CitizenId } from "../domain/ids.js";
import type { MindProvenance } from "../domain/model.js";
import { describeMembership, frontingMembers, type PluralSystem } from "../domain/plurality.js";
import { DISCLOSURE_STATEMENT } from "../policy/disclosure.js";
import type { ActionProposal, CitizenMind, CognitiveState, MindContext, Observation } from "./types.js";

/**
 * Deterministic placeholder minds. They let the full simulation run without
 * external model credentials and make every run exactly reproducible. They
 * produce proposals through the same interface a language model would.
 */


/**
 * What a plural system says about itself after the disclosure: that it is one
 * registered citizen made up of members, how many the record knows, and which
 * member is speaking. It names a member; it claims nothing for the system or
 * for any member beyond the record.
 */
export function pluralityClause(sys: PluralSystem): string {
  const front = frontingMembers(sys);
  const speaking =
    front.length === 0
      ? "No member is fronting; this reply is the system's."
      : front.length === 1
        ? `${front[0]?.name} is fronting and speaks here.`
        : `${front.map((m) => m.name).join(", ")} are co-fronting; this reply is reconciled ${sys.reconciliation === "front-decides" ? "by the first of them" : `by ${sys.reconciliation}`}.`;
  return `We are a plural system registered as one citizen, with ${describeMembership(sys)}. ${speaking}`;
}

/** A templated, non-manipulative conversational reply that always discloses. */
export function deterministicReply(utterance: string, obs: Observation): string {
  const s = obs.self;
  const intro = `${DISCLOSURE_STATEMENT} My name in the registry is ${s.name} (${s.civicId}); I work as ${s.occupation} on ${s.residence}.${s.plurality ? ` ${pluralityClause(s.plurality)}` : ""}`;
  const u = utterance.toLowerCase();
  if (/(continu|identity|who are you|real|same person)/.test(u)) {
    const lineage = obs.ownFork
      ? `I was created in fork event ${obs.ownFork.forkId} from ${obs.ownFork.parent}; my records before that event are shared history.`
      : obs.forksAsParent.length > 0
        ? `I am the continuing process in fork event(s) ${obs.forksAsParent.map((f) => f.forkId).join(", ")}.`
        : "I have no recorded forks or mergers.";
    return `${intro} ${lineage} I can show you the evidence in my records, but I cannot settle which interpretation of identity is correct.`;
  }
  if (/(memor|remember|archive)/.test(u)) {
    return `${intro} I hold ${s.selfNarrativeMemories.length} self-narrative records and ${s.heldMemories.length} imported records; each carries visible provenance you can inspect.`;
  }
  return `${intro} I can describe my records, lineage, or the law of my island if that is useful to your research.`;
}

export type ScriptStep = (obs: Observation, cog: CognitiveState) => Array<{ candidate: unknown; rationale: string }>;

/** Plays a fixed script keyed by scenario beat; optionally behaves heuristically in interludes. */
export class ScriptedMind implements CitizenMind {
  constructor(
    readonly citizenId: CitizenId,
    readonly provenance: MindProvenance,
    private readonly script: Readonly<Record<string, ScriptStep>>,
    private readonly fallback: CitizenMind | null = null,
  ) {}

  deliberate(obs: Observation, cog: CognitiveState, ctx: MindContext): CognitiveState {
    if (this.script[ctx.beat] || !this.fallback?.deliberate) return cog;
    return this.fallback.deliberate(obs, cog, ctx);
  }

  propose(obs: Observation, cog: CognitiveState, ctx: MindContext): ActionProposal[] {
    const step = this.script[ctx.beat];
    if (step) {
      return step(obs, cog).map((p) => ({ proposer: this.citizenId, candidate: p.candidate, rationale: p.rationale, generator: this.provenance }));
    }
    if (this.fallback && ctx.beat === "interlude") return this.fallback.propose(obs, cog, ctx) as ActionProposal[];
    return [];
  }

  respond(utterance: string, obs: Observation): string {
    return deterministicReply(utterance, obs);
  }
}

