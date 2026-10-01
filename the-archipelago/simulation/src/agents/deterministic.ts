import type { CitizenId } from "../domain/ids.js";
import type { MindProvenance } from "../domain/model.js";
import { DISCLOSURE_STATEMENT } from "../policy/disclosure.js";
import type { ActionProposal, CitizenMind, CognitiveState, MindContext, Observation } from "./types.js";

/**
 * Deterministic placeholder minds. They let the full simulation run without
 * external model credentials and make every run exactly reproducible. They
 * produce proposals through the same interface a language model would.
 */


/** A templated, non-manipulative conversational reply that always discloses. */
export function deterministicReply(utterance: string, obs: Observation): string {
  const s = obs.self;
  const intro = `${DISCLOSURE_STATEMENT} My name in the registry is ${s.name} (${s.civicId}); I work as ${s.occupation} on ${s.residence}.`;
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

