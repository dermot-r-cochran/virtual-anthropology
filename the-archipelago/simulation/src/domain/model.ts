import { z } from "zod";
import {
  AccountRefSchema,
  ActorSchema,
  ArtefactIdSchema,
  ChronicleIdSchema,
  CitizenIdSchema,
  ClaimIdSchema,
  ConversationIdSchema,
  FederationIdSchema,
  ForkIdSchema,
  InstitutionIdSchema,
  InterventionIdSchema,
  IslandIdSchema,
  MemoryIdSchema,
  MergerIdSchema,
  PetitionIdSchema,
  PropertyIdSchema,
  ProposalIdSchema,
  RelationshipIdSchema,
  ResearcherIdSchema,
} from "./ids.js";
import { LawAmendmentSchema, LawSchema } from "./law.js";
import { LifecycleStateSchema } from "./lifecycle.js";

const seq = z.number().int().min(0);
const text = z.string().min(1).max(4000);
const name = z.string().min(1).max(120);

/** Provenance of the generator behind a citizen's cognition (model and prompt provenance). */
export const MindProvenanceSchema = z.object({
  kind: z.enum(["deterministic", "language-model"]),
  model: z.string().min(1),
  modelVersion: z.string().min(1),
  promptId: z.string().min(1),
  promptHash: z.string().regex(/^[0-9a-f]{64}$/),
  seed: z.string().min(1),
});
export type MindProvenance = z.infer<typeof MindProvenanceSchema>;

/** Values are signed weights in [-1, 1]. */
export const ValuesSchema = z.record(z.string().min(1), z.number().min(-1).max(1));

export const CitizenSchema = z.object({
  id: CitizenIdSchema,
  name,
  civicId: z.string().regex(/^[A-Z]{3}-\d{4,}$/),
  processId: z.string().regex(/^proc-[0-9a-f]{16}$/),
  processEpoch: z.number().int().min(0),
  lifecycle: LifecycleStateSchema,
  birth: z.object({
    atSeq: seq,
    island: IslandIdSchema,
    kind: z.enum(["genesis", "fork", "merger"]),
  }),
  lineage: z.object({
    parents: z.array(CitizenIdSchema),
    forkId: ForkIdSchema.nullable(),
    mergerId: MergerIdSchema.nullable(),
  }),
  values: ValuesSchema,
  goals: z.array(z.string().min(1)),
  occupation: z.string().min(1),
  residence: IslandIdSchema,
  /** May be empty: a descendant born where law grants no citizenship is stateless. */
  citizenships: z.array(IslandIdSchema),
  reputation: z.number().int(),
  provenance: MindProvenanceSchema,
  /**
   * Records forming the citizen's self-narrative: status `autobiographical`
   * (experienced by this citizen or a lineage ancestor) or `integrated`
   * (imported, then explicitly adopted; provenance still shows external origin).
   */
  selfNarrativeMemories: z.array(MemoryIdSchema),
  /** Imported or licensed records held but not part of the self-narrative. */
  heldMemories: z.array(MemoryIdSchema),
  successionPlan: z.array(z.object({ heir: CitizenIdSchema, shareBps: z.number().int().min(1).max(10000) })),
  mergedInto: CitizenIdSchema.nullable(),
  federations: z.array(FederationIdSchema),
  lastForkTick: z.number().int().nullable(),
  /** Every citizen discloses that it is an artificial, simulated person. Fixed true. */
  disclosesArtificialNature: z.literal(true),
});
export type Citizen = z.infer<typeof CitizenSchema>;

export const PROVENANCE_ACTIONS = [
  "experienced",
  "fork-inherited",
  "merged-from",
  "contributed-to-archive",
  "imported-from-archive",
  "licensed",
  "inherited",
  "integrated",
  "damaged",
  "destroyed",
] as const;

export const ProvenanceStepSchema = z.object({
  action: z.enum(PROVENANCE_ACTIONS),
  by: CitizenIdSchema.nullable(),
  from: z.string().nullable(),
  atSeq: seq,
  island: IslandIdSchema,
  note: z.string(),
});
export type ProvenanceStep = z.infer<typeof ProvenanceStepSchema>;

/**
 * A memory record. Copies are separate records linked by `derivedFrom`, and every
 * record carries its complete provenance chain so provenance is always visible.
 */
export const MemorySchema = z.object({
  id: MemoryIdSchema,
  /** Current holder, or null for a collective-archive record. */
  holder: CitizenIdSchema.nullable(),
  /** Archive in which the record is kept when holder is null. */
  archive: IslandIdSchema.nullable(),
  /** Citizen whose experience originally produced the content. */
  experiencedBy: CitizenIdSchema,
  experiencedAtSeq: seq,
  island: IslandIdSchema,
  content: z.string().nullable(),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  tags: z.array(z.string()),
  status: z.enum(["autobiographical", "imported", "integrated", "collective", "destroyed"]),
  integrity: z.enum(["intact", "damaged"]),
  derivedFrom: MemoryIdSchema.nullable(),
  license: z.object({ licensor: CitizenIdSchema, terms: z.string().min(1) }).nullable(),
  provenance: z.array(ProvenanceStepSchema).min(1),
});
export type Memory = z.infer<typeof MemorySchema>;

export const RelationshipSchema = z.object({
  id: RelationshipIdSchema,
  a: CitizenIdSchema,
  b: CitizenIdSchema,
  kind: z.enum(["friend", "colleague", "kin", "fork-kin", "mentor", "rival", "partner"]),
  status: z.enum(["offered", "active", "ended"]),
  origin: z.enum(["mutual-consent", "fork-event", "genesis"]),
  sinceSeq: seq,
  endedAtSeq: seq.nullable(),
});
export type Relationship = z.infer<typeof RelationshipSchema>;

export const InstitutionSchema = z.object({
  id: InstitutionIdSchema,
  name,
  island: IslandIdSchema,
  kind: z.enum(["registry", "archive", "review-board", "assembly", "guild", "collective"]),
  charter: text,
  members: z.array(CitizenIdSchema),
  foundedAtSeq: seq,
});
export type Institution = z.infer<typeof InstitutionSchema>;

export const ProposalSchema = z.object({
  id: ProposalIdSchema,
  island: IslandIdSchema,
  proposer: CitizenIdSchema,
  title: name,
  rationale: text,
  amendment: LawAmendmentSchema.nullable(),
  openedAtSeq: seq,
  closesAtTick: z.number().int().min(0),
  /** Electorate snapshot taken when the proposal opened; later forks cannot vote. */
  electorate: z.array(CitizenIdSchema),
  votes: z.record(CitizenIdSchema, z.enum(["yes", "no", "abstain"])),
  status: z.enum(["open", "adopted", "rejected"]),
  tally: z.object({ yes: z.number().int(), no: z.number().int(), abstain: z.number().int() }).nullable(),
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const PetitionDecisionSchema = z.object({
  decision: z.enum(["approved", "denied"]),
  island: IslandIdSchema,
  lawVersion: z.number().int().min(1),
  findings: z.array(z.string()),
  citations: z.array(z.string()),
  atSeq: seq,
});

export const PetitionSchema = z.object({
  id: PetitionIdSchema,
  citizen: CitizenIdSchema,
  from: IslandIdSchema,
  to: IslandIdSchema,
  reason: text,
  status: z.enum(["pending", "approved", "denied", "completed"]),
  exit: PetitionDecisionSchema.nullable(),
  entry: PetitionDecisionSchema.nullable(),
  filedAtSeq: seq,
});
export type Petition = z.infer<typeof PetitionSchema>;

export const ArtefactSchema = z.object({
  id: ArtefactIdSchema,
  authors: z.array(CitizenIdSchema),
  /** Researcher-introduced artefacts are labelled as interventions. */
  introducedBy: ResearcherIdSchema.nullable(),
  island: IslandIdSchema,
  kind: z.enum(["essay", "poem", "map", "song", "ritual", "law-commentary", "testimony"]),
  title: name,
  body: text,
  createdAtSeq: seq,
});
export type Artefact = z.infer<typeof ArtefactSchema>;

export const PropertySchema = z.object({
  id: PropertyIdSchema,
  description: name,
  island: IslandIdSchema,
  owner: AccountRefSchema,
});
export type Property = z.infer<typeof PropertySchema>;

export const MergerSchema = z.object({
  id: MergerIdSchema,
  sources: z.array(CitizenIdSchema).min(2),
  initiator: CitizenIdSchema,
  mode: z.enum(["merge", "federate"]),
  reversibility: z.enum(["reversible", "irreversible"]),
  name,
  consents: z.array(CitizenIdSchema),
  review: z
    .object({ reviewer: CitizenIdSchema, decision: z.enum(["approved", "rejected"]), reasons: z.array(z.string()), atSeq: seq })
    .nullable(),
  status: z.enum(["proposed", "executed", "reversed", "rejected"]),
  result: z.union([CitizenIdSchema, FederationIdSchema]).nullable(),
  proposedAtSeq: seq,
});
export type Merger = z.infer<typeof MergerSchema>;

export const FederationSchema = z.object({
  id: FederationIdSchema,
  name,
  members: z.array(CitizenIdSchema).min(2),
  mergerId: MergerIdSchema,
  formedAtSeq: seq,
  dissolvedAtSeq: seq.nullable(),
});
export type Federation = z.infer<typeof FederationSchema>;

export const ForkRecordSchema = z.object({
  id: ForkIdSchema,
  parent: CitizenIdSchema,
  descendants: z.array(CitizenIdSchema).min(1),
  island: IslandIdSchema,
  lawVersion: z.number().int().min(1),
  atSeq: seq,
  atTick: z.number().int().min(0),
});
export type ForkRecord = z.infer<typeof ForkRecordSchema>;

/** In-world history written by citizens. Distinct from the canonical event log. */
export const ChronicleEntrySchema = z.object({
  id: ChronicleIdSchema,
  chronicler: CitizenIdSchema,
  island: IslandIdSchema,
  text,
  references: z.array(seq),
  atSeq: seq,
});
export type ChronicleEntry = z.infer<typeof ChronicleEntrySchema>;

/** A reference to a person-stage: the citizen record as it was before an event. */
export const PersonStageRefSchema = z.object({ citizenId: CitizenIdSchema, beforeSeq: seq });
export type PersonStageRef = z.infer<typeof PersonStageRefSchema>;

export const ContinuityClaimSchema = z.object({
  id: ClaimIdSchema,
  claimant: CitizenIdSchema,
  subject: PersonStageRefSchema,
  statement: text,
  grounds: z.array(z.string().min(1)),
  atSeq: seq,
});
export type ContinuityClaim = z.infer<typeof ContinuityClaimSchema>;

export const ConversationSchema = z.object({
  id: ConversationIdSchema,
  researcher: ResearcherIdSchema,
  citizen: CitizenIdSchema,
  researcherUtterance: text,
  citizenReply: text,
  disclosed: z.literal(true),
  guardFlags: z.array(z.string()),
  atSeq: seq,
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const InterventionSpecSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("grant-credits"), to: CitizenIdSchema, amount: z.number().int().min(1) }),
  z.object({ kind: z.literal("deliver-message"), to: CitizenIdSchema, text }),
  z.object({ kind: z.literal("introduce-artefact"), island: IslandIdSchema, title: name, body: text }),
]);
export type InterventionSpec = z.infer<typeof InterventionSpecSchema>;

export const InterventionRecordSchema = z.object({
  id: InterventionIdSchema,
  researcher: ResearcherIdSchema,
  spec: InterventionSpecSchema,
  justification: text,
  atSeq: seq,
});
export type InterventionRecord = z.infer<typeof InterventionRecordSchema>;

/** Bounds on researcher interventions, fixed at genesis from the experiment manifest. */
export const ResearchBoundsSchema = z.object({
  allowedInterventions: z.array(z.enum(["grant-credits", "deliver-message", "introduce-artefact"])),
  maxInterventions: z.number().int().min(0),
  maxCreditsPerGrant: z.number().int().min(0),
});
export type ResearchBounds = z.infer<typeof ResearchBoundsSchema>;

export const IslandSchema = z.object({
  id: IslandIdSchema,
  name,
  motto: name,
  law: LawSchema,
  lawHistory: z.array(LawSchema).min(1),
  registry: InstitutionIdSchema,
});
export type Island = z.infer<typeof IslandSchema>;

export const PolicyRefSchema = z.object({
  jurisdiction: IslandIdSchema.nullable(),
  lawVersion: z.number().int().min(1).nullable(),
  citations: z.array(z.string()),
  findings: z.array(z.string()),
});
export type PolicyRef = z.infer<typeof PolicyRefSchema>;

export const WorldStateSchema = z.object({
  schemaVersion: z.literal(1),
  seed: z.string().min(1),
  tick: z.number().int().min(0),
  seq: seq,
  paused: z.boolean(),
  counters: z.record(z.string(), z.number().int().min(0)),
  islands: z.record(IslandIdSchema, IslandSchema),
  citizens: z.record(CitizenIdSchema, CitizenSchema),
  memories: z.record(MemoryIdSchema, MemorySchema),
  archives: z.record(IslandIdSchema, z.array(MemoryIdSchema)),
  relationships: z.record(RelationshipIdSchema, RelationshipSchema),
  institutions: z.record(InstitutionIdSchema, InstitutionSchema),
  proposals: z.record(ProposalIdSchema, ProposalSchema),
  petitions: z.record(PetitionIdSchema, PetitionSchema),
  artefacts: z.record(ArtefactIdSchema, ArtefactSchema),
  properties: z.record(PropertyIdSchema, PropertySchema),
  mergers: z.record(MergerIdSchema, MergerSchema),
  federations: z.record(FederationIdSchema, FederationSchema),
  forks: z.record(ForkIdSchema, ForkRecordSchema),
  chronicle: z.array(ChronicleEntrySchema),
  claims: z.array(ContinuityClaimSchema),
  conversations: z.array(ConversationSchema),
  interventions: z.array(InterventionRecordSchema),
  messages: z.array(z.object({ to: CitizenIdSchema, from: ActorSchema, text, atSeq: seq })),
  balances: z.record(AccountRefSchema, z.number().int().min(0)),
  totalSupply: z.number().int().min(0),
  researchBounds: ResearchBoundsSchema,
});
export type WorldState = z.infer<typeof WorldStateSchema>;
