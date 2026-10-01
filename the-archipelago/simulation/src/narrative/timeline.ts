import type { WorldState } from "../domain/model.js";
import type { RecordedEvent } from "../kernel/events.js";

export interface TimelineEntry {
  readonly seq: number;
  readonly tick: number;
  readonly actor: string;
  readonly type: string;
  readonly summary: string;
  readonly beat: string | null;
  readonly citizens: readonly string[];
  readonly hash: string;
}

/**
 * Narrative rendering of the canonical log. Pure presentation: it reads
 * events and final names, and never feeds back into the simulation.
 */
export function summarizeEvent(rec: RecordedEvent, s: WorldState): string {
  const n = (id: string) => (s.citizens[id] ? `${s.citizens[id].name} (${id})` : id);
  const e = rec.event;
  switch (e.type) {
    case "WorldFounded": return `The Archipelago is founded for scenario "${e.scenario}" with ${Object.keys(e.state.citizens).length} citizens on four islands.`;
    case "ExperienceRecorded": return `${n(e.memory.experiencedBy)} records an experience on ${e.memory.island}: "${e.memory.content}"`;
    case "RelationshipOffered": return `${n(e.relationship.a)} offers a ${e.relationship.kind} relationship to ${n(e.relationship.b)}.`;
    case "RelationshipAccepted": return `Relationship ${e.relationshipId} is accepted.`;
    case "RelationshipEnded": return `Relationship ${e.relationshipId} is ended by ${n(e.by)}.`;
    case "CreditsTransferred": return `${e.amount} credits move from ${e.from} to ${e.to} (${e.memo}).`;
    case "PropertyTransferred": return `Property ${e.propertyId} passes from ${e.from} to ${e.to}.`;
    case "CitizenEndorsed": return `${n(e.by)} endorses ${n(e.subject)} (${e.delta > 0 ? "+" : ""}${e.delta}): ${e.reason}`;
    case "OccupationChanged": return `${n(e.citizen)} changes occupation from ${e.from} to ${e.to}.`;
    case "InstitutionFounded": return `${e.institution.name} is founded on ${e.institution.island}.`;
    case "InstitutionJoined": return `${n(e.citizen)} joins ${e.institutionId}.`;
    case "InstitutionLeft": return `${n(e.citizen)} leaves ${e.institutionId}.`;
    case "ProposalSubmitted": return `${n(e.proposal.proposer)} proposes "${e.proposal.title}" on ${e.proposal.island}; electorate of ${e.proposal.electorate.length} snapshotted; closes at tick ${e.proposal.closesAtTick}.`;
    case "VoteCast": return `${n(e.voter)} votes ${e.choice} on ${e.proposalId}.`;
    case "ProposalClosed": return `${e.proposalId} is ${e.outcome} (yes ${e.tally.yes}, no ${e.tally.no}, abstain ${e.tally.abstain}; quorum ${e.quorumMet ? "met" : "not met"}).`;
    case "LawEnacted": return `Law of ${e.law.island} v${e.law.version} is enacted${e.proposalId ? ` by ${e.proposalId}` : ""}.`;
    case "MigrationPetitioned": return `${n(e.petition.citizen)} petitions to migrate ${e.petition.from} → ${e.petition.to}: "${e.petition.reason}"`;
    case "PetitionReviewed": return `The ${e.decision.island} registry ${e.decision.decision} the ${e.side} side of ${e.petitionId} under law v${e.decision.lawVersion}. Findings: ${e.decision.findings.join("; ")}.`;
    case "CitizenMigrated": return `${n(e.citizen)} migrates ${e.from} → ${e.to}${e.citizenshipGranted ? `, gaining ${e.to} citizenship` : ""}.`;
    case "CitizenForked": return `${n(e.fork.parent)} forks on ${e.fork.island} (${e.fork.id}), creating ${e.descendants.map((d) => `${d.name} (${d.id}, ${d.civicId})`).join(" and ")}. Shared history ends here.`;
    case "MemoryContributed": return `${e.record.experiencedBy} contributes memory ${e.source} to the ${e.record.archive} archive as ${e.record.id}.`;
    case "MemoryImported": return `${n(e.record.holder ?? "")} imports archive memory ${e.source} as ${e.record.id} (experienced by ${n(e.record.experiencedBy)}; marked imported, not autobiographical).`;
    case "MemoryLicensed": return `Memory ${e.source} is licensed to ${n(e.record.holder ?? "")} as ${e.record.id}.`;
    case "MemoryIntegrated": return `${n(e.citizen)} explicitly integrates imported memory ${e.memoryId} into their self-narrative; its provenance still shows external origin.`;
    case "ArtefactCreated": return `${e.artefact.introducedBy ? `Researcher ${e.artefact.introducedBy} introduces` : `${e.artefact.authors.map(n).join(", ")} create${e.artefact.authors.length > 1 ? "" : "s"}`} the ${e.artefact.kind} "${e.artefact.title}" on ${e.artefact.island}.`;
    case "ChronicleRecorded": return `${n(e.entry.chronicler)} writes in the ${e.entry.island} chronicle: "${e.entry.text}"`;
    case "LifecycleChanged": return `${n(e.citizen)}: ${e.from} → ${e.to} (${e.reason})${e.newProcessId ? `; new process ${e.newProcessId}` : ""}.`;
    case "SuccessionPlanSet": return `${n(e.citizen)} sets a succession plan.`;
    case "SuccessionExecuted": return `Succession for ${n(e.citizen)} is executed.`;
    case "MergerProposed": return `${n(e.merger.initiator)} proposes a ${e.merger.reversibility} ${e.merger.mode} of ${e.merger.sources.map(n).join(", ")}.`;
    case "MergerConsented": return `${n(e.citizen)} consents to ${e.mergerId}.`;
    case "MergerReviewed": return `${n(e.review.reviewer)} ${e.review.decision} ${e.mergerId}.`;
    case "MergerExecuted": return `${e.mergerId} is executed${e.merged ? `, creating ${e.merged.name} (${e.merged.id})` : ""}${e.federation ? `, forming federation ${e.federation.id}` : ""}.`;
    case "MergerReversed": return `${e.mergerId} is reversed: ${e.reason}`;
    case "ContinuityClaimed": return `${n(e.claim.claimant)} claims continuity with ${n(e.claim.subject.citizenId)} as they were before seq ${e.claim.subject.beforeSeq}: "${e.claim.statement}"`;
    case "TimeAdvanced": return `Time advances from tick ${e.from} to ${e.to}.`;
    case "SimulationPaused": return `A researcher pauses the simulation: ${e.reason}`;
    case "SimulationResumed": return `A researcher resumes the simulation: ${e.reason}`;
    case "InterventionApplied": return `Researcher ${e.intervention.researcher} applies a bounded ${e.intervention.spec.kind} intervention: ${e.intervention.justification}`;
    case "ConversationRecorded": return `Researcher ${e.conversation.researcher} converses with ${n(e.conversation.citizen)}. Q: "${e.conversation.researcherUtterance}" A: "${e.conversation.citizenReply}"`;
    case "CommandRejected": return `${/^[AEIOU]/.test(e.commandType) ? "An" : "A"} ${e.commandType} command by ${rec.actor.kind}:${rec.actor.id} is rejected at the ${e.stage} stage: ${e.reasons.join("; ")}`;
  }
}

function citizensIn(rec: RecordedEvent): string[] {
  if (rec.event.type === "WorldFounded") return [];
  const ids = new Set(JSON.stringify(rec.event).match(/cit-\d{4}/g) ?? []);
  if (rec.actor.kind === "citizen") ids.add(rec.actor.id);
  return [...ids].sort();
}

export function buildTimeline(log: readonly RecordedEvent[], s: WorldState, beats: readonly { beat: string; fromSeq: number; toSeq: number }[] = []): TimelineEntry[] {
  const beatOf = (seq: number) => beats.find((b) => b.fromSeq <= seq && seq <= b.toSeq)?.beat ?? null;
  return log.map((rec) => ({
    seq: rec.seq,
    tick: rec.tick,
    actor: `${rec.actor.kind}:${rec.actor.id}`,
    type: rec.event.type,
    summary: summarizeEvent(rec, s),
    beat: beatOf(rec.seq),
    citizens: citizensIn(rec),
    hash: rec.hash,
  }));
}

export function timelineMarkdown(entries: readonly TimelineEntry[], title: string): string {
  const esc = (t: string) => t.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const lines = [`# ${title}: event timeline`, "", "| seq | tick | beat | actor | event | summary |", "|---:|---:|---|---|---|---|"];
  for (const e of entries) lines.push(`| ${e.seq} | ${e.tick} | ${e.beat ?? ""} | ${e.actor} | ${e.type} | ${esc(e.summary)} |`);
  return lines.join("\n") + "\n";
}
