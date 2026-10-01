import type { CitizenId, IslandId } from "../domain/ids.js";
import type { Law } from "../domain/law.js";
import type { Citizen, MindProvenance, Petition, Proposal } from "../domain/model.js";
import type { Episode } from "./episodic.js";

/**
 * What a citizen can perceive. Observations are derived from canonical state
 * but scoped to the citizen; minds never receive or mutate the world state.
 */
export interface Observation {
  readonly seq: number;
  readonly tick: number;
  readonly self: Citizen;
  readonly residenceLaw: Law;
  readonly kin: ReadonlyArray<{ id: CitizenId; name: string; kind: string; residence: IslandId }>;
  readonly openProposals: ReadonlyArray<Proposal>;
  readonly petitions: ReadonlyArray<Petition>;
  readonly archiveCatalogue: ReadonlyArray<{ id: string; tags: readonly string[]; preview: string; contributedBy: CitizenId | null; alreadyHeld: boolean }>;
  readonly forksAsParent: ReadonlyArray<{ forkId: string; atSeq: number; descendants: readonly CitizenId[] }>;
  readonly ownFork: { forkId: string; atSeq: number; parent: CitizenId } | null;
  readonly messages: ReadonlyArray<{ from: string; text: string; atSeq: number }>;
  readonly recentEventSeqs: readonly number[];
  /** Episodic memory accessible to the citizen, with source monitoring. */
  readonly episodes: readonly Episode[];
}

/**
 * A model-generated (or scripted) proposal. `candidate` is untrusted: it is
 * validated against the command schema, authorised and checked against island
 * law before anything can change.
 */
export interface ActionProposal {
  readonly proposer: CitizenId;
  readonly candidate: unknown;
  readonly rationale: string;
  readonly generator: MindProvenance;
}

/** Per-citizen cognitive state, kept outside canonical world state. */
export interface CognitiveState {
  readonly citizenId: CitizenId;
  lastSeenSeq: number;
  /** BDI beliefs: propositions the agent currently holds, derived from observation and episodes. */
  beliefs: Record<string, string>;
  /** BDI desires generated in the last deliberation, highest priority first. */
  desires: Desire[];
  /** BDI intentions: desires the agent has committed to, persisted across steps. */
  intentions: Intention[];
  salientSeqs: number[];
}

export type DesireKind =
  | "participate-in-governance"
  | "maintain-relationships"
  | "record-experience"
  | "create-culture"
  | "explore-collective-memory"
  | "integrate-memory"
  | "keep-chronicle";

export interface Desire {
  readonly kind: DesireKind;
  readonly priority: number;
  readonly target: string | null;
}

export interface Intention {
  readonly kind: DesireKind;
  readonly target: string | null;
  readonly adoptedAtSeq: number;
  attempts: number;
}

export interface MindContext {
  /** Name of the current scenario beat, or "interlude" for free activity. */
  readonly beat: string;
}

export interface CitizenMind {
  readonly citizenId: CitizenId;
  readonly provenance: MindProvenance;
  /** Optional deliberation step (e.g. BDI) that revises cognitive state before proposing. */
  deliberate?(obs: Observation, cognition: CognitiveState, ctx: MindContext): CognitiveState;
  propose(obs: Observation, cognition: CognitiveState, ctx: MindContext): ActionProposal[] | Promise<ActionProposal[]>;
  respond(utterance: string, obs: Observation, cognition: CognitiveState): string | Promise<string>;
}
