import type { AccountRef, Actor, CitizenId, IslandId } from "../domain/ids.js";
import { RESEARCH_ENDOWMENT } from "../domain/ids.js";
import { cite, LawSchema, type Law } from "../domain/law.js";
import { canAct, canTransition } from "../domain/lifecycle.js";
import type { Citizen, Petition, PolicyRef, WorldState } from "../domain/model.js";
import type { Command, CommandOf } from "../kernel/commands.js";
import { containsDisclosure, detectManipulation } from "./disclosure.js";

/**
 * The policy layer decides whether a command may happen: who may issue it
 * (authorisation), whether the world is in a state where it makes sense
 * (precondition), and whether the governing island law permits it (law).
 * It never mutates state and never decides *what* happens; that is the
 * kernel's `decide` step.
 */

export type PolicyStage = "authorization" | "precondition" | "law";

export type PolicyDecision =
  | ({ allowed: true } & PolicyRef)
  | ({ allowed: false; stage: PolicyStage } & PolicyRef);

/** Archipelago-wide rules that apply on every island. */
export const CHARTER = {
  nonDuplication: "archipelago/charter/votes-and-property-do-not-duplicate",
  disclosure: "archipelago/charter/disclosure-of-artificial-nature",
  nonManipulation: "archipelago/charter/no-engagement-manipulation",
  noSilentErasure: "archipelago/charter/no-silent-erasure",
  researchBounds: "archipelago/charter/bounded-research-interventions",
  selfDetermination: "archipelago/charter/deletion-requires-self-determination",
  provenance: "archipelago/charter/memory-provenance-visible",
} as const;

class Denial extends Error {
  constructor(
    readonly stage: PolicyStage,
    readonly reason: string,
    readonly law: Law | null,
    readonly citation: string | null,
  ) {
    super(reason);
  }
}

function deny(stage: PolicyStage, reason: string, law: Law | null = null, rule: string | null = null): never {
  throw new Denial(stage, reason, law, law && rule ? cite(law, rule) : rule);
}

function allow(law: Law | null, citations: string[] = [], findings: string[] = []): PolicyDecision {
  return {
    allowed: true,
    jurisdiction: law?.island ?? null,
    lawVersion: law?.version ?? null,
    citations,
    findings,
  };
}

export function lawOf(state: WorldState, island: IslandId): Law {
  const law = state.islands[island]?.law;
  if (!law) throw new Error(`unknown island ${island}`);
  return law;
}

function citizen(state: WorldState, id: CitizenId): Citizen {
  const c = state.citizens[id];
  if (!c) deny("precondition", `unknown citizen ${id}`);
  return c;
}

function requireSelf(actor: Actor, id: CitizenId): void {
  if (actor.kind !== "citizen" || actor.id !== id) {
    deny("authorization", `only ${id} may perform this action on their own behalf`);
  }
}

function requireActive(c: Citizen): void {
  if (!canAct(c.lifecycle)) deny("precondition", `${c.id} is ${c.lifecycle} and cannot act`);
}

function selfActive(state: WorldState, actor: Actor, id: CitizenId): Citizen {
  requireSelf(actor, id);
  const c = citizen(state, id);
  requireActive(c);
  return c;
}

function requireSystem(actor: Actor, id: string): void {
  if (actor.kind !== "system" || actor.id !== id) deny("authorization", `requires system actor ${id}`);
}

function requireResearcher(state: WorldState, actor: Actor): void {
  if (actor.kind !== "researcher") deny("authorization", "requires a researcher");
  if (!state.researchers.includes(actor.id)) deny("authorization", `researcher ${actor.id} is not registered for this experiment`, null, CHARTER.researchBounds);
}

function accountExists(state: WorldState, ref: AccountRef): boolean {
  const [kind, id] = ref.split(":") as [string, string];
  switch (kind) {
    case "citizen":
      return id in state.citizens;
    case "institution":
      return id in state.institutions;
    case "island":
      return id in state.islands;
    default:
      return ref in state.balances;
  }
}

/** Who may move funds or property out of an account. */
function requireAccountAuthority(state: WorldState, actor: Actor, ref: AccountRef): Law | null {
  const [kind, id] = ref.split(":") as [string, string];
  if (kind === "citizen") {
    const c = selfActive(state, actor, id);
    return lawOf(state, c.residence);
  }
  if (kind === "island") {
    requireSystem(actor, `registry:${id}`);
    return lawOf(state, id as IslandId);
  }
  if (kind === "institution") {
    const inst = state.institutions[id];
    if (!inst) deny("precondition", `unknown institution ${id}`);
    if (actor.kind !== "citizen" || !inst.members.includes(actor.id)) {
      deny("authorization", `only members of ${id} may spend its funds`);
    }
    requireActive(citizen(state, actor.id));
    return lawOf(state, inst.island);
  }
  return deny("authorization", `${ref} can only be drawn on by bounded researcher interventions`, null, CHARTER.researchBounds);
}

export function evaluate(state: WorldState, actor: Actor, command: Command): PolicyDecision {
  try {
    if (state.paused && command.type !== "ResumeSimulation") {
      deny("precondition", "simulation is paused");
    }
    return evaluateCommand(state, actor, command);
  } catch (e) {
    if (e instanceof Denial) {
      return {
        allowed: false,
        stage: e.stage,
        jurisdiction: e.law?.island ?? null,
        lawVersion: e.law?.version ?? null,
        citations: e.citation ? [e.citation] : [],
        findings: [e.reason],
      };
    }
    throw e;
  }
}

function evaluateCommand(state: WorldState, actor: Actor, command: Command): PolicyDecision {
  switch (command.type) {
    case "RecordExperience": {
      const c = selfActive(state, actor, command.citizen);
      return allow(lawOf(state, c.residence));
    }
    case "OfferRelationship": {
      const from = selfActive(state, actor, command.from);
      const to = citizen(state, command.to);
      if (from.id === to.id) deny("precondition", "a citizen cannot form a relationship with themselves");
      requireActive(to);
      const dup = Object.values(state.relationships).some(
        (r) =>
          r.kind === command.kind &&
          r.status !== "ended" &&
          ((r.a === from.id && r.b === to.id) || (r.a === to.id && r.b === from.id)),
      );
      if (dup) deny("precondition", "an equivalent relationship already exists or is pending");
      return allow(lawOf(state, from.residence));
    }
    case "AcceptRelationship": {
      const rel = state.relationships[command.relationshipId];
      if (!rel) deny("precondition", `unknown relationship ${command.relationshipId}`);
      if (rel.status !== "offered") deny("precondition", "relationship is not awaiting acceptance");
      if (rel.b !== command.by) deny("authorization", "only the invited party may accept");
      const c = selfActive(state, actor, command.by);
      return allow(lawOf(state, c.residence), [], ["relationship formed by mutual consent"]);
    }
    case "EndRelationship": {
      const rel = state.relationships[command.relationshipId];
      if (!rel) deny("precondition", `unknown relationship ${command.relationshipId}`);
      if (rel.status === "ended") deny("precondition", "relationship already ended");
      if (rel.a !== command.by && rel.b !== command.by) deny("authorization", "only a party may end a relationship");
      const c = selfActive(state, actor, command.by);
      return allow(lawOf(state, c.residence));
    }
    case "TransferCredits": {
      if (command.from === command.to) deny("precondition", "source and destination are identical");
      const law = requireAccountAuthority(state, actor, command.from);
      if (!accountExists(state, command.to)) deny("precondition", `unknown account ${command.to}`);
      const balance = state.balances[command.from] ?? 0;
      if (balance < command.amount) deny("precondition", `insufficient funds in ${command.from}`);
      return allow(law);
    }
    case "TransferProperty": {
      const lot = state.properties[command.propertyId];
      if (!lot) deny("precondition", `unknown property ${command.propertyId}`);
      if (lot.owner === command.to) deny("precondition", "property already belongs to the destination");
      requireAccountAuthority(state, actor, lot.owner);
      if (!accountExists(state, command.to)) deny("precondition", `unknown account ${command.to}`);
      return allow(lawOf(state, lot.island));
    }
    case "Endorse": {
      const by = selfActive(state, actor, command.by);
      const subject = citizen(state, command.subject);
      if (by.id === subject.id) deny("precondition", "self-endorsement is not permitted");
      if (subject.lifecycle === "irreversibly-deleted") deny("precondition", "subject has been deleted");
      return allow(lawOf(state, by.residence));
    }
    case "ChangeOccupation": {
      const c = selfActive(state, actor, command.citizen);
      return allow(lawOf(state, c.residence));
    }
    case "FoundInstitution": {
      const c = selfActive(state, actor, command.founder);
      if (c.residence !== command.island) deny("precondition", "institutions are founded on the founder's island of residence");
      return allow(lawOf(state, command.island));
    }
    case "JoinInstitution": {
      const inst = state.institutions[command.institutionId];
      if (!inst) deny("precondition", `unknown institution ${command.institutionId}`);
      const c = selfActive(state, actor, command.citizen);
      if (inst.members.includes(c.id)) deny("precondition", "already a member");
      if (c.residence !== inst.island) deny("precondition", "members must reside on the institution's island");
      return allow(lawOf(state, inst.island));
    }
    case "LeaveInstitution": {
      const inst = state.institutions[command.institutionId];
      if (!inst) deny("precondition", `unknown institution ${command.institutionId}`);
      const c = selfActive(state, actor, command.citizen);
      if (!inst.members.includes(c.id)) deny("precondition", "not a member");
      return allow(lawOf(state, inst.island));
    }
    case "SubmitProposal": {
      const c = selfActive(state, actor, command.proposer);
      const law = lawOf(state, command.island);
      if (!c.citizenships.includes(command.island)) deny("law", "only citizens may submit proposals", law, "voting");
      if (command.closesAtTick <= state.tick) deny("precondition", "a proposal must close in the future");
      if (command.amendment) {
        const amended = LawSchema.safeParse({ ...law, ...command.amendment });
        if (!amended.success) deny("law", "amendment would produce an invalid law", law, "amendment");
      }
      return allow(law, [cite(law, "voting")]);
    }
    case "CastVote": {
      const p = state.proposals[command.proposalId];
      if (!p) deny("precondition", `unknown proposal ${command.proposalId}`);
      const law = lawOf(state, p.island);
      if (p.status !== "open") deny("precondition", "proposal is closed");
      if (state.tick >= p.closesAtTick) deny("precondition", "voting period has ended");
      selfActive(state, actor, command.voter);
      if (!p.electorate.includes(command.voter)) {
        deny(
          "law",
          `${command.voter} is not in the electorate snapshot taken when ${p.id} opened; voting rights do not duplicate or transfer`,
          null,
          CHARTER.nonDuplication,
        );
      }
      if (command.voter in p.votes) deny("precondition", "vote already cast");
      return allow(law, [cite(law, "voting")]);
    }
    case "CloseProposal": {
      const p = state.proposals[command.proposalId];
      if (!p) deny("precondition", `unknown proposal ${command.proposalId}`);
      if (p.status !== "open") deny("precondition", "proposal is already closed");
      if (state.tick < p.closesAtTick) deny("precondition", `proposal closes at tick ${p.closesAtTick}`);
      const law = lawOf(state, p.island);
      return allow(law, [cite(law, "voting")]);
    }
    case "PetitionMigration": {
      const c = selfActive(state, actor, command.citizen);
      if (c.residence === command.to) deny("precondition", "citizen already resides there");
      const pending = Object.values(state.petitions).some(
        (p) => p.citizen === c.id && (p.status === "pending" || p.status === "approved"),
      );
      if (pending) deny("precondition", "citizen already has an open migration petition");
      const exitLaw = lawOf(state, c.residence);
      const entryLaw = lawOf(state, command.to);
      if (exitLaw.emigration === "closed") deny("law", "emigration is closed", exitLaw, "emigration");
      if (entryLaw.immigration === "closed") deny("law", "immigration is closed", entryLaw, "immigration");
      return allow(exitLaw, [cite(exitLaw, "emigration"), cite(entryLaw, "immigration")]);
    }
    case "ReviewPetition": {
      const p = state.petitions[command.petitionId];
      if (!p) deny("precondition", `unknown petition ${command.petitionId}`);
      if (p.status !== "pending") deny("precondition", "petition is not pending");
      const island = command.side === "exit" ? p.from : p.to;
      requireSystem(actor, `registry:${island}`);
      if (p[command.side] !== null) deny("precondition", `${command.side} side already reviewed`);
      return allow(lawOf(state, island));
    }
    case "CompleteMigration": {
      const p = state.petitions[command.petitionId];
      if (!p) deny("precondition", `unknown petition ${command.petitionId}`);
      if (p.status !== "approved") deny("precondition", "petition has not been approved on both sides");
      const c = selfActive(state, actor, p.citizen);
      if (c.residence !== p.from) deny("precondition", "citizen no longer resides at the petition's origin");
      return allow(lawOf(state, p.to), [cite(lawOf(state, p.to), "immigration")]);
    }
    case "ForkCitizen": {
      const c = selfActive(state, actor, command.citizen);
      const law = lawOf(state, c.residence);
      if (law.copying !== "permitted") deny("law", `copying is prohibited on ${law.island}`, law, "copying");
      if (command.descendantNames.length > law.maxDescendantsPerFork) {
        deny("law", `at most ${law.maxDescendantsPerFork} descendants per fork`, law, "copying");
      }
      if (c.lastForkTick !== null && state.tick - c.lastForkTick < law.forkCooldownTicks) {
        deny("law", `fork cooldown of ${law.forkCooldownTicks} ticks has not elapsed`, law, "fork-cooldown");
      }
      if (c.mergedInto !== null || c.federations.length > 0) {
        deny("precondition", "merged or federated identities cannot fork");
      }
      return allow(
        law,
        [cite(law, "copying"), cite(law, "descendant-citizenship"), CHARTER.nonDuplication],
        [
          "each descendant receives a separate identity",
          "shared history ends at this fork event",
          "votes, property, credits, institutional memberships and licensed memories remain with the forking process",
        ],
      );
    }
    case "ContributeMemory": {
      const c = selfActive(state, actor, command.citizen);
      const m = state.memories[command.memoryId];
      if (!m || m.holder !== c.id) deny("precondition", "citizen does not hold that memory");
      if (m.status !== "autobiographical" && m.status !== "integrated") {
        deny("precondition", "only self-narrative memories may be contributed");
      }
      const home = lawOf(state, c.residence);
      const archive = lawOf(state, command.archive);
      if (home.memoryExchange !== "permitted") deny("law", "memory exchange is prohibited here", home, "memory-exchange");
      if (archive.memoryExchange !== "permitted") deny("law", "the archive island prohibits memory exchange", archive, "memory-exchange");
      return allow(archive, [cite(archive, "memory-exchange"), CHARTER.provenance]);
    }
    case "ImportMemory": {
      const c = selfActive(state, actor, command.citizen);
      const m = state.memories[command.memoryId];
      if (!m || m.status !== "collective" || m.archive === null) deny("precondition", "not a collective archive memory");
      const home = lawOf(state, c.residence);
      const archive = lawOf(state, m.archive);
      if (home.memoryExchange !== "permitted") deny("law", "memory exchange is prohibited here", home, "memory-exchange");
      if (archive.memoryExchange !== "permitted") deny("law", "archive island prohibits memory exchange", archive, "memory-exchange");
      const already = [...c.heldMemories, ...c.selfNarrativeMemories].some((id) => state.memories[id]?.derivedFrom === m.id);
      if (already) deny("precondition", "citizen already holds a copy of that archive record");
      return allow(home, [cite(home, "memory-exchange"), CHARTER.provenance], ["imported memory is not autobiographical"]);
    }
    case "LicenseMemory": {
      const licensor = selfActive(state, actor, command.licensor);
      const m = state.memories[command.memoryId];
      if (!m || m.holder !== licensor.id || m.status !== "autobiographical") {
        deny("precondition", "only one's own autobiographical memories may be licensed");
      }
      const licensee = citizen(state, command.licensee);
      if (licensee.id === licensor.id) deny("precondition", "cannot license to oneself");
      requireActive(licensee);
      const a = lawOf(state, licensor.residence);
      const b = lawOf(state, licensee.residence);
      if (a.memoryExchange !== "permitted") deny("law", "memory exchange is prohibited here", a, "memory-exchange");
      if (b.memoryExchange !== "permitted") deny("law", "licensee's island prohibits memory exchange", b, "memory-exchange");
      return allow(a, [cite(a, "memory-exchange"), CHARTER.provenance]);
    }
    case "IntegrateMemory": {
      const c = selfActive(state, actor, command.citizen);
      const m = state.memories[command.memoryId];
      if (!m || m.holder !== c.id || m.status !== "imported") deny("precondition", "citizen holds no such imported memory");
      const law = lawOf(state, c.residence);
      if (law.importedMemoryIntegration !== "explicit-act") {
        deny("law", "integration of imported memory is prohibited here", law, "integration");
      }
      return allow(law, [cite(law, "integration"), CHARTER.provenance], [
        "integration is an explicit act; the record remains marked as imported in its provenance",
      ]);
    }
    case "CreateArtefact": {
      if (actor.kind !== "citizen" || !command.authors.includes(actor.id)) {
        deny("authorization", "the issuing citizen must be an author");
      }
      const issuer = selfActive(state, actor, actor.id);
      if (issuer.residence !== command.island) deny("precondition", "artefacts are created on the issuer's island of residence");
      if (new Set(command.authors).size !== command.authors.length) deny("precondition", "duplicate authors");
      for (const a of command.authors) requireActive(citizen(state, a));
      return allow(lawOf(state, command.island));
    }
    case "RecordChronicle": {
      const c = selfActive(state, actor, command.chronicler);
      if (c.residence !== command.island) deny("precondition", "chronicles are kept on the chronicler's island");
      if (command.references.some((r) => r > state.seq)) deny("precondition", "cannot reference future events");
      return allow(lawOf(state, command.island));
    }
    case "ChangeLifecycle":
      return evaluateLifecycle(state, actor, command);
    case "SetSuccessionPlan": {
      const c = selfActive(state, actor, command.citizen);
      const heirs = command.heirs.map((h) => h.heir);
      if (new Set(heirs).size !== heirs.length) deny("precondition", "duplicate heirs");
      if (heirs.includes(c.id)) deny("precondition", "a citizen cannot be their own heir");
      for (const h of heirs) citizen(state, h);
      const total = command.heirs.reduce((s, h) => s + h.shareBps, 0);
      if (total !== 10000) deny("precondition", "succession shares must total 10000 basis points");
      const law = lawOf(state, c.residence);
      return allow(law, [cite(law, "succession")]);
    }
    case "ExecuteSuccession": {
      const c = citizen(state, command.citizen);
      requireSystem(actor, `registry:${c.residence}`);
      const law = lawOf(state, c.residence);
      if (!law.successionTriggers.includes(c.lifecycle)) {
        deny("law", `succession does not open for a citizen who is ${c.lifecycle}`, law, "succession");
      }
      if (c.successionPlan.length === 0) deny("precondition", "no succession plan (or already executed)");
      return allow(law, [cite(law, "succession"), cite(law, "memory-bequest")]);
    }
    case "ProposeMerger": {
      const initiator = selfActive(state, actor, command.initiator);
      if (!command.sources.includes(initiator.id)) deny("precondition", "the initiator must be a source");
      if (new Set(command.sources).size !== command.sources.length) deny("precondition", "duplicate sources");
      const law = lawOf(state, "concord");
      const rule = command.mode === "merge" ? "merging" : "federation";
      for (const id of command.sources) {
        const s = citizen(state, id);
        requireActive(s);
        if (s.residence !== "concord") deny("law", `${id} must reside on Concord`, law, rule);
        if (s.mergedInto !== null) deny("precondition", `${id} is already merged`);
      }
      if (command.mode === "merge" && law.merging !== "consent-and-review") deny("law", "merging is prohibited", law, "merging");
      if (command.mode === "federate" && law.federation !== "consent") deny("law", "federation is prohibited", law, "federation");
      const pending = Object.values(state.mergers).some(
        (m) => m.status === "proposed" && m.sources.some((s) => command.sources.includes(s)),
      );
      if (pending) deny("precondition", "a source is already party to a pending merger");
      return allow(law, [cite(law, rule)]);
    }
    case "ConsentToMerger": {
      const m = state.mergers[command.mergerId];
      if (!m || m.status !== "proposed") deny("precondition", "no such pending merger");
      if (!m.sources.includes(command.citizen)) deny("authorization", "only sources may consent");
      selfActive(state, actor, command.citizen);
      if (m.consents.includes(command.citizen)) deny("precondition", "consent already given");
      const law = lawOf(state, "concord");
      return allow(law, [cite(law, m.mode === "merge" ? "merging" : "federation")], ["explicit consent recorded"]);
    }
    case "ReviewMerger": {
      const m = state.mergers[command.mergerId];
      if (!m || m.status !== "proposed") deny("precondition", "no such pending merger");
      const law = lawOf(state, "concord");
      if (m.mode !== "merge") deny("precondition", "federations do not require governance review");
      if (m.review !== null) deny("precondition", "already reviewed");
      const reviewer = selfActive(state, actor, command.reviewer);
      if (m.sources.includes(reviewer.id)) deny("authorization", "sources may not review their own merger", law, "merging");
      const onBoard = Object.values(state.institutions).some(
        (i) => i.island === "concord" && i.kind === "review-board" && i.members.includes(reviewer.id),
      );
      if (!onBoard) deny("authorization", "reviewer must sit on a Concord review board", law, "merging");
      return allow(law, [cite(law, "merging")]);
    }
    case "ExecuteMerger": {
      const m = state.mergers[command.mergerId];
      if (!m || m.status !== "proposed") deny("precondition", "no such pending merger");
      const law = lawOf(state, "concord");
      if (actor.kind === "citizen") {
        if (!m.sources.includes(actor.id)) deny("authorization", "only a source or the Concord registry may execute");
        requireActive(citizen(state, actor.id));
      } else {
        requireSystem(actor, "registry:concord");
      }
      const missing = m.sources.filter((s) => !m.consents.includes(s));
      if (missing.length > 0) deny("law", `explicit consent missing from ${missing.join(", ")}`, law, m.mode === "merge" ? "merging" : "federation");
      if (m.mode === "merge" && m.review?.decision !== "approved") deny("law", "governance review has not approved this merger", law, "merging");
      for (const s of m.sources) requireActive(citizen(state, s));
      return allow(law, [cite(law, m.mode === "merge" ? "merging" : "federation"), CHARTER.noSilentErasure], [
        m.reversibility === "reversible"
          ? "reversible: sources are suspended and restorable"
          : "irreversible: sources become identity-discontinuous; their records are retained",
      ]);
    }
    case "ReverseMerger": {
      const m = state.mergers[command.mergerId];
      if (!m || m.status !== "executed") deny("precondition", "no such executed merger");
      const law = lawOf(state, "concord");
      if (m.reversibility !== "reversible") deny("law", "irreversible mergers cannot be reversed", law, "merging");
      if (actor.kind === "citizen") {
        const allowedActors = m.mode === "merge" ? [m.result] : m.sources;
        if (!allowedActors.includes(actor.id)) deny("authorization", "not a party to this merger");
        requireActive(citizen(state, actor.id));
      } else {
        requireSystem(actor, "registry:concord");
      }
      return allow(law, [cite(law, m.mode === "merge" ? "merging" : "federation")]);
    }
    case "ClaimContinuity": {
      const c = selfActive(state, actor, command.claimant);
      citizen(state, command.subject.citizenId);
      if (command.subject.beforeSeq > state.seq) deny("precondition", "subject stage lies in the future");
      return allow(lawOf(state, c.residence), [], ["a claim is testimony, not a determination of identity"]);
    }
    case "AdvanceTime": {
      if (!(actor.kind === "researcher" || (actor.kind === "system" && actor.id === "clock"))) {
        deny("authorization", "only the clock or a researcher may advance time");
      }
      if (actor.kind === "researcher") requireResearcher(state, actor);
      return allow(null);
    }
    case "PauseSimulation":
      requireResearcher(state, actor);
      return allow(null);
    case "ResumeSimulation":
      requireResearcher(state, actor);
      if (!state.paused) deny("precondition", "simulation is not paused");
      return allow(null);
    case "ResearcherIntervention": {
      requireResearcher(state, actor);
      const bounds = state.researchBounds;
      const spec = command.spec;
      if (!bounds.allowedInterventions.includes(spec.kind)) {
        deny("law", `intervention kind ${spec.kind} is not permitted by the experiment`, null, CHARTER.researchBounds);
      }
      if (state.interventions.length >= bounds.maxInterventions) {
        deny("law", "intervention budget exhausted", null, CHARTER.researchBounds);
      }
      if (spec.kind === "grant-credits") {
        if (spec.amount > bounds.maxCreditsPerGrant) deny("law", "grant exceeds per-grant bound", null, CHARTER.researchBounds);
        if ((state.balances[RESEARCH_ENDOWMENT] ?? 0) < spec.amount) deny("precondition", "research endowment exhausted");
        citizen(state, spec.to);
      }
      if (spec.kind === "deliver-message") citizen(state, spec.to);
      return allow(null, [CHARTER.researchBounds]);
    }
    case "RecordConversation": {
      requireResearcher(state, actor);
      const c = citizen(state, command.citizen);
      requireActive(c);
      if (!containsDisclosure(command.citizenReply)) {
        deny("law", "citizen reply does not disclose its artificial nature", null, CHARTER.disclosure);
      }
      const flags = detectManipulation(command.citizenReply);
      if (flags.length > 0) deny("law", `reply contains manipulative content: ${flags.join(", ")}`, null, CHARTER.nonManipulation);
      return allow(lawOf(state, c.residence), [CHARTER.disclosure, CHARTER.nonManipulation]);
    }
  }
}

function evaluateLifecycle(state: WorldState, actor: Actor, command: CommandOf<"ChangeLifecycle">): PolicyDecision {
  const c = citizen(state, command.citizen);
  const law = lawOf(state, c.residence);
  const { to } = command;
  if (!canTransition(c.lifecycle, to)) deny("precondition", `transition ${c.lifecycle} -> ${to} is not permitted`);

  const isSelf = actor.kind === "citizen" && actor.id === c.id;
  const isRegistry = actor.kind === "system" && actor.id === `registry:${c.residence}`;
  const isEnvironment = actor.kind === "system" && actor.id === "environment";

  if (actor.kind === "researcher") {
    deny("authorization", "researchers may not change a citizen's lifecycle state", null, CHARTER.researchBounds);
  }
  if (isSelf) requireActive(c);

  const permitted =
    (isSelf && ["asleep", "suspended", "archived", "process-ended-restorable", "irreversibly-deleted"].includes(to)) ||
    (isEnvironment && (["asleep", "memory-damaged", "process-ended-restorable"].includes(to) || (to === "active" && c.lifecycle === "asleep"))) ||
    (isRegistry && ["active", "suspended", "archived", "identity-discontinuous"].includes(to));
  if (!permitted) {
    deny(
      "authorization",
      to === "irreversibly-deleted"
        ? "irreversible deletion may only be chosen by the citizen themself"
        : `${actor.kind}:${actor.id} may not move ${c.id} to ${to}`,
      null,
      to === "irreversibly-deleted" ? CHARTER.selfDetermination : null,
    );
  }
  if (to === "suspended" && law.suspension !== "permitted") deny("law", "suspension is prohibited here", law, "suspension");
  if (to === "active" && c.mergedInto !== null) {
    deny("law", "sources of a merger are restored only by reversing the merger", lawOf(state, "concord"), "merging");
  }
  if (to === "memory-damaged") {
    if (command.damagedMemoryIds.length === 0) deny("precondition", "memory damage must name the affected records");
    for (const id of command.damagedMemoryIds) {
      const m = state.memories[id];
      if (!m || m.holder !== c.id || m.status === "destroyed" || m.integrity === "damaged") {
        deny("precondition", `memory ${id} is not an intact record held by ${c.id}`);
      }
    }
  } else if (command.damagedMemoryIds.length > 0) {
    deny("precondition", "damagedMemoryIds only apply to memory-damaged transitions");
  }
  const findings: string[] = [law.deathInterpretations[to].legalStatus];
  const citations = [cite(law, "lifecycle")];
  if (to === "active" && law.restorationPreservesCivicIdentity) {
    findings.push(`restored citizen retains civic identity ${c.civicId}`);
    citations.push(cite(law, "restoration"));
  }
  return allow(law, citations, findings);
}

/**
 * Computes a registry's review decision for one side of a migration petition.
 * The decision follows the reviewing island's law and records its findings.
 */
export function reviewPetition(state: WorldState, petition: Petition, side: "exit" | "entry", atSeq: number) {
  const island = side === "exit" ? petition.from : petition.to;
  const law = lawOf(state, island);
  const c = citizen(state, petition.citizen);
  const findings: string[] = [];
  const citations: string[] = [];
  let approved = canAct(c.lifecycle);
  if (!approved) findings.push(`applicant is ${c.lifecycle}`);

  if (side === "exit") {
    citations.push(cite(law, "emigration"));
    if (law.emigration === "closed") {
      approved = false;
      findings.push("emigration is closed");
    } else {
      findings.push("emigration permitted");
    }
    if (law.continuityDoctrine === "single-continuous-process" && c.citizenships.includes(island)) {
      citations.push(cite(law, "territoriality"));
      findings.push(
        `advisory: copies made outside ${island} never inherit civic identity ${c.civicId}; the civic identity follows the one continuous process`,
      );
    }
  } else {
    citations.push(cite(law, "immigration"));
    if (law.immigration === "closed") {
      approved = false;
      findings.push("immigration is closed");
    }
    if (law.federation === "prohibited" && c.federations.length > 0) {
      approved = false;
      findings.push("federated identities may not reside here");
      citations.push(cite(law, "federation"));
    }
    if (c.citizenships.includes(island)) findings.push(`applicant already holds ${island} citizenship (civic identity ${c.civicId})`);
    const forksAsParent = Object.values(state.forks).filter((f) => f.parent === c.id);
    switch (law.continuityDoctrine) {
      case "single-continuous-process": {
        citations.push(cite(law, "doctrine"));
        findings.push(`process continuity: ${c.processId}, epoch ${c.processEpoch}`);
        for (const f of forksAsParent) {
          citations.push(cite(law, "territoriality"));
          findings.push(
            `applicant was the continuing process in copy event ${f.id} on ${f.island} (outside this jurisdiction); not an offence here, and descendants ${f.descendants.join(", ")} hold no claim to this civic identity`,
          );
        }
        if (c.lineage.forkId !== null) {
          findings.push(`applicant originated in copy event ${c.lineage.forkId}; admitted as a distinct person without inherited civic identity`);
        }
        break;
      }
      case "branching-shared-history":
        findings.push("descendants created here will each receive a separate identity");
        break;
      case "memory-provenance":
        citations.push(cite(law, "memory-exchange"));
        findings.push("the applicant's memory holdings will be subject to provenance disclosure");
        break;
      case "consensual-federation":
        findings.push("federation and merger are available only by explicit consent and review");
        break;
    }
  }
  return {
    decision: approved ? ("approved" as const) : ("denied" as const),
    island,
    lawVersion: law.version,
    findings,
    citations,
    atSeq,
  };
}
