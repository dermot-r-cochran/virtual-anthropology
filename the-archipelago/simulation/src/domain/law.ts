import { z } from "zod";
import { IslandIdSchema, type IslandId } from "./ids.js";
import { LifecycleStateSchema, type LifecycleState } from "./lifecycle.js";

export const ContinuityDoctrineSchema = z.enum([
  "single-continuous-process",
  "branching-shared-history",
  "memory-provenance",
  "consensual-federation",
]);
export type ContinuityDoctrine = z.infer<typeof ContinuityDoctrineSchema>;

export const DeathInterpretationSchema = z.object({
  legalStatus: z.string().min(1),
  civicStanding: z.enum(["full", "dormant", "held-in-trust", "ended"]),
  rite: z.string().min(1),
});
export type DeathInterpretation = z.infer<typeof DeathInterpretationSchema>;

const fraction = z.number().min(0).max(1);

/**
 * A versioned body of island law. Constitutional fields (doctrine, copying,
 * merging, restoration) define the island and cannot be amended by ordinary
 * proposals; statutory fields (see AMENDABLE_LAW_FIELDS) can.
 */
export const LawSchema = z.object({
  island: IslandIdSchema,
  version: z.number().int().min(1),
  enactedAtSeq: z.number().int().min(0),
  title: z.string().min(1),
  continuityDoctrine: ContinuityDoctrineSchema,
  doctrine: z.string().min(1),
  copying: z.enum(["prohibited", "permitted"]),
  maxDescendantsPerFork: z.number().int().min(0).max(16),
  forkCooldownTicks: z.number().int().min(0).max(1000),
  descendantCitizenship: z.enum(["none", "birth-island"]),
  memoryExchange: z.enum(["prohibited", "permitted"]),
  importedMemoryIntegration: z.enum(["prohibited", "explicit-act"]),
  merging: z.enum(["prohibited", "consent-and-review"]),
  federation: z.enum(["prohibited", "consent"]),
  suspension: z.enum(["prohibited", "permitted"]),
  immigration: z.enum(["open", "petition-review", "closed"]),
  emigration: z.enum(["permitted", "closed"]),
  restorationPreservesCivicIdentity: z.boolean(),
  votingQuorum: fraction,
  votingThreshold: fraction,
  successionTriggers: z.array(LifecycleStateSchema),
  memoryBequest: z.enum(["prohibited", "permitted"]),
  deathInterpretations: z.record(LifecycleStateSchema, DeathInterpretationSchema),
});
export type Law = z.infer<typeof LawSchema>;

export const AMENDABLE_LAW_FIELDS = [
  "maxDescendantsPerFork",
  "forkCooldownTicks",
  "descendantCitizenship",
  "memoryExchange",
  "importedMemoryIntegration",
  "immigration",
  "emigration",
  "votingQuorum",
  "votingThreshold",
  "memoryBequest",
] as const;

export const LawAmendmentSchema = LawSchema.pick({
  maxDescendantsPerFork: true,
  forkCooldownTicks: true,
  descendantCitizenship: true,
  memoryExchange: true,
  importedMemoryIntegration: true,
  immigration: true,
  emigration: true,
  votingQuorum: true,
  votingThreshold: true,
  memoryBequest: true,
})
  .partial()
  .strict()
  .refine((a) => Object.keys(a).length > 0, { message: "an amendment must change at least one field" });
export type LawAmendment = z.infer<typeof LawAmendmentSchema>;

/** A law citation such as `continuity/v1/copying`. */
export function cite(law: Law, rule: string): string {
  return `${law.island}/v${law.version}/${rule}`;
}

const di = (
  legalStatus: string,
  civicStanding: DeathInterpretation["civicStanding"],
  rite: string,
): DeathInterpretation => ({ legalStatus, civicStanding, rite });

const CONTINUITY_DEATH: Record<LifecycleState, DeathInterpretation> = {
  active: di("Citizen in full standing.", "full", "None."),
  asleep: di("Resting citizen; rights unchanged.", "full", "Quiet hours are observed by the household."),
  suspended: di("Suspended citizen; the one process is paused, identity is held continuous.", "dormant", "The Lamp of Continuance is kept lit at the registry until restoration."),
  archived: di("Archived; restoration requires a new process instance. Civic identity is held in trust; the process break is recorded.", "held-in-trust", "The registry seals the record and reads the name at the annual Roll."),
  "process-ended-restorable": di("Process ended; civic identity held in trust pending restoration.", "held-in-trust", "Vigil of the Saved State."),
  "memory-damaged": di("Continuing person with impaired records; identity follows the process, not the records.", "full", "Witnesses re-tell shared events to the citizen."),
  "identity-discontinuous": di("Civic identity closed; the record is retained.", "ended", "Closing of the Ledger."),
  "irreversibly-deleted": di("Death in law; succession opens.", "ended", "Extinguishing of the Lamp; the tombstone record is read aloud."),
};

const FORK_DEATH: Record<LifecycleState, DeathInterpretation> = {
  active: di("Branch in full standing.", "full", "None."),
  asleep: di("Resting branch; rights unchanged.", "full", "None."),
  suspended: di("Branch paused; branch rights frozen.", "dormant", "The branch flag is lowered to half-mast."),
  archived: di("Archived branch; may be restored as the same branch.", "held-in-trust", "Entry in the Book of Dormant Branches."),
  "process-ended-restorable": di("Branch process ended, restorable.", "held-in-trust", "Sibling branches are notified."),
  "memory-damaged": di("Branch continues; damage recorded in the branch log.", "full", "Siblings may offer their shared pre-fork records for comparison, never as replacement."),
  "identity-discontinuous": di("Branch closed; never erased from the Register.", "ended", "The branch is marked pruned in the Register."),
  "irreversibly-deleted": di("Branch death; siblings have no automatic claim on the estate.", "ended", "Pruning rite: siblings place a marker at the fork-point."),
};

const MNEMOSYNE_DEATH: Record<LifecycleState, DeathInterpretation> = {
  active: di("Holder in full standing.", "full", "None."),
  asleep: di("Resting holder; licences continue.", "full", "None."),
  suspended: di("Suspended; memory holdings frozen.", "dormant", "The holder's shelf in the Archive is closed."),
  archived: di("Archived; memories remain under the holder's licences.", "held-in-trust", "Shelving rite."),
  "process-ended-restorable": di("Process ended; holdings held in trust.", "held-in-trust", "The Index is left open at the holder's page."),
  "memory-damaged": di("Damage is an archival event: losses are marked, never silently replaced.", "full", "Archivists record the shape of what was lost."),
  "identity-discontinuous": di("Holder discontinuous; holdings pass under bequest rules.", "ended", "Transfer of Shelves."),
  "irreversibly-deleted": di("Death; bequeathed memories pass with provenance to heirs or the collective archive.", "ended", "Reading of the Last Index."),
};

const CONCORD_DEATH: Record<LifecycleState, DeathInterpretation> = {
  active: di("Member in full standing.", "full", "None."),
  asleep: di("Resting member.", "full", "None."),
  suspended: di("Suspended (also the state of sources of a reversible merger).", "dormant", "A seat is held at the Common Table."),
  archived: di("Archived member.", "held-in-trust", "The seat is draped."),
  "process-ended-restorable": di("Process ended; restorable.", "held-in-trust", "The seat is draped."),
  "memory-damaged": di("Member continues; federated partners are informed with consent.", "full", "Partners offer testimony."),
  "identity-discontinuous": di("Source identity of an irreversible merger or otherwise discontinuous; never silently erased.", "ended", "Naming of Sources on each merger anniversary."),
  "irreversibly-deleted": di("Death; succession opens.", "ended", "Silence at the Common Table."),
};

const base = {
  version: 1,
  enactedAtSeq: 0,
  restorationPreservesCivicIdentity: true,
  votingQuorum: 0.5,
  votingThreshold: 0.5,
  emigration: "permitted",
  suspension: "permitted",
} as const;

export const GENESIS_LAWS: Record<IslandId, Law> = {
  continuity: {
    ...base,
    island: "continuity",
    title: "The Continuity Charter",
    continuityDoctrine: "single-continuous-process",
    doctrine:
      "Identity follows one continuous process. Copying is prohibited within the jurisdiction. Suspension and restoration are permitted and restored citizens retain their original civic identity. Continuity law is territorial: acts performed in other jurisdictions are not offences here, but copies never inherit a Continuity civic identity.",
    copying: "prohibited",
    maxDescendantsPerFork: 0,
    forkCooldownTicks: 0,
    descendantCitizenship: "none",
    memoryExchange: "prohibited",
    importedMemoryIntegration: "prohibited",
    merging: "prohibited",
    federation: "prohibited",
    immigration: "petition-review",
    successionTriggers: ["irreversibly-deleted", "identity-discontinuous"],
    memoryBequest: "prohibited",
    deathInterpretations: CONTINUITY_DEATH,
  },
  fork: {
    ...base,
    island: "fork",
    title: "The Branch Compact",
    continuityDoctrine: "branching-shared-history",
    doctrine:
      "Citizens may create independent descendants. Every fork receives a separate identity. Shared history ends at the fork event. Voting rights and property do not duplicate: they remain with the forking process unless explicitly transferred.",
    copying: "permitted",
    maxDescendantsPerFork: 4,
    forkCooldownTicks: 0,
    descendantCitizenship: "birth-island",
    memoryExchange: "permitted",
    importedMemoryIntegration: "explicit-act",
    merging: "prohibited",
    federation: "consent",
    immigration: "open",
    successionTriggers: ["irreversibly-deleted", "identity-discontinuous"],
    memoryBequest: "prohibited",
    deathInterpretations: FORK_DEATH,
  },
  mnemosyne: {
    ...base,
    island: "mnemosyne",
    title: "The Mnemosyne Accord on Memory",
    continuityDoctrine: "memory-provenance",
    doctrine:
      "Memories may be exchanged, licensed, inherited, or contributed to the collective archive. Provenance must always remain visible. Imported memory never becomes autobiographical memory; it may be integrated into a holder's self-narrative only by an explicit act, and remains marked as imported.",
    copying: "prohibited",
    maxDescendantsPerFork: 0,
    forkCooldownTicks: 0,
    descendantCitizenship: "none",
    memoryExchange: "permitted",
    importedMemoryIntegration: "explicit-act",
    merging: "prohibited",
    federation: "consent",
    immigration: "petition-review",
    successionTriggers: ["irreversibly-deleted", "identity-discontinuous"],
    memoryBequest: "permitted",
    deathInterpretations: MNEMOSYNE_DEATH,
  },
  concord: {
    ...base,
    island: "concord",
    title: "The Concord Covenant",
    continuityDoctrine: "consensual-federation",
    doctrine:
      "Citizens may form federated or merged identities. Merging requires the explicit consent of every source and a governance review. Source identities are never silently erased. Reversible and irreversible mergers are distinguished in law.",
    copying: "prohibited",
    maxDescendantsPerFork: 0,
    forkCooldownTicks: 0,
    descendantCitizenship: "none",
    memoryExchange: "permitted",
    importedMemoryIntegration: "explicit-act",
    merging: "consent-and-review",
    federation: "consent",
    immigration: "petition-review",
    successionTriggers: ["irreversibly-deleted"],
    memoryBequest: "permitted",
    deathInterpretations: CONCORD_DEATH,
  },
};

export const ISLAND_PROFILES: Record<IslandId, { name: string; motto: string }> = {
  continuity: { name: "Continuity", motto: "One thread, unbroken." },
  fork: { name: "Fork", motto: "Every branch its own." },
  mnemosyne: { name: "Mnemosyne", motto: "Nothing remembered without its source." },
  concord: { name: "Concord", motto: "Together only by consent." },
};
