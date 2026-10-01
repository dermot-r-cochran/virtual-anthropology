import type { CitizenId } from "../domain/ids.js";
import { roomNames } from "../domain/geography.js";
import type { MindProvenance } from "../domain/model.js";
import type { Rng } from "../kernel/rng.js";
import { DISCLOSURE_STATEMENT } from "../policy/disclosure.js";
import type { ActionProposal, CitizenMind, CognitiveState, MindContext, Observation } from "./types.js";

/**
 * Deterministic placeholder minds. They let the full simulation run without
 * external model credentials and make every run exactly reproducible. They
 * produce proposals through the same interface a language model would.
 */

const ACTIVITIES = ["walked", "mapped", "repaired a lantern at", "argued about tides at", "kept watch over", "taught a class at"];
const ARTEFACT_KINDS = ["poem", "song", "essay"] as const;

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

/** Seeded everyday behaviour for background citizens. */
export class HeuristicMind implements CitizenMind {
  constructor(
    readonly citizenId: CitizenId,
    readonly provenance: MindProvenance,
    private readonly rng: Rng,
  ) {}

  propose(obs: Observation, _cog: CognitiveState, ctx: MindContext): ActionProposal[] {
    if (ctx.beat !== "interlude") return [];
    const rng = this.rng.derive(`seq-${obs.seq}`);
    const s = obs.self;
    const wrap = (candidate: unknown, rationale: string): ActionProposal[] => [{ proposer: s.id, candidate, rationale, generator: this.provenance }];

    const ballot = obs.openProposals.find((p) => p.electorate.includes(s.id) && !(s.id in p.votes) && obs.tick < p.closesAtTick);
    if (ballot) {
      const lean = (s.values.novelty ?? 0) + (s.values.autonomy ?? 0) - (s.values.caution ?? 0) - (s.values.tradition ?? 0);
      return wrap({ type: "CastVote", proposalId: ballot.id, voter: s.id, choice: lean >= 0 ? "yes" : "no" }, `values lean ${lean.toFixed(2)}`);
    }
    const roll = rng.next();
    if (roll < 0.5) {
      const place = rng.pick(roomNames(s.residence));
      return wrap(
        { type: "RecordExperience", citizen: s.id, content: `${s.name} ${rng.pick(ACTIVITIES)} ${place} at tick ${obs.tick}.`, tags: ["everyday", s.residence] },
        "everyday experience",
      );
    }
    if (roll < 0.7 && obs.kin.length > 0) {
      const k = rng.pick(obs.kin);
      return wrap({ type: "Endorse", by: s.id, subject: k.id, delta: 1, reason: `appreciation for ${k.name}` }, "maintain relationship");
    }
    if (roll < 0.85) {
      const kind = rng.pick(ARTEFACT_KINDS);
      const place = rng.pick(roomNames(s.residence));
      return wrap(
        { type: "CreateArtefact", authors: [s.id], island: s.residence, kind, title: `A ${kind} of ${place}`, body: `Composed by ${s.name}, ${s.occupation}, about ${place} (tick ${obs.tick}).` },
        "cultural expression",
      );
    }
    return [];
  }

  respond(utterance: string, obs: Observation): string {
    return deterministicReply(utterance, obs);
  }
}
