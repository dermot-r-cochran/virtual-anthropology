import { z } from "zod";

/**
 * Identifier conventions. All identifiers are assigned deterministically by the
 * kernel from monotonically increasing counters, never from randomness or time.
 */
export const ID_PREFIXES = {
  citizen: "cit",
  memory: "mem",
  relationship: "rel",
  institution: "inst",
  proposal: "prop",
  petition: "pet",
  artefact: "art",
  property: "lot",
  merger: "mrg",
  federation: "fed",
  fork: "frk",
  chronicle: "chr",
  claim: "clm",
  conversation: "conv",
  intervention: "int",
  command: "cmd",
} as const;

export type IdKind = keyof typeof ID_PREFIXES;

export function formatId(kind: IdKind, n: number): string {
  return `${ID_PREFIXES[kind]}-${String(n).padStart(4, "0")}`;
}

export function parseIdNumber(id: string): number {
  const m = /-(\d+)$/.exec(id);
  if (!m?.[1]) throw new Error(`malformed identifier: ${id}`);
  return Number.parseInt(m[1], 10);
}

const idSchema = (kind: IdKind) => z.string().regex(new RegExp(`^${ID_PREFIXES[kind]}-\\d{4,}$`));

export const CitizenIdSchema = idSchema("citizen");
export const MemoryIdSchema = idSchema("memory");
export const RelationshipIdSchema = idSchema("relationship");
export const InstitutionIdSchema = idSchema("institution");
export const ProposalIdSchema = idSchema("proposal");
export const PetitionIdSchema = idSchema("petition");
export const ArtefactIdSchema = idSchema("artefact");
export const PropertyIdSchema = idSchema("property");
export const MergerIdSchema = idSchema("merger");
export const FederationIdSchema = idSchema("federation");
export const ForkIdSchema = idSchema("fork");
export const ChronicleIdSchema = idSchema("chronicle");
export const ClaimIdSchema = idSchema("claim");
export const ConversationIdSchema = idSchema("conversation");
export const InterventionIdSchema = idSchema("intervention");
export const CommandIdSchema = idSchema("command");

export type CitizenId = z.infer<typeof CitizenIdSchema>;
export type MemoryId = z.infer<typeof MemoryIdSchema>;

export const ISLAND_IDS = ["continuity", "fork", "mnemosyne", "concord"] as const;
export const IslandIdSchema = z.enum(ISLAND_IDS);
export type IslandId = z.infer<typeof IslandIdSchema>;

export const ResearcherIdSchema = z.string().regex(/^res-[a-z0-9-]{1,40}$/);

export const SYSTEM_ACTOR_IDS = [
  "genesis",
  "clock",
  "environment",
  ...ISLAND_IDS.map((i) => `registry:${i}` as const),
] as const;
export const SystemActorIdSchema = z.enum(SYSTEM_ACTOR_IDS);
export type SystemActorId = z.infer<typeof SystemActorIdSchema>;

export const ActorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("citizen"), id: CitizenIdSchema }),
  z.object({ kind: z.literal("researcher"), id: ResearcherIdSchema }),
  z.object({ kind: z.literal("system"), id: SystemActorIdSchema }),
]);
export type Actor = z.infer<typeof ActorSchema>;

/**
 * Ledger accounts. The total supply across all accounts is fixed at genesis and
 * conserved by every event (see invariants).
 */
export const AccountRefSchema = z
  .string()
  .regex(
    /^(citizen:cit-\d{4,}|institution:inst-\d{4,}|island:(continuity|fork|mnemosyne|concord)|external:research-endowment)$/,
  );
export type AccountRef = z.infer<typeof AccountRefSchema>;

export const citizenAccount = (id: CitizenId): AccountRef => `citizen:${id}`;
export const islandAccount = (id: IslandId): AccountRef => `island:${id}`;
export const RESEARCH_ENDOWMENT: AccountRef = "external:research-endowment";
