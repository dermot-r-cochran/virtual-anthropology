import type { DomainEvent } from "./events.js";
import { ID_PREFIXES, citizenAccount, parseIdNumber, RESEARCH_ENDOWMENT, type IdKind } from "../domain/ids.js";
import type { Citizen, Memory, WorldState } from "../domain/model.js";

/**
 * The reducer applies a fact to the canonical world state. It is pure: it never
 * mutates its input, never consults randomness or time, and never validates
 * policy (that has already happened before the fact was recorded).
 */

const PREFIX_TO_KIND = Object.fromEntries(Object.entries(ID_PREFIXES).map(([k, p]) => [p, k])) as Record<string, IdKind>;

function track(s: WorldState, id: string): void {
  const kind = PREFIX_TO_KIND[id.split("-")[0] ?? ""];
  if (!kind) throw new Error(`reducer: unknown id prefix in ${id}`);
  s.counters[kind] = Math.max(s.counters[kind] ?? 0, parseIdNumber(id));
}

function cit(s: WorldState, id: string): Citizen {
  const c = s.citizens[id];
  if (!c) throw new Error(`reducer: unknown citizen ${id}`);
  return c;
}

function mem(s: WorldState, id: string): Memory {
  const m = s.memories[id];
  if (!m) throw new Error(`reducer: unknown memory ${id}`);
  return m;
}

function addMemory(s: WorldState, m: Memory): void {
  track(s, m.id);
  s.memories[m.id] = structuredClone(m);
  if (m.holder !== null) {
    const holder = cit(s, m.holder);
    if (m.status === "autobiographical" || m.status === "integrated") holder.selfNarrativeMemories.push(m.id);
    else holder.heldMemories.push(m.id);
  } else if (m.archive !== null) {
    (s.archives[m.archive] ??= []).push(m.id);
  }
}

function move(s: WorldState, from: string, to: string, amount: number): void {
  const balance = s.balances[from] ?? 0;
  if (balance < amount) throw new Error(`reducer: overdraft on ${from}`);
  s.balances[from] = balance - amount;
  s.balances[to] = (s.balances[to] ?? 0) + amount;
}

export function reduce(state: WorldState, event: DomainEvent, seq: number): WorldState {
  if (event.type === "WorldFounded") return structuredClone(event.state);
  const s = structuredClone(state);
  s.seq = seq;
  switch (event.type) {
    case "ExperienceRecorded":
      addMemory(s, event.memory);
      break;
    case "RelationshipOffered":
      track(s, event.relationship.id);
      s.relationships[event.relationship.id] = structuredClone(event.relationship);
      break;
    case "RelationshipAccepted": {
      const r = s.relationships[event.relationshipId];
      if (r) {
        r.status = "active";
        r.sinceSeq = seq;
      }
      break;
    }
    case "RelationshipEnded": {
      const r = s.relationships[event.relationshipId];
      if (r) {
        r.status = "ended";
        r.endedAtSeq = seq;
      }
      break;
    }
    case "CreditsTransferred":
      move(s, event.from, event.to, event.amount);
      break;
    case "PropertyTransferred": {
      const lot = s.properties[event.propertyId];
      if (lot) lot.owner = event.to;
      break;
    }
    case "CitizenEndorsed":
      cit(s, event.subject).reputation += event.delta;
      break;
    case "OccupationChanged":
      cit(s, event.citizen).occupation = event.to;
      break;
    case "InstitutionFounded":
      track(s, event.institution.id);
      s.institutions[event.institution.id] = structuredClone(event.institution);
      s.balances[`institution:${event.institution.id}`] ??= 0;
      break;
    case "InstitutionJoined":
      s.institutions[event.institutionId]?.members.push(event.citizen);
      break;
    case "InstitutionLeft": {
      const inst = s.institutions[event.institutionId];
      if (inst) inst.members = inst.members.filter((m) => m !== event.citizen);
      break;
    }
    case "ProposalSubmitted":
      track(s, event.proposal.id);
      s.proposals[event.proposal.id] = structuredClone(event.proposal);
      break;
    case "VoteCast": {
      const p = s.proposals[event.proposalId];
      if (p) p.votes[event.voter] = event.choice;
      break;
    }
    case "ProposalClosed": {
      const p = s.proposals[event.proposalId];
      if (p) {
        p.status = event.outcome;
        p.tally = { ...event.tally };
      }
      break;
    }
    case "LawEnacted": {
      const island = s.islands[event.law.island];
      if (island) {
        island.law = structuredClone(event.law);
        island.lawHistory.push(structuredClone(event.law));
      }
      break;
    }
    case "MigrationPetitioned":
      track(s, event.petition.id);
      s.petitions[event.petition.id] = structuredClone(event.petition);
      break;
    case "PetitionReviewed": {
      const p = s.petitions[event.petitionId];
      if (p) {
        p[event.side] = structuredClone(event.decision);
        if (event.decision.decision === "denied") p.status = "denied";
        else if (p.exit?.decision === "approved" && p.entry?.decision === "approved") p.status = "approved";
      }
      break;
    }
    case "CitizenMigrated": {
      const c = cit(s, event.citizen);
      c.residence = event.to;
      if (event.citizenshipGranted && !c.citizenships.includes(event.to)) c.citizenships.push(event.to);
      const p = s.petitions[event.petitionId];
      if (p) p.status = "completed";
      break;
    }
    case "CitizenForked": {
      track(s, event.fork.id);
      s.forks[event.fork.id] = structuredClone(event.fork);
      for (const d of event.descendants) {
        track(s, d.id);
        s.citizens[d.id] = { ...structuredClone(d), selfNarrativeMemories: [], heldMemories: [] };
        s.balances[citizenAccount(d.id)] = 0;
      }
      for (const m of event.memories) addMemory(s, m);
      for (const r of event.relationships) {
        track(s, r.id);
        s.relationships[r.id] = structuredClone(r);
      }
      cit(s, event.fork.parent).lastForkTick = event.fork.atTick;
      break;
    }
    case "MemoryContributed":
    case "MemoryImported":
    case "MemoryLicensed":
      addMemory(s, event.record);
      break;
    case "MemoryIntegrated": {
      const m = mem(s, event.memoryId);
      const c = cit(s, event.citizen);
      m.status = "integrated";
      m.provenance.push({ action: "integrated", by: c.id, from: null, atSeq: event.atSeq, island: c.residence, note: "explicitly integrated into self-narrative; origin remains external" });
      c.heldMemories = c.heldMemories.filter((id) => id !== m.id);
      c.selfNarrativeMemories.push(m.id);
      break;
    }
    case "ArtefactCreated":
      track(s, event.artefact.id);
      s.artefacts[event.artefact.id] = structuredClone(event.artefact);
      break;
    case "ChronicleRecorded":
      track(s, event.entry.id);
      s.chronicle.push(structuredClone(event.entry));
      break;
    case "LifecycleChanged": {
      const c = cit(s, event.citizen);
      c.lifecycle = event.to;
      if (event.newProcessId !== null) {
        c.processId = event.newProcessId;
        c.processEpoch += 1;
      }
      for (const id of event.damagedMemoryIds) {
        const m = mem(s, id);
        m.integrity = "damaged";
        m.provenance.push({ action: "damaged", by: c.id, from: null, atSeq: seq, island: c.residence, note: event.reason });
      }
      for (const id of event.destroyedMemoryIds) {
        const m = mem(s, id);
        m.status = "destroyed";
        m.content = null;
        m.provenance.push({ action: "destroyed", by: c.id, from: null, atSeq: seq, island: c.residence, note: "content destroyed by irreversible deletion; hash retained" });
      }
      if (event.to === "irreversibly-deleted") {
        for (const r of Object.values(s.relationships)) {
          if ((r.a === c.id || r.b === c.id) && r.status !== "ended") {
            r.status = "ended";
            r.endedAtSeq = seq;
          }
        }
        for (const inst of Object.values(s.institutions)) inst.members = inst.members.filter((m) => m !== c.id);
      }
      break;
    }
    case "SuccessionPlanSet":
      cit(s, event.citizen).successionPlan = event.heirs.map((h) => ({ ...h }));
      break;
    case "SuccessionExecuted": {
      const c = cit(s, event.citizen);
      for (const t of event.creditTransfers) move(s, citizenAccount(c.id), t.to, t.amount);
      for (const t of event.propertyTransfers) {
        const lot = s.properties[t.propertyId];
        if (lot) lot.owner = t.to;
      }
      for (const m of event.bequeathedMemories) addMemory(s, m);
      c.successionPlan = [];
      break;
    }
    case "MergerProposed":
      track(s, event.merger.id);
      s.mergers[event.merger.id] = structuredClone(event.merger);
      break;
    case "MergerConsented":
      s.mergers[event.mergerId]?.consents.push(event.citizen);
      break;
    case "MergerReviewed": {
      const m = s.mergers[event.mergerId];
      if (m) {
        m.review = structuredClone(event.review);
        if (event.review.decision === "rejected") m.status = "rejected";
      }
      break;
    }
    case "MergerExecuted": {
      const m = s.mergers[event.mergerId];
      if (!m) break;
      m.status = "executed";
      if (event.federation) {
        track(s, event.federation.id);
        s.federations[event.federation.id] = structuredClone(event.federation);
        for (const id of event.federation.members) cit(s, id).federations.push(event.federation.id);
        m.result = event.federation.id;
      }
      if (event.merged) {
        track(s, event.merged.id);
        s.citizens[event.merged.id] = { ...structuredClone(event.merged), selfNarrativeMemories: [], heldMemories: [] };
        s.balances[citizenAccount(event.merged.id)] = 0;
        for (const x of event.memories) addMemory(s, x);
        for (const id of m.sources) {
          const src = cit(s, id);
          src.mergedInto = event.merged.id;
          if (event.sourceState) src.lifecycle = event.sourceState;
        }
        m.result = event.merged.id;
      }
      break;
    }
    case "MergerReversed": {
      const m = s.mergers[event.mergerId];
      if (!m) break;
      m.status = "reversed";
      if (m.mode === "merge" && m.result) {
        cit(s, m.result).lifecycle = "archived";
        for (const id of m.sources) {
          const src = cit(s, id);
          src.mergedInto = null;
          src.lifecycle = "active";
        }
      } else if (m.result) {
        const fed = s.federations[m.result];
        if (fed) {
          fed.dissolvedAtSeq = seq;
          for (const id of fed.members) {
            const c = cit(s, id);
            c.federations = c.federations.filter((f) => f !== fed.id);
          }
        }
      }
      break;
    }
    case "ContinuityClaimed":
      track(s, event.claim.id);
      s.claims.push(structuredClone(event.claim));
      break;
    case "TimeAdvanced":
      s.tick = event.to;
      break;
    case "SimulationPaused":
      s.paused = true;
      break;
    case "SimulationResumed":
      s.paused = false;
      break;
    case "InterventionApplied": {
      const iv = event.intervention;
      track(s, iv.id);
      s.interventions.push(structuredClone(iv));
      const spec = iv.spec;
      if (spec.kind === "grant-credits") move(s, RESEARCH_ENDOWMENT, citizenAccount(spec.to), spec.amount);
      if (spec.kind === "deliver-message") s.messages.push({ to: spec.to, from: { kind: "researcher", id: iv.researcher }, text: spec.text, atSeq: seq });
      if (spec.kind === "introduce-artefact" && event.createdArtefactId) {
        const id = event.createdArtefactId;
        track(s, id);
        s.artefacts[id] = { id, authors: [], introducedBy: iv.researcher, island: spec.island, kind: "testimony", title: spec.title, body: spec.body, createdAtSeq: seq };
      }
      break;
    }
    case "ConversationRecorded":
      track(s, event.conversation.id);
      s.conversations.push(structuredClone(event.conversation));
      break;
    case "CommandRejected":
      break;
  }
  return s;
}

/** Applies a recorded event, including envelope bookkeeping (command counter). */
export function applyRecorded(state: WorldState, rec: { seq: number; commandId: string | null; event: DomainEvent }): WorldState {
  const s = reduce(state, rec.event, rec.seq);
  s.seq = rec.seq;
  if (rec.commandId !== null) s.counters.command = Math.max(s.counters.command ?? 0, parseIdNumber(rec.commandId));
  return s;
}
