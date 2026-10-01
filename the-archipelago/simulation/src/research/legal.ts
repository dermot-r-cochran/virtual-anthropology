import { ISLAND_IDS, type IslandId } from "../domain/ids.js";
import { cite, type Law } from "../domain/law.js";
import type { WorldState } from "../domain/model.js";
import type { RecordedEvent } from "../kernel/events.js";
import type { ClaimantEvidence, ContinuityEvidence } from "./evidence.js";

export type Standing =
  | "recognised-as-continuing-civic-person"
  | "distinct-person-without-claim-to-civic-identity"
  | "branch-sharing-history"
  | "continuity-by-memory-provenance"
  | "continuity-by-memory-provenance-with-foreign-records"
  | "individual-not-federated";

export interface ClaimantReading {
  readonly claimant: string;
  readonly standing: Standing;
  /** Whether this island's law treats the claimant as continuing the subject: true, false, or null (not adjudicated). */
  readonly recognisesContinuity: boolean | null;
  readonly reasoning: readonly string[];
  readonly citations: readonly string[];
}

export interface IslandInterpretation {
  readonly island: IslandId;
  readonly lawVersion: number;
  readonly doctrine: Law["continuityDoctrine"];
  readonly doctrineText: string;
  readonly readings: readonly ClaimantReading[];
  readonly summary: string;
  /** Registry findings recorded during petitions in this scenario (the legal record). */
  readonly registryRecord: ReadonlyArray<{ seq: number; petitionId: string; side: string; decision: string; findings: readonly string[]; citations: readonly string[] }>;
}

function read(law: Law, e: ClaimantEvidence): ClaimantReading {
  const c = (rule: string) => cite(law, rule);
  switch (law.continuityDoctrine) {
    case "single-continuous-process":
      return e.process.sameProcessId && e.civic.sameCivicId
        ? {
            claimant: e.claimant,
            standing: "recognised-as-continuing-civic-person",
            recognisesContinuity: true,
            reasoning: [
              `process ${e.process.processId} is the process that existed before the reference event`,
              `civic identity ${e.civic.civicId} is unchanged`,
              "the copy event occurred outside this jurisdiction; it is not an offence here",
            ],
            citations: [c("doctrine"), c("territoriality")],
          }
        : {
            claimant: e.claimant,
            standing: "distinct-person-without-claim-to-civic-identity",
            recognisesContinuity: false,
            reasoning: [
              `process ${e.process.processId} began at a copy event; identity follows one continuous process`,
              `shared pre-copy records (${e.memory.sharedWithSubject}) are recognised as records, not as identity`,
              "the person may be admitted as a distinct person; copying itself is prohibited within Continuity",
            ],
            citations: [c("doctrine"), c("copying"), c("territoriality")],
          };
    case "branching-shared-history":
      return {
        claimant: e.claimant,
        standing: "branch-sharing-history",
        recognisesContinuity: true,
        reasoning: [
          e.lineage.relation === "same-record"
            ? "the parent branch retains the original register entry by convention, which confers no priority of identity"
            : `a separate identity (${e.civic.civicId}) created at the fork`,
          `history up to the fork is shared (${e.memory.sharedWithSubject}/${e.memory.subjectSelfNarrative} self-narrative records); each branch's history after it is its own`,
          "voting rights and property did not duplicate",
        ],
        citations: [c("doctrine"), c("copying"), c("descendant-citizenship")],
      };
    case "memory-provenance": {
      const foreign = e.memory.importedHeld + e.memory.integratedForeign;
      return {
        claimant: e.claimant,
        standing: foreign > 0 ? "continuity-by-memory-provenance-with-foreign-records" : "continuity-by-memory-provenance",
        recognisesContinuity: e.memory.sharedFraction > 0,
        reasoning: [
          `${e.memory.sharedWithSubject} records carry provenance back to the subject's experience`,
          foreign > 0
            ? `${e.memory.importedHeld} imported and ${e.memory.integratedForeign} integrated records are excluded from continuity evidence; integration is an explicit act and does not erase origin`
            : "no imported records are held",
          "continuity is read as a matter of degree in verifiable autobiographical provenance; several holders may share it",
        ],
        citations: [c("doctrine"), c("memory-exchange"), c("integration")],
      };
    }
    case "consensual-federation":
      return {
        claimant: e.claimant,
        standing: "individual-not-federated",
        recognisesContinuity: null,
        reasoning: [
          "no merger or federation among the claimants is recorded",
          "Concord does not adjudicate continuity absent a petition; the claimants could federate by explicit consent",
        ],
        citations: [c("doctrine"), c("federation"), c("merging")],
      };
  }
}

const SUMMARY: Record<Law["continuityDoctrine"], string> = {
  "single-continuous-process": "Continuity recognises exactly one continuer: the record whose process never broke. Descendants are distinct persons.",
  "branching-shared-history": "Fork recognises every claimant as a branch with equal title to the shared pre-fork history and separate identities thereafter.",
  "memory-provenance": "Mnemosyne reads continuity through verifiable memory provenance; it is graded, shareable, and excludes imported records.",
  "consensual-federation": "Concord treats continuity as constituted by consent and governance; absent a federation it recognises three individuals and adjudicates nothing.",
};

/** Each island's reading of the same evidence under its current law. */
export function legalInterpretations(s: WorldState, log: readonly RecordedEvent[], evidence: ContinuityEvidence): IslandInterpretation[] {
  return ISLAND_IDS.map((island) => {
    const law = s.islands[island].law;
    const registryRecord = log.flatMap((r) =>
      r.event.type === "PetitionReviewed" && r.event.decision.island === island
        ? [{ seq: r.seq, petitionId: r.event.petitionId, side: r.event.side, decision: r.event.decision.decision, findings: r.event.decision.findings, citations: r.event.decision.citations }]
        : [],
    );
    return {
      island,
      lawVersion: law.version,
      doctrine: law.continuityDoctrine,
      doctrineText: law.doctrine,
      readings: evidence.claimants.map((e) => read(law, e)),
      summary: SUMMARY[law.continuityDoctrine],
      registryRecord,
    };
  });
}
