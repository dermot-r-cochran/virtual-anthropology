import { sha256Hex } from "./canonical.js";
import type { CommandOf, Command } from "./commands.js";
import type { DomainEvent } from "./events.js";
import { formatId, citizenAccount, type CitizenId, type IdKind, type IslandId } from "../domain/ids.js";
import { NEW_PROCESS_ON_RESTORE } from "../domain/lifecycle.js";
import type { Citizen, Memory, ProvenanceStep, Relationship, WorldState } from "../domain/model.js";
import { lawOf, reviewPetition } from "../policy/evaluate.js";

/**
 * The decide step turns an *authorised* command into domain events. It is a
 * pure function of (state, actor, command). All identifiers and derived values
 * are computed here so that the reducer only has to apply facts.
 */

const CIVIC_PREFIX: Record<IslandId, string> = { continuity: "CON", fork: "FRK", mnemosyne: "MNE", concord: "CNC" };

export function civicIdFor(island: IslandId, citizenId: CitizenId): string {
  return `${CIVIC_PREFIX[island]}-${citizenId.slice(4)}`;
}

export function processIdFor(seed: string, citizenId: CitizenId, epoch: number, origin: string): string {
  return `proc-${sha256Hex(`${seed}|${citizenId}|${epoch}|${origin}`).slice(0, 16)}`;
}

class Ids {
  private readonly used: Record<string, number>;
  constructor(counters: Record<string, number>) {
    this.used = { ...counters };
  }
  next(kind: IdKind): string {
    const n = (this.used[kind] ?? 0) + 1;
    this.used[kind] = n;
    return formatId(kind, n);
  }
}

interface DecideContext {
  /** Sequence number the first emitted event will receive. */
  readonly seq: number;
  readonly ids: Ids;
}

function mustCitizen(state: WorldState, id: CitizenId): Citizen {
  const c = state.citizens[id];
  if (!c) throw new Error(`decide: unknown citizen ${id}`);
  return c;
}

function mustMemory(state: WorldState, id: string): Memory {
  const m = state.memories[id];
  if (!m) throw new Error(`decide: unknown memory ${id}`);
  return m;
}

function copyMemory(
  source: Memory,
  overrides: Pick<Memory, "id" | "holder" | "archive" | "status"> & Partial<Pick<Memory, "license">>,
  step: ProvenanceStep,
): Memory {
  return {
    ...structuredClone(source),
    ...overrides,
    license: overrides.license ?? null,
    derivedFrom: source.id,
    provenance: [...structuredClone(source.provenance), step],
  };
}

export function decide(state: WorldState, command: Command, ctx: DecideContext): DomainEvent[] {
  const seq = ctx.seq;
  switch (command.type) {
    case "RecordExperience": {
      const c = mustCitizen(state, command.citizen);
      const id = ctx.ids.next("memory");
      return [
        {
          type: "ExperienceRecorded",
          memory: {
            id,
            holder: c.id,
            archive: null,
            experiencedBy: c.id,
            experiencedAtSeq: seq,
            island: c.residence,
            content: command.content,
            contentHash: sha256Hex(command.content),
            tags: [...command.tags],
            status: "autobiographical",
            integrity: "intact",
            derivedFrom: null,
            license: null,
            provenance: [{ action: "experienced", by: c.id, from: null, atSeq: seq, island: c.residence, note: "" }],
          },
        },
      ];
    }
    case "OfferRelationship":
      return [
        {
          type: "RelationshipOffered",
          relationship: {
            id: ctx.ids.next("relationship"),
            a: command.from,
            b: command.to,
            kind: command.kind,
            status: "offered",
            origin: "mutual-consent",
            sinceSeq: seq,
            endedAtSeq: null,
          },
        },
      ];
    case "AcceptRelationship":
      return [{ type: "RelationshipAccepted", relationshipId: command.relationshipId }];
    case "EndRelationship":
      return [{ type: "RelationshipEnded", relationshipId: command.relationshipId, by: command.by }];
    case "TransferCredits":
      return [{ type: "CreditsTransferred", from: command.from, to: command.to, amount: command.amount, memo: command.memo }];
    case "TransferProperty": {
      const lot = state.properties[command.propertyId];
      if (!lot) throw new Error("decide: unknown property");
      return [{ type: "PropertyTransferred", propertyId: lot.id, from: lot.owner, to: command.to }];
    }
    case "Endorse":
      return [{ type: "CitizenEndorsed", by: command.by, subject: command.subject, delta: command.delta, reason: command.reason }];
    case "ChangeOccupation": {
      const c = mustCitizen(state, command.citizen);
      return [{ type: "OccupationChanged", citizen: c.id, from: c.occupation, to: command.occupation }];
    }
    case "FoundInstitution":
      return [
        {
          type: "InstitutionFounded",
          institution: {
            id: ctx.ids.next("institution"),
            name: command.name,
            island: command.island,
            kind: command.kind,
            charter: command.charter,
            members: [command.founder],
            foundedAtSeq: seq,
          },
        },
      ];
    case "JoinInstitution":
      return [{ type: "InstitutionJoined", institutionId: command.institutionId, citizen: command.citizen }];
    case "LeaveInstitution":
      return [{ type: "InstitutionLeft", institutionId: command.institutionId, citizen: command.citizen }];
    case "SubmitProposal": {
      const electorate = Object.values(state.citizens)
        .filter((c) => c.citizenships.includes(command.island) && c.lifecycle === "active")
        .map((c) => c.id)
        .sort();
      return [
        {
          type: "ProposalSubmitted",
          proposal: {
            id: ctx.ids.next("proposal"),
            island: command.island,
            proposer: command.proposer,
            title: command.title,
            rationale: command.rationale,
            amendment: command.amendment,
            openedAtSeq: seq,
            closesAtTick: command.closesAtTick,
            electorate,
            votes: {},
            status: "open",
            tally: null,
          },
        },
      ];
    }
    case "CastVote":
      return [{ type: "VoteCast", proposalId: command.proposalId, voter: command.voter, choice: command.choice }];
    case "CloseProposal":
      return decideCloseProposal(state, command, seq);
    case "EnactAmendment": {
      const law = lawOf(state, command.island);
      return [{ type: "LawEnacted", proposalId: null, law: { ...structuredClone(law), ...structuredClone(command.amendment), version: law.version + 1, enactedAtSeq: seq + 1 } }];
    }
    case "PetitionMigration": {
      const c = mustCitizen(state, command.citizen);
      return [
        {
          type: "MigrationPetitioned",
          petition: {
            id: ctx.ids.next("petition"),
            citizen: c.id,
            from: c.residence,
            to: command.to,
            reason: command.reason,
            status: "pending",
            exit: null,
            entry: null,
            filedAtSeq: seq,
          },
        },
      ];
    }
    case "ReviewPetition": {
      const p = state.petitions[command.petitionId];
      if (!p) throw new Error("decide: unknown petition");
      return [{ type: "PetitionReviewed", petitionId: p.id, side: command.side, decision: reviewPetition(state, p, command.side, seq) }];
    }
    case "CompleteMigration": {
      const p = state.petitions[command.petitionId];
      if (!p) throw new Error("decide: unknown petition");
      const c = mustCitizen(state, p.citizen);
      return [
        {
          type: "CitizenMigrated",
          petitionId: p.id,
          citizen: c.id,
          from: p.from,
          to: p.to,
          citizenshipGranted: !c.citizenships.includes(p.to),
        },
      ];
    }
    case "ForkCitizen":
      return decideFork(state, command, ctx);
    case "ContributeMemory": {
      const c = mustCitizen(state, command.citizen);
      const src = mustMemory(state, command.memoryId);
      const record = copyMemory(
        src,
        { id: ctx.ids.next("memory"), holder: null, archive: command.archive, status: "collective" },
        { action: "contributed-to-archive", by: c.id, from: `${c.id}:${src.id}`, atSeq: seq, island: command.archive, note: `contributed to the ${command.archive} collective archive` },
      );
      return [{ type: "MemoryContributed", source: src.id, record }];
    }
    case "ImportMemory": {
      const c = mustCitizen(state, command.citizen);
      const src = mustMemory(state, command.memoryId);
      const record = copyMemory(
        src,
        { id: ctx.ids.next("memory"), holder: c.id, archive: null, status: "imported" },
        { action: "imported-from-archive", by: c.id, from: `archive:${src.archive}:${src.id}`, atSeq: seq, island: c.residence, note: "imported; not autobiographical" },
      );
      return [{ type: "MemoryImported", source: src.id, record }];
    }
    case "LicenseMemory": {
      const licensee = mustCitizen(state, command.licensee);
      const src = mustMemory(state, command.memoryId);
      const record = copyMemory(
        src,
        { id: ctx.ids.next("memory"), holder: licensee.id, archive: null, status: "imported", license: { licensor: command.licensor, terms: command.terms } },
        { action: "licensed", by: licensee.id, from: `${command.licensor}:${src.id}`, atSeq: seq, island: licensee.residence, note: `licensed: ${command.terms}` },
      );
      return [{ type: "MemoryLicensed", source: src.id, record }];
    }
    case "IntegrateMemory":
      return [{ type: "MemoryIntegrated", memoryId: command.memoryId, citizen: command.citizen, atSeq: seq }];
    case "CreateArtefact":
      return [
        {
          type: "ArtefactCreated",
          artefact: {
            id: ctx.ids.next("artefact"),
            authors: [...command.authors],
            introducedBy: null,
            island: command.island,
            kind: command.kind,
            title: command.title,
            body: command.body,
            createdAtSeq: seq,
          },
        },
      ];
    case "RecordChronicle":
      return [
        {
          type: "ChronicleRecorded",
          entry: {
            id: ctx.ids.next("chronicle"),
            chronicler: command.chronicler,
            island: command.island,
            text: command.text,
            references: [...command.references],
            atSeq: seq,
          },
        },
      ];
    case "ChangeLifecycle": {
      const c = mustCitizen(state, command.citizen);
      const restoringNewProcess = command.to === "active" && NEW_PROCESS_ON_RESTORE.includes(c.lifecycle);
      const destroyed =
        command.to === "irreversibly-deleted"
          ? [...c.selfNarrativeMemories, ...c.heldMemories].filter((id) => state.memories[id]?.status !== "destroyed").sort()
          : [];
      return [
        {
          type: "LifecycleChanged",
          citizen: c.id,
          from: c.lifecycle,
          to: command.to,
          reason: command.reason,
          newProcessId: restoringNewProcess ? processIdFor(state.seed, c.id, c.processEpoch + 1, `restore@${seq}`) : null,
          damagedMemoryIds: [...command.damagedMemoryIds],
          destroyedMemoryIds: destroyed,
        },
      ];
    }
    case "SetSuccessionPlan":
      return [{ type: "SuccessionPlanSet", citizen: command.citizen, heirs: command.heirs.map((h) => ({ ...h })) }];
    case "ExecuteSuccession":
      return decideSuccession(state, command, ctx);
    case "ProposeMerger":
      return [
        {
          type: "MergerProposed",
          merger: {
            id: ctx.ids.next("merger"),
            sources: [...command.sources],
            initiator: command.initiator,
            mode: command.mode,
            reversibility: command.reversibility,
            name: command.name,
            consents: [],
            review: null,
            status: "proposed",
            result: null,
            proposedAtSeq: seq,
          },
        },
      ];
    case "ConsentToMerger":
      return [{ type: "MergerConsented", mergerId: command.mergerId, citizen: command.citizen }];
    case "ReviewMerger":
      return [
        {
          type: "MergerReviewed",
          mergerId: command.mergerId,
          review: { reviewer: command.reviewer, decision: command.decision, reasons: [...command.reasons], atSeq: seq },
        },
      ];
    case "ExecuteMerger":
      return decideMerger(state, command, ctx);
    case "ReverseMerger":
      return [{ type: "MergerReversed", mergerId: command.mergerId, reason: command.reason }];
    case "ClaimContinuity":
      return [
        {
          type: "ContinuityClaimed",
          claim: {
            id: ctx.ids.next("claim"),
            claimant: command.claimant,
            subject: { ...command.subject },
            statement: command.statement,
            grounds: [...command.grounds],
            atSeq: seq,
          },
        },
      ];
    case "AdvanceTime":
      return [{ type: "TimeAdvanced", from: state.tick, to: state.tick + command.ticks }];
    case "PauseSimulation":
      return [{ type: "SimulationPaused", reason: command.reason }];
    case "ResumeSimulation":
      return [{ type: "SimulationResumed", reason: command.reason }];
    case "ResearcherIntervention":
      throw new Error("decide: researcher interventions require a researcher id; use decideWithActor");
    case "RecordConversation":
      throw new Error("decide: conversations require a researcher id; use decideWithActor");
  }
}

/** Commands whose events embed the researcher's identity. */
export function decideResearch(
  command: CommandOf<"ResearcherIntervention"> | CommandOf<"RecordConversation">,
  researcher: string,
  ctx: DecideContext,
): DomainEvent[] {
  if (command.type === "ResearcherIntervention") {
    return [
      {
        type: "InterventionApplied",
        intervention: { id: ctx.ids.next("intervention"), researcher, spec: structuredClone(command.spec), justification: command.justification, atSeq: ctx.seq },
        createdArtefactId: command.spec.kind === "introduce-artefact" ? ctx.ids.next("artefact") : null,
      },
    ];
  }
  return [
    {
      type: "ConversationRecorded",
      conversation: {
        id: ctx.ids.next("conversation"),
        researcher,
        citizen: command.citizen,
        researcherUtterance: command.researcherUtterance,
        citizenReply: command.citizenReply,
        disclosed: true,
        guardFlags: [...command.guardFlags],
        atSeq: ctx.seq,
      },
    },
  ];
}

export function createDecideContext(state: WorldState): DecideContext {
  return { seq: state.seq + 1, ids: new Ids(state.counters) };
}

function decideCloseProposal(state: WorldState, command: CommandOf<"CloseProposal">, seq: number): DomainEvent[] {
  const p = state.proposals[command.proposalId];
  if (!p) throw new Error("decide: unknown proposal");
  const law = lawOf(state, p.island);
  const tally = { yes: 0, no: 0, abstain: 0 };
  for (const v of Object.values(p.votes)) tally[v]++;
  const turnout = tally.yes + tally.no + tally.abstain;
  const quorumMet = p.electorate.length > 0 && turnout / p.electorate.length >= law.votingQuorum;
  const decisive = tally.yes + tally.no;
  const adopted = quorumMet && decisive > 0 && tally.yes / decisive > law.votingThreshold;
  const events: DomainEvent[] = [
    { type: "ProposalClosed", proposalId: p.id, outcome: adopted ? "adopted" : "rejected", tally, quorumMet },
  ];
  if (adopted && p.amendment) {
    events.push({
      type: "LawEnacted",
      proposalId: p.id,
      law: { ...structuredClone(law), ...structuredClone(p.amendment), version: law.version + 1, enactedAtSeq: seq + 1 },
    });
  }
  return events;
}

function decideFork(state: WorldState, command: CommandOf<"ForkCitizen">, ctx: DecideContext): DomainEvent[] {
  const parent = mustCitizen(state, command.citizen);
  const law = lawOf(state, parent.residence);
  const forkId = ctx.ids.next("fork");
  const seq = ctx.seq;
  const descendants: Citizen[] = [];
  const memories: Memory[] = [];
  const relationships: Relationship[] = [];

  for (const name of command.descendantNames) {
    const id = ctx.ids.next("citizen");
    const inherited: string[] = [];
    for (const memId of parent.selfNarrativeMemories) {
      const src = mustMemory(state, memId);
      if (src.status === "destroyed") continue;
      const copy = copyMemory(
        src,
        { id: ctx.ids.next("memory"), holder: id, archive: null, status: src.status },
        { action: "fork-inherited", by: id, from: `${parent.id}:${src.id}`, atSeq: seq, island: parent.residence, note: `shared history up to ${forkId}` },
      );
      memories.push(copy);
      inherited.push(copy.id);
    }
    descendants.push({
      id,
      name,
      civicId: civicIdFor(parent.residence, id),
      processId: processIdFor(state.seed, id, 0, forkId),
      processEpoch: 0,
      lifecycle: "active",
      birth: { atSeq: seq, island: parent.residence, kind: "fork" },
      lineage: { parents: [parent.id], forkId, mergerId: null },
      values: { ...parent.values },
      goals: [...parent.goals],
      occupation: parent.occupation,
      residence: parent.residence,
      citizenships: law.descendantCitizenship === "birth-island" ? [parent.residence] : [],
      reputation: 0,
      provenance: { ...parent.provenance, seed: `${parent.provenance.seed}/${forkId}/${id}` },
      selfNarrativeMemories: inherited,
      heldMemories: [],
      successionPlan: [],
      mergedInto: null,
      federations: [],
      lastForkTick: null,
      disclosesArtificialNature: true,
    });
  }
  const family = [parent.id, ...descendants.map((d) => d.id)];
  for (let i = 0; i < family.length; i++) {
    for (let j = i + 1; j < family.length; j++) {
      relationships.push({
        id: ctx.ids.next("relationship"),
        a: family[i] as string,
        b: family[j] as string,
        kind: "fork-kin",
        status: "active",
        origin: "fork-event",
        sinceSeq: seq,
        endedAtSeq: null,
      });
    }
  }
  return [
    {
      type: "CitizenForked",
      fork: {
        id: forkId,
        parent: parent.id,
        descendants: descendants.map((d) => d.id),
        island: parent.residence,
        lawVersion: law.version,
        atSeq: seq,
        atTick: state.tick,
      },
      descendants,
      memories,
      relationships,
    },
  ];
}

function decideSuccession(state: WorldState, command: CommandOf<"ExecuteSuccession">, ctx: DecideContext): DomainEvent[] {
  const c = mustCitizen(state, command.citizen);
  const law = lawOf(state, c.residence);
  const account = citizenAccount(c.id);
  const balance = state.balances[account] ?? 0;
  const heirs = c.successionPlan;
  const amounts = heirs.map((h) => Math.floor((balance * h.shareBps) / 10000));
  const remainder = balance - amounts.reduce((s, a) => s + a, 0);
  if (amounts.length > 0) amounts[0] = (amounts[0] ?? 0) + remainder;
  const creditTransfers = heirs
    .map((h, i) => ({ to: citizenAccount(h.heir), amount: amounts[i] ?? 0 }))
    .filter((t) => t.amount > 0);
  const lots = Object.values(state.properties)
    .filter((p) => p.owner === account)
    .sort((a, b) => a.id.localeCompare(b.id));
  const propertyTransfers = lots.map((p, i) => ({ propertyId: p.id, to: citizenAccount((heirs[i % heirs.length] as { heir: string }).heir) }));
  const bequeathedMemories: Memory[] = [];
  if (law.memoryBequest === "permitted") {
    const firstHeir = (heirs[0] as { heir: string }).heir;
    const heir = mustCitizen(state, firstHeir);
    for (const memId of c.selfNarrativeMemories) {
      const src = mustMemory(state, memId);
      if (src.status === "destroyed") continue;
      bequeathedMemories.push(
        copyMemory(
          src,
          { id: ctx.ids.next("memory"), holder: heir.id, archive: null, status: "imported" },
          { action: "inherited", by: heir.id, from: `${c.id}:${src.id}`, atSeq: ctx.seq, island: c.residence, note: "bequeathed by succession; not autobiographical" },
        ),
      );
    }
  }
  return [{ type: "SuccessionExecuted", citizen: c.id, creditTransfers, propertyTransfers, bequeathedMemories }];
}

function decideMerger(state: WorldState, command: CommandOf<"ExecuteMerger">, ctx: DecideContext): DomainEvent[] {
  const m = state.mergers[command.mergerId];
  if (!m) throw new Error("decide: unknown merger");
  const seq = ctx.seq;
  if (m.mode === "federate") {
    return [
      {
        type: "MergerExecuted",
        mergerId: m.id,
        merged: null,
        federation: { id: ctx.ids.next("federation"), name: m.name, members: [...m.sources], mergerId: m.id, formedAtSeq: seq, dissolvedAtSeq: null },
        memories: [],
        sourceState: null,
      },
    ];
  }
  const sources = m.sources.map((s) => mustCitizen(state, s));
  const id = ctx.ids.next("citizen");
  const memories: Memory[] = [];
  for (const s of sources) {
    for (const memId of s.selfNarrativeMemories) {
      const src = mustMemory(state, memId);
      if (src.status === "destroyed") continue;
      memories.push(
        copyMemory(
          src,
          { id: ctx.ids.next("memory"), holder: id, archive: null, status: src.status },
          { action: "merged-from", by: id, from: `${s.id}:${src.id}`, atSeq: seq, island: "concord", note: `merged in ${m.id}` },
        ),
      );
    }
  }
  const keys = [...new Set(sources.flatMap((s) => Object.keys(s.values)))].sort();
  const values: Record<string, number> = {};
  for (const k of keys) {
    const vs = sources.map((s) => s.values[k] ?? 0);
    values[k] = Math.round((vs.reduce((a, b) => a + b, 0) / vs.length) * 100) / 100;
  }
  const initiator = mustCitizen(state, m.initiator);
  const merged: Citizen = {
    id,
    name: m.name,
    civicId: civicIdFor("concord", id),
    processId: processIdFor(state.seed, id, 0, m.id),
    processEpoch: 0,
    lifecycle: "active",
    birth: { atSeq: seq, island: "concord", kind: "merger" },
    lineage: { parents: [...m.sources], forkId: null, mergerId: m.id },
    values,
    goals: [...new Set(sources.flatMap((s) => s.goals))].sort(),
    occupation: [...new Set(sources.map((s) => s.occupation))].join(" / "),
    residence: "concord",
    citizenships: ["concord"],
    reputation: 0,
    provenance: { ...initiator.provenance, seed: `${initiator.provenance.seed}/${m.id}/${id}` },
    selfNarrativeMemories: memories.map((x) => x.id),
    heldMemories: [],
    successionPlan: [],
    mergedInto: null,
    federations: [],
    lastForkTick: null,
    disclosesArtificialNature: true,
  };
  return [
    {
      type: "MergerExecuted",
      mergerId: m.id,
      merged,
      federation: null,
      memories,
      sourceState: m.reversibility === "reversible" ? "suspended" : "identity-discontinuous",
    },
  ];
}
