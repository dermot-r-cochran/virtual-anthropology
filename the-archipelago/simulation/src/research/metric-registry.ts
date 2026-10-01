import type { MetricDefinition, MetricValue } from "./domain.js";
import type { ResearchInput } from "./interchange.js";

export interface Metric extends MetricDefinition {
  compute(input: ResearchInput): number;
}

const count = (input: ResearchInput, type: string) => input.events.filter((e) => e.type === type).length;
const r4 = (x: number) => Math.round(x * 10000) / 10000;

const DEATH_STATES = ["asleep", "suspended", "archived", "process-ended-restorable", "memory-damaged", "identity-discontinuous", "irreversibly-deleted"] as const;

function giniOf(xs: number[]): number {
  const v = [...xs].sort((a, b) => a - b);
  const n = v.length;
  const total = v.reduce((a, b) => a + b, 0);
  if (n === 0 || total === 0) return 0;
  return r4((2 * v.reduce((acc, x, i) => acc + (i + 1) * x, 0)) / (n * total) - (n + 1) / n);
}

function recognitionCounts(input: ResearchInput): number[] {
  const rec = input.analyses.continuity?.recognition ?? {};
  return Object.values(rec).map((byClaimant) => Object.values(byClaimant).filter((v) => v === true).length);
}

const m = (id: string, name: string, unit: string, definition: string, compute: (i: ResearchInput) => number): Metric => ({ id, name, unit, definition, compute });

/**
 * Metric definitions. Each is a pure function of the interchange format and is
 * documented with an operational definition that appears in every report.
 */
export const METRICS: readonly Metric[] = [
  m("population.records", "Citizen records", "persons", "Number of citizen records ever created (genesis, fork or merger), including ended ones.", (i) => i.snapshot.citizens.length),
  m("population.active", "Active citizens", "persons", "Citizen records whose lifecycle state is `active` at the end of the run.", (i) => i.snapshot.citizens.filter((c) => c.lifecycle === "active").length),
  m("population.genesis", "Founding citizens", "persons", "Citizen records created at genesis.", (i) => i.snapshot.citizens.filter((c) => c.birthKind === "genesis").length),
  m("population.stateless", "Stateless citizens", "persons", "Citizen records holding no citizenship at the end of the run.", (i) => i.snapshot.citizens.filter((c) => c.citizenships.length === 0).length),
  m("identity.forks", "Fork events", "events", "Number of `CitizenForked` events.", (i) => count(i, "CitizenForked")),
  m("identity.fork_descendants", "Fork descendants", "persons", "Citizen records whose birth kind is `fork`.", (i) => i.snapshot.citizens.filter((c) => c.birthKind === "fork").length),
  m("identity.mergers", "Mergers executed", "events", "Number of `MergerExecuted` events (merges and federations).", (i) => count(i, "MergerExecuted")),
  m("identity.continuity_claims", "Continuity claims", "claims", "Number of `ContinuityClaimed` events.", (i) => count(i, "ContinuityClaimed")),
  m("identity.process_continuers", "Process continuers of the subject", "persons", "Claimants whose process identifier equals the subject's pre-reference process identifier (0 if no continuity analysis).", (i) => i.analyses.continuity?.claimants.filter((c) => c.sameProcess).length ?? 0),
  m("identity.civic_continuers", "Civic continuers of the subject", "persons", "Claimants whose civic identifier equals the subject's pre-reference civic identifier.", (i) => i.analyses.continuity?.claimants.filter((c) => c.sameCivicId).length ?? 0),
  m("identity.memory_continuers", "Full-memory continuers of the subject", "persons", "Claimants holding every self-narrative record the subject held before the reference event (shared fraction = 1).", (i) => i.analyses.continuity?.claimants.filter((c) => c.sharedMemoryFraction === 1).length ?? 0),
  m("identity.dimension_dissociation", "Continuity dimension dissociation", "persons", "identity.memory_continuers − identity.process_continuers. Positive values mean memory continuity is shared more widely than process continuity.", (i) => {
    const c = i.analyses.continuity?.claimants ?? [];
    return c.filter((x) => x.sharedMemoryFraction === 1).length - c.filter((x) => x.sameProcess).length;
  }),
  m("legal.recognition_range", "Range of recognised continuers across islands", "persons", "Max − min, across islands, of the number of claimants each island's law recognises as continuing the subject (unadjudicated readings count as not recognised).", (i) => {
    const xs = recognitionCounts(i);
    return xs.length === 0 ? 0 : Math.max(...xs) - Math.min(...xs);
  }),
  m("legal.unadjudicating_islands", "Islands not adjudicating continuity", "islands", "Islands whose reading of every claimant is `null` (not adjudicated).", (i) =>
    Object.values(i.analyses.continuity?.recognition ?? {}).filter((byC) => Object.values(byC).every((v) => v === null)).length),
  m("governance.proposals", "Proposals submitted", "proposals", "Number of `ProposalSubmitted` events.", (i) => count(i, "ProposalSubmitted")),
  m("governance.laws_enacted", "Law versions enacted", "laws", "Number of `LawEnacted` events after genesis.", (i) => count(i, "LawEnacted")),
  m("governance.votes_cast", "Votes cast", "votes", "Number of `VoteCast` events.", (i) => count(i, "VoteCast")),
  m("governance.votes_refused_outside_electorate", "Votes refused outside electorate", "commands", "Rejected `CastVote` commands whose reason cites the electorate snapshot.", (i) =>
    i.events.filter((e) => e.type === "CommandRejected" && e.data.commandType === "CastVote" && JSON.stringify(e.data.reasons).includes("electorate snapshot")).length),
  m("governance.commands_rejected", "Commands rejected", "commands", "Number of `CommandRejected` events (schema, authorisation, precondition or law).", (i) => count(i, "CommandRejected")),
  m("governance.migrations", "Migrations completed", "events", "Number of `CitizenMigrated` events.", (i) => count(i, "CitizenMigrated")),
  m("memory.records", "Memory records", "records", "All memory records, including collective-archive records and destroyed tombstones.", (i) => i.snapshot.memories.length),
  m("memory.imported", "Imported memory records", "records", "Records currently held with status `imported` (not autobiographical).", (i) => i.snapshot.memories.filter((x) => x.status === "imported").length),
  m("memory.integrated", "Integrated memory records", "records", "Imported records explicitly integrated into a self-narrative (status `integrated`).", (i) => i.snapshot.memories.filter((x) => x.status === "integrated").length),
  m("memory.fork_inherited", "Fork-inherited records", "records", "Records whose provenance includes a `fork-inherited` step.", (i) => i.snapshot.memories.filter((x) => x.provenance.some((p) => p.action === "fork-inherited")).length),
  m("memory.provenance_complete", "Records with complete provenance", "fraction", "Fraction of records whose provenance chain begins with an `experienced` step (1 = every record traceable to an experience).", (i) =>
    i.snapshot.memories.length === 0 ? 1 : r4(i.snapshot.memories.filter((x) => x.provenance[0]?.action === "experienced").length / i.snapshot.memories.length)),
  m("culture.artefacts", "Cultural artefacts", "artefacts", "Artefacts created by citizens or introduced by researchers.", (i) => i.snapshot.artefacts.length),
  m("culture.chronicle_entries", "In-world chronicle entries", "entries", "Number of `ChronicleRecorded` events written by citizens.", (i) => count(i, "ChronicleRecorded")),
  m("institutions.count", "Institutions", "institutions", "Institutions in existence at the end of the run, including registries.", (i) => i.snapshot.institutions.length),
  m("social.active_relationships", "Active relationships", "ties", "Relationships with status `active`.", (i) => i.snapshot.relationships.filter((r) => r.status === "active").length),
  m("social.fork_kin_ties", "Fork-kin ties", "ties", "Relationships of kind `fork-kin` (created by fork events).", (i) => i.snapshot.relationships.filter((r) => r.kind === "fork-kin").length),
  m("economy.credit_gini", "Credit Gini coefficient", "index 0–1", "Gini coefficient of citizen credit balances at the end of the run.", (i) => giniOf(i.snapshot.citizens.map((c) => c.credits))),
  m("economy.supply_conserved", "Supply conserved", "boolean", "1 if the sum of all balances equals the total supply fixed at genesis, else 0.", (i) => (i.snapshot.economy.totalSupply === i.snapshot.economy.balancesTotal ? 1 : 0)),
  ...DEATH_STATES.map((st) =>
    m(`death.${st.replace(/-/g, "_")}`, `Citizens ${st}`, "persons", `Citizen records in lifecycle state \`${st}\` at the end of the run.`, (i) => i.snapshot.citizens.filter((c) => c.lifecycle === st).length),
  ),
  m("death.transitions", "Lifecycle transitions", "events", "Number of `LifecycleChanged` events.", (i) => count(i, "LifecycleChanged")),
  m("research.conversations", "Researcher conversations", "conversations", "Number of `ConversationRecorded` events.", (i) => count(i, "ConversationRecorded")),
  m("research.interventions", "Researcher interventions", "interventions", "Number of `InterventionApplied` events.", (i) => count(i, "InterventionApplied")),
  m("simulation.events", "Events recorded", "events", "Length of the event store, including the founding event and rejections.", (i) => i.events.length),
  m("simulation.ticks", "Simulated time", "ticks", "Final tick of the simulation clock.", (i) => i.snapshot.tick),
];

export const METRIC_INDEX: ReadonlyMap<string, Metric> = new Map(METRICS.map((x) => [x.id, x]));

export function computeMetrics(input: ResearchInput): MetricValue[] {
  return METRICS.map((x) => ({ metric: x.id, value: x.compute(input) }));
}

export function definitions(): MetricDefinition[] {
  return METRICS.map(({ id, name, unit, definition }) => ({ id, name, unit, definition }));
}
