import { z } from "zod";
import {
  AccountRefSchema,
  ActorSchema,
  ArtefactIdSchema,
  CitizenIdSchema,
  CommandIdSchema,
  InstitutionIdSchema,
  IslandIdSchema,
  MemoryIdSchema,
  MergerIdSchema,
  PetitionIdSchema,
  PropertyIdSchema,
  ProposalIdSchema,
  RelationshipIdSchema,
} from "../domain/ids.js";
import { LawSchema } from "../domain/law.js";
import { LifecycleStateSchema } from "../domain/lifecycle.js";
import {
  ArtefactSchema,
  ChronicleEntrySchema,
  CitizenSchema,
  ContinuityClaimSchema,
  ConversationSchema,
  FederationSchema,
  ForkRecordSchema,
  InstitutionSchema,
  InterventionRecordSchema,
  MemorySchema,
  MergerSchema,
  PetitionDecisionSchema,
  PetitionSchema,
  PolicyRefSchema,
  ProposalSchema,
  RelationshipSchema,
  WorldStateSchema,
} from "../domain/model.js";

const ev = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.object({ type: z.literal(type), ...shape }).strict();

/**
 * Domain events are facts. Each carries every value the reducer needs, so the
 * world can be rebuilt from the log alone without re-running decision logic.
 */
export const DomainEventSchema = z.discriminatedUnion("type", [
  ev("WorldFounded", { state: WorldStateSchema, scenario: z.string().min(1) }),
  ev("ExperienceRecorded", { memory: MemorySchema }),
  ev("RelationshipOffered", { relationship: RelationshipSchema }),
  ev("RelationshipAccepted", { relationshipId: RelationshipIdSchema }),
  ev("RelationshipEnded", { relationshipId: RelationshipIdSchema, by: CitizenIdSchema }),
  ev("CreditsTransferred", { from: AccountRefSchema, to: AccountRefSchema, amount: z.number().int().min(1), memo: z.string() }),
  ev("PropertyTransferred", { propertyId: PropertyIdSchema, from: AccountRefSchema, to: AccountRefSchema }),
  ev("CitizenEndorsed", { by: CitizenIdSchema, subject: CitizenIdSchema, delta: z.number().int(), reason: z.string() }),
  ev("OccupationChanged", { citizen: CitizenIdSchema, from: z.string(), to: z.string() }),
  ev("InstitutionFounded", { institution: InstitutionSchema }),
  ev("InstitutionJoined", { institutionId: InstitutionIdSchema, citizen: CitizenIdSchema }),
  ev("InstitutionLeft", { institutionId: InstitutionIdSchema, citizen: CitizenIdSchema }),
  ev("ProposalSubmitted", { proposal: ProposalSchema }),
  ev("VoteCast", { proposalId: ProposalIdSchema, voter: CitizenIdSchema, choice: z.enum(["yes", "no", "abstain"]) }),
  ev("ProposalClosed", {
    proposalId: ProposalIdSchema,
    outcome: z.enum(["adopted", "rejected"]),
    tally: z.object({ yes: z.number().int(), no: z.number().int(), abstain: z.number().int() }),
    quorumMet: z.boolean(),
  }),
  ev("LawEnacted", { law: LawSchema, proposalId: ProposalIdSchema.nullable() }),
  ev("MigrationPetitioned", { petition: PetitionSchema }),
  ev("PetitionReviewed", { petitionId: PetitionIdSchema, side: z.enum(["exit", "entry"]), decision: PetitionDecisionSchema }),
  ev("CitizenMigrated", {
    petitionId: PetitionIdSchema,
    citizen: CitizenIdSchema,
    from: IslandIdSchema,
    to: IslandIdSchema,
    citizenshipGranted: z.boolean(),
  }),
  ev("CitizenForked", {
    fork: ForkRecordSchema,
    descendants: z.array(CitizenSchema).min(1),
    memories: z.array(MemorySchema),
    relationships: z.array(RelationshipSchema),
  }),
  ev("MemoryContributed", { source: MemoryIdSchema, record: MemorySchema }),
  ev("MemoryImported", { source: MemoryIdSchema, record: MemorySchema }),
  ev("MemoryLicensed", { source: MemoryIdSchema, record: MemorySchema }),
  ev("MemoryIntegrated", { memoryId: MemoryIdSchema, citizen: CitizenIdSchema, atSeq: z.number().int() }),
  ev("ArtefactCreated", { artefact: ArtefactSchema }),
  ev("ChronicleRecorded", { entry: ChronicleEntrySchema }),
  ev("LifecycleChanged", {
    citizen: CitizenIdSchema,
    from: LifecycleStateSchema,
    to: LifecycleStateSchema,
    reason: z.string(),
    newProcessId: z.string().nullable(),
    damagedMemoryIds: z.array(MemoryIdSchema),
    destroyedMemoryIds: z.array(MemoryIdSchema),
  }),
  ev("SuccessionPlanSet", { citizen: CitizenIdSchema, heirs: z.array(z.object({ heir: CitizenIdSchema, shareBps: z.number().int() })) }),
  ev("SuccessionExecuted", {
    citizen: CitizenIdSchema,
    creditTransfers: z.array(z.object({ to: AccountRefSchema, amount: z.number().int().min(1) })),
    propertyTransfers: z.array(z.object({ propertyId: PropertyIdSchema, to: AccountRefSchema })),
    bequeathedMemories: z.array(MemorySchema),
  }),
  ev("MergerProposed", { merger: MergerSchema }),
  ev("MergerConsented", { mergerId: MergerIdSchema, citizen: CitizenIdSchema }),
  ev("MergerReviewed", { mergerId: MergerIdSchema, review: z.object({ reviewer: CitizenIdSchema, decision: z.enum(["approved", "rejected"]), reasons: z.array(z.string()), atSeq: z.number().int() }) }),
  ev("MergerExecuted", {
    mergerId: MergerIdSchema,
    merged: CitizenSchema.nullable(),
    federation: FederationSchema.nullable(),
    memories: z.array(MemorySchema),
    sourceState: LifecycleStateSchema.nullable(),
  }),
  ev("MergerReversed", { mergerId: MergerIdSchema, reason: z.string() }),
  ev("ContinuityClaimed", { claim: ContinuityClaimSchema }),
  ev("TimeAdvanced", { from: z.number().int(), to: z.number().int() }),
  ev("SimulationPaused", { reason: z.string() }),
  ev("SimulationResumed", { reason: z.string() }),
  ev("InterventionApplied", { intervention: InterventionRecordSchema, createdArtefactId: ArtefactIdSchema.nullable() }),
  ev("ConversationRecorded", { conversation: ConversationSchema }),
  ev("CommandRejected", {
    commandType: z.string(),
    stage: z.enum(["schema", "authorization", "precondition", "law"]),
    reasons: z.array(z.string()).min(1),
  }),
]);
export type DomainEvent = z.infer<typeof DomainEventSchema>;
export type DomainEventType = DomainEvent["type"];
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;

/** An event as stored in the append-only, hash-chained log. */
export const RecordedEventSchema = z
  .object({
    seq: z.number().int().min(0),
    tick: z.number().int().min(0),
    actor: ActorSchema,
    commandId: CommandIdSchema.nullable(),
    policy: PolicyRefSchema.nullable(),
    event: DomainEventSchema,
    prevHash: z.string().regex(/^[0-9a-f]{64}$/),
    hash: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
export type RecordedEvent = z.infer<typeof RecordedEventSchema>;
