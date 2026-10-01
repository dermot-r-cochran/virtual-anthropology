import { z } from "zod";
import {
  AccountRefSchema,
  CitizenIdSchema,
  InstitutionIdSchema,
  IslandIdSchema,
  MemoryIdSchema,
  MergerIdSchema,
  PetitionIdSchema,
  PropertyIdSchema,
  ProposalIdSchema,
  RelationshipIdSchema,
} from "../domain/ids.js";
import { LawAmendmentSchema } from "../domain/law.js";
import { LifecycleStateSchema } from "../domain/lifecycle.js";
import { ArtefactSchema, InstitutionSchema, InterventionSpecSchema, PersonStageRefSchema, RelationshipSchema } from "../domain/model.js";

const text = z.string().min(1).max(4000);
const name = z.string().min(1).max(120);

const cmd = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.object({ type: z.literal(type), ...shape }).strict();

/**
 * Commands are requests to change the world. Only commands that pass schema
 * validation, authorisation and island law are turned into events.
 */
export const CommandSchema = z.discriminatedUnion("type", [
  cmd("RecordExperience", { citizen: CitizenIdSchema, content: text, tags: z.array(z.string().min(1)).max(8) }),
  cmd("OfferRelationship", { from: CitizenIdSchema, to: CitizenIdSchema, kind: RelationshipSchema.shape.kind.exclude(["fork-kin"]) }),
  cmd("AcceptRelationship", { relationshipId: RelationshipIdSchema, by: CitizenIdSchema }),
  cmd("EndRelationship", { relationshipId: RelationshipIdSchema, by: CitizenIdSchema }),
  cmd("TransferCredits", { from: AccountRefSchema, to: AccountRefSchema, amount: z.number().int().min(1), memo: z.string().max(200) }),
  cmd("TransferProperty", { propertyId: PropertyIdSchema, to: AccountRefSchema }),
  cmd("Endorse", { by: CitizenIdSchema, subject: CitizenIdSchema, delta: z.union([z.literal(1), z.literal(-1)]), reason: text }),
  cmd("ChangeOccupation", { citizen: CitizenIdSchema, occupation: name }),
  cmd("FoundInstitution", {
    founder: CitizenIdSchema,
    island: IslandIdSchema,
    name,
    kind: InstitutionSchema.shape.kind.exclude(["registry"]),
    charter: text,
  }),
  cmd("JoinInstitution", { institutionId: InstitutionIdSchema, citizen: CitizenIdSchema }),
  cmd("LeaveInstitution", { institutionId: InstitutionIdSchema, citizen: CitizenIdSchema }),
  cmd("SubmitProposal", {
    proposer: CitizenIdSchema,
    island: IslandIdSchema,
    title: name,
    rationale: text,
    amendment: LawAmendmentSchema.nullable(),
    closesAtTick: z.number().int().min(0),
  }),
  cmd("CastVote", { proposalId: ProposalIdSchema, voter: CitizenIdSchema, choice: z.enum(["yes", "no", "abstain"]) }),
  cmd("CloseProposal", { proposalId: ProposalIdSchema }),
  /** A study-declared amendment, enacted by the system actor `study` at a timeline branch point; recorded as LawEnacted with no proposal. */
  cmd("EnactAmendment", { island: IslandIdSchema, amendment: LawAmendmentSchema }),
  cmd("PetitionMigration", { citizen: CitizenIdSchema, to: IslandIdSchema, reason: text }),
  cmd("ReviewPetition", { petitionId: PetitionIdSchema, side: z.enum(["exit", "entry"]) }),
  cmd("CompleteMigration", { petitionId: PetitionIdSchema }),
  cmd("ForkCitizen", { citizen: CitizenIdSchema, descendantNames: z.array(name).min(1).max(16) }),
  cmd("ContributeMemory", { citizen: CitizenIdSchema, memoryId: MemoryIdSchema, archive: IslandIdSchema }),
  cmd("ImportMemory", { citizen: CitizenIdSchema, memoryId: MemoryIdSchema }),
  cmd("LicenseMemory", { licensor: CitizenIdSchema, memoryId: MemoryIdSchema, licensee: CitizenIdSchema, terms: text }),
  cmd("IntegrateMemory", { citizen: CitizenIdSchema, memoryId: MemoryIdSchema }),
  cmd("CreateArtefact", {
    authors: z.array(CitizenIdSchema).min(1),
    island: IslandIdSchema,
    kind: ArtefactSchema.shape.kind,
    title: name,
    body: text,
  }),
  cmd("RecordChronicle", { chronicler: CitizenIdSchema, island: IslandIdSchema, text, references: z.array(z.number().int().min(0)) }),
  cmd("ChangeLifecycle", {
    citizen: CitizenIdSchema,
    to: LifecycleStateSchema,
    reason: text,
    damagedMemoryIds: z.array(MemoryIdSchema).default([]),
  }),
  cmd("SetSuccessionPlan", {
    citizen: CitizenIdSchema,
    heirs: z.array(z.object({ heir: CitizenIdSchema, shareBps: z.number().int().min(1).max(10000) })).min(1),
  }),
  cmd("ExecuteSuccession", { citizen: CitizenIdSchema }),
  cmd("ProposeMerger", {
    initiator: CitizenIdSchema,
    sources: z.array(CitizenIdSchema).min(2).max(8),
    mode: z.enum(["merge", "federate"]),
    reversibility: z.enum(["reversible", "irreversible"]),
    name,
  }),
  cmd("ConsentToMerger", { mergerId: MergerIdSchema, citizen: CitizenIdSchema }),
  cmd("ReviewMerger", { mergerId: MergerIdSchema, reviewer: CitizenIdSchema, decision: z.enum(["approved", "rejected"]), reasons: z.array(text).min(1) }),
  cmd("ExecuteMerger", { mergerId: MergerIdSchema }),
  cmd("ReverseMerger", { mergerId: MergerIdSchema, reason: text }),
  cmd("ClaimContinuity", { claimant: CitizenIdSchema, subject: PersonStageRefSchema, statement: text, grounds: z.array(z.string().min(1)).min(1) }),
  cmd("AdvanceTime", { ticks: z.number().int().min(1).max(1000) }),
  cmd("PauseSimulation", { reason: text }),
  cmd("ResumeSimulation", { reason: text }),
  cmd("ResearcherIntervention", { spec: InterventionSpecSchema, justification: text }),
  cmd("RecordConversation", {
    citizen: CitizenIdSchema,
    researcherUtterance: text,
    citizenReply: text,
    guardFlags: z.array(z.string()),
  }),
]);

export type Command = z.infer<typeof CommandSchema>;
export type CommandInput = z.input<typeof CommandSchema>;
export type CommandType = Command["type"];
export type CommandOf<T extends CommandType> = Extract<Command, { type: T }>;
