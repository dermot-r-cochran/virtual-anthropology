import {
  CivilizationChronicleSchema,
  ExperimentSchema,
  FindingSchema,
  ObservationSchema,
  PublicationSchema,
  VisualizationSchema,
  type CivilizationChronicle,
  type Comparator,
  type EventRef,
  type Experiment,
  type Finding,
  type Hypothesis,
  type MetricDefinition,
  type MetricValue,
  type Observation,
  type Publication,
  type Visualization, CATEGORY_MEANING } from "./domain.js";
import type { ResearchInput, StreamEvent } from "./interchange.js";
import { INTERCHANGE_VERSION } from "./interchange.js";
import { configurationHash, type ExperimentManifest } from "./manifest.js";
import { computeMetrics, definitions, METRIC_INDEX } from "./metric-registry.js";
import type { StudyResult } from "./study.js";

export const EPISTEMIC_STATEMENT =
  "The repository studies virtual civilizations. It does not attempt to prove, infer, or assign consciousness. Research outputs distinguish observations, metrics, hypotheses, and interpretations.";

export interface RunTimestamps {
  readonly startedAt: string;
  readonly endedAt: string;
}

export interface ResearchBundle {
  readonly experiment: Experiment;
  readonly manifest: ExperimentManifest;
  readonly metricDefinitions: MetricDefinition[];
  readonly metrics: MetricValue[];
  readonly observations: Observation[];
  readonly findings: Finding[];
  readonly chronicle: CivilizationChronicle;
  readonly publication: Publication;
  readonly visualizations: Visualization[];
  readonly visualizationData: Record<string, unknown>;
}

const ref = (e: StreamEvent): EventRef => ({ seq: e.seq, type: e.type, hash: e.hash });

function compare(v: number, c: Comparator, t: number): boolean {
  switch (c) {
    case "==": return v === t;
    case "!=": return v !== t;
    case ">": return v > t;
    case ">=": return v >= t;
    case "<": return v < t;
    case "<=": return v <= t;
  }
}

const NOTABLE_EVENTS = new Set([
  "CitizenForked", "CitizenMigrated", "LawEnacted", "ProposalClosed", "MemoryImported", "MemoryIntegrated", "ContinuityClaimed",
  "MergerExecuted", "MergerReversed", "LifecycleChanged", "InterventionApplied", "ConversationRecorded", "InstitutionFounded",
]);

/** Metrics → observations. Metric observations restate values; event observations restate events. */
export function deriveObservations(input: ResearchInput, metrics: readonly MetricValue[], hypotheses: readonly Hypothesis[]): Observation[] {
  const hypothesisMetrics = new Set(hypotheses.map((h) => h.operationalisation.metric));
  const out: Observation[] = [];
  for (const mv of metrics) {
    if (mv.value === 0 && !hypothesisMetrics.has(mv.metric)) continue;
    const def = METRIC_INDEX.get(mv.metric);
    out.push({
      id: `obs-metric-${mv.metric.replace(/[._]/g, "-")}`,
      kind: "observation",
      basis: "metric",
      statement: `${def?.name ?? mv.metric} (\`${mv.metric}\`) = ${mv.value} ${def?.unit ?? ""}.`.replace(/ \.$/, "."),
      metrics: [mv],
      events: [],
    });
  }
  for (const e of input.events) {
    if (!NOTABLE_EVENTS.has(e.type)) continue;
    out.push({ id: `obs-event-${e.seq}`, kind: "observation", basis: "event", statement: `Seq ${e.seq}, tick ${e.tick}: ${e.summary}`, metrics: [], events: [ref(e)] });
  }
  for (const e of input.events.filter((x) => x.type === "CommandRejected" && ["law", "authorization"].includes(String(x.data.stage)))) {
    out.push({ id: `obs-event-${e.seq}`, kind: "observation", basis: "event", statement: `Seq ${e.seq}, tick ${e.tick}: ${e.summary}`, metrics: [], events: [ref(e)] });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true })).map((o) => ObservationSchema.parse(o));
}

/** Observations → findings: mechanical evaluation of each operationalised hypothesis. */
export function deriveFindings(hypotheses: readonly Hypothesis[], metrics: readonly MetricValue[], observations: readonly Observation[]): Finding[] {
  return hypotheses.map((h) => {
    const { metric, comparator, threshold } = h.operationalisation;
    const mv = metrics.find((x) => x.metric === metric);
    const obs = observations.filter((o) => o.metrics.some((x) => x.metric === metric)).map((o) => o.id);
    if (!mv || !METRIC_INDEX.has(metric)) {
      return FindingSchema.parse({
        id: `finding-${h.id}`, hypothesisId: h.id, metric, observedValue: null, comparator, threshold, outcome: "undetermined",
        statement: `Hypothesis ${h.id}: metric \`${metric}\` is not defined or was not computed; the hypothesis could not be evaluated.`,
        observationIds: obs,
      });
    }
    const holds = compare(mv.value, comparator, threshold);
    return FindingSchema.parse({
      id: `finding-${h.id}`, hypothesisId: h.id, metric, observedValue: mv.value, comparator, threshold,
      outcome: holds ? "consistent-with-hypothesis" : "inconsistent-with-hypothesis",
      statement: `Hypothesis ${h.id}: computed \`${metric}\` = ${mv.value}; the test \`${metric} ${comparator} ${threshold}\` is ${holds ? "true" : "false"}. The result is ${holds ? "consistent" : "inconsistent"} with the hypothesis as operationalised, in this single deterministic run.`,
      observationIds: obs,
    });
  });
}

/**
 * Event stream → civilization chronicle. Every statement is generated from
 * the data of the events it cites; no statement exists without an event.
 * Time mapping: year = tick + 1.
 */
export function buildChronicle(input: ResearchInput, civilizationId: string): CivilizationChronicle {
  const name = (id: unknown) => input.snapshot.citizens.find((c) => c.id === id)?.name ?? String(id);
  const islandName = (id: unknown) => input.snapshot.islands.find((i) => i.id === id)?.name ?? String(id);
  const proposalTitle = (id: unknown) => input.snapshot.proposals.find((p) => p.id === id)?.title ?? String(id);
  const seen = new Set<string>();
  const first = (key: string, label: string) => {
    if (seen.has(key)) return "";
    seen.add(key);
    return `${label}: `;
  };
  const byYear = new Map<number, { text: string; events: EventRef[]; category: string }[]>();
  const add = (e: StreamEvent, category: string, text: string, extra: StreamEvent[] = []) => {
    const year = e.tick + 1;
    const list = byYear.get(year) ?? [];
    list.push({ text, events: [ref(e), ...extra.map(ref)], category });
    byYear.set(year, list);
  };
  const events = input.events;
  for (const e of events) {
    const d = e.data as Record<string, any>;
    switch (e.type) {
      case "WorldFounded":
        add(e, "founding", `The Archipelago is founded. ${d.citizens} citizens are registered across four islands.`);
        break;
      case "CitizenForked":
        add(e, "identity", `${first("fork", "First identity fork")}${name(d.fork.parent)} forks on ${islandName(d.fork.island)}, creating ${d.fork.descendants.map(name).join(" and ")}.`);
        break;
      case "CitizenMigrated":
        add(e, "migration", `${first("migration", "First migration")}${name(d.citizen)} migrates from ${islandName(d.from)} to ${islandName(d.to)}.`);
        break;
      case "ProposalClosed": {
        const enacted = events.find((x) => x.type === "LawEnacted" && (x.data as Record<string, unknown>).proposalId === d.proposalId);
        if (d.outcome === "adopted") add(e, "governance", `${first("reform", "First law reform")}Reform passed on ${islandName(input.snapshot.proposals.find((p) => p.id === d.proposalId)?.island)}: "${proposalTitle(d.proposalId)}" (${d.tally.yes} yes, ${d.tally.no} no).`, enacted ? [enacted] : []);
        else add(e, "governance", `Proposal "${proposalTitle(d.proposalId)}" is rejected (${d.tally.yes} yes, ${d.tally.no} no).`);
        break;
      }
      case "InstitutionFounded":
        add(e, "institutions", `${d.institution.name} is founded on ${islandName(d.institution.island)}.`);
        break;
      case "MemoryImported":
        add(e, "memory", `${first("import", "First memory import")}${name(d.record.holder)} imports communal memory ${d.source} (from ${islandName(d.record.island)}), first experienced by ${name(d.record.experiencedBy)}.`);
        break;
      case "MemoryIntegrated":
        add(e, "memory", `${first("integrate", "First memory integration")}${name(d.citizen)} integrates an imported memory into their self-narrative.`);
        break;
      case "ContinuityClaimed":
        add(e, "testimony", `${name(d.claim.claimant)} claims continuity with ${name(d.claim.subject.citizenId)} as recorded before seq ${d.claim.subject.beforeSeq}.`);
        break;
      case "LifecycleChanged":
        add(e, "lifecycle", `${name(d.citizen)} passes from ${d.from} to ${d.to}.`);
        break;
      case "MergerExecuted":
        add(e, "identity", `${first("merger", "First merger")}Merger ${d.mergerId} is executed.`);
        break;
      case "ArtefactCreated":
        add(e, "culture", `${first(`artefact-${d.artefact.kind}`, `First ${d.artefact.kind}`)}${d.artefact.introducedBy ? `Researcher ${d.artefact.introducedBy} introduces` : d.artefact.authors.map(name).join(", ") + " creates"} the ${d.artefact.kind} "${d.artefact.title}".`);
        break;
      case "InterventionApplied":
        add(e, "research", `Researcher ${d.intervention.researcher} applies a ${d.intervention.spec.kind} intervention.`);
        break;
      case "ConversationRecorded":
        add(e, "research", `Researcher ${d.conversation.researcher} converses with ${name(d.conversation.citizen)}.`);
        break;
      default:
        break;
    }
  }
  return CivilizationChronicleSchema.parse({
    civilizationId,
    timeUnit: "year",
    timeMapping: "year = simulation tick + 1",
    periods: [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, statements]) => ({ year, statements })),
  });
}

/** Machine-readable visualization datasets and their descriptors. */
export function buildVisualizations(input: ResearchInput, metrics: readonly MetricValue[], metricDefinitions: readonly MetricDefinition[]): { visualizations: Visualization[]; data: Record<string, unknown> } {
  const s = input.snapshot;
  const governanceTypes = new Set(["ProposalSubmitted", "VoteCast", "ProposalClosed", "LawEnacted", "MigrationPetitioned", "PetitionReviewed", "CitizenMigrated", "MergerProposed", "MergerConsented", "MergerReviewed", "MergerExecuted", "MergerReversed"]);
  const memoryTypes = new Set(["ExperienceRecorded", "MemoryContributed", "MemoryImported", "MemoryLicensed", "MemoryIntegrated", "CitizenForked", "LifecycleChanged", "SuccessionExecuted"]);
  const data: Record<string, unknown> = {
    "lineage_graph.json": { schema: "archipelago/lineage-graph/v1", ...input.analyses.lineage },
    "relationship_network.json": {
      schema: "archipelago/relationship-network/v1",
      nodes: s.citizens.map((c) => ({ id: c.id, name: c.name, residence: c.residence, lifecycle: c.lifecycle, birthKind: c.birthKind })),
      links: s.relationships.map((r) => ({ id: r.id, source: r.a, target: r.b, kind: r.kind, status: r.status, origin: r.origin, sinceSeq: r.sinceSeq, endedAtSeq: r.endedAtSeq })),
    },
    "governance_events.json": {
      schema: "archipelago/governance-events/v1",
      proposals: s.proposals,
      events: input.events
        .filter((e) => governanceTypes.has(e.type) || (e.type === "CommandRejected" && ["law", "authorization"].includes(String(e.data.stage))))
        .map((e) => ({ seq: e.seq, tick: e.tick, type: e.type, actor: e.actor, citizens: e.citizens, summary: e.summary, hash: e.hash })),
    },
    "memory_history.json": {
      schema: "archipelago/memory-history/v1",
      records: s.memories,
      events: input.events.filter((e) => memoryTypes.has(e.type) && (e.type !== "LifecycleChanged" || ["memory-damaged", "irreversibly-deleted"].includes(String(e.data.to)))).map((e) => ({ seq: e.seq, tick: e.tick, type: e.type, citizens: e.citizens, summary: e.summary, hash: e.hash })),
    },
    "civilization_metrics.json": { schema: "archipelago/civilization-metrics/v1", definitions: metricDefinitions, final: metrics, series: input.series },
  };
  const visualizations: Visualization[] = [
    { id: "viz-lineage", title: "Identity lineage (person-stages)", kind: "graph", dataFile: "lineage_graph.json", description: "Person-stages split at forks and mergers; edges show record continuation, forks, mergers and continuity claims (testimony).", encoding: { node: "person-stage", edge: "kind", colour: "edge kind" } },
    { id: "viz-relationships", title: "Relationship network", kind: "network", dataFile: "relationship_network.json", description: "Citizens as nodes and relationships as links.", encoding: { node: "citizen", link: "relationship", colour: "residence", stroke: "kind" } },
    { id: "viz-governance", title: "Governance timeline", kind: "timeline", dataFile: "governance_events.json", description: "Proposals, votes, laws, petitions, migrations, mergers and policy refusals over time.", encoding: { x: "seq", row: "type" } },
    { id: "viz-memory", title: "Memory history", kind: "timeline", dataFile: "memory_history.json", description: "Memory records with their provenance chains, and memory events over time.", encoding: { x: "seq", row: "holder", colour: "status" } },
    { id: "viz-metrics", title: "Civilization metrics over time", kind: "timeseries", dataFile: "civilization_metrics.json", description: "Snapshot metrics at the end of each tick, plus final metric values with definitions.", encoding: { x: "tick", y: "metric value" } },
  ].map((v) => VisualizationSchema.parse(v));
  return { visualizations, data };
}

function section(heading: string, kind: Publication["sections"][number]["kind"], body: string) {
  return { heading, kind, body };
}

/** Findings → publication draft. Interpretation is left to researchers, explicitly. */
const STUDY_LIMITATION = "Study replications are deterministic runs under declared variations of seed, founding law or the branch point. A distribution over seeds is a distribution over the generator and the rules, not over anything else, and a timeline's divergence is a consequence of the variation declared at its branch, nothing more.";

function studyMarkdown(study: StudyResult, manifest: ExperimentManifest): string {
  const out: string[] = [
    "_Replications of this run under the variations the manifest declares. Each is a deterministic run of its own, identified by its head hash; none is interpreted here._",
    "",
    `Base run: head \`${study.base.headHash}\`, ${study.base.eventCount} events${study.base.branchSeq === null ? "" : `, branch point after seq ${study.base.branchSeq}`}.`,
    "",
  ];
  const hyps = manifest.hypotheses.map((h) => h.id);
  const hypMetrics = [...new Set(manifest.hypotheses.map((h) => h.operationalisation.metric))];
  const outcomes = (r: StudyResult["runs"][number]) => hyps.map((h) => r.findings.find((f) => f.hypothesisId === h)?.outcome.replace("-with-hypothesis", "") ?? "n/a").join(" / ");
  const head = (r: StudyResult["runs"][number]) => (r.headHash ? `\`${r.headHash.slice(0, 12)}…\`` : "—");
  const tally = (s: NonNullable<StudyResult["summary"][keyof StudyResult["summary"]]>) =>
    hyps.map((h) => { const t = s.hypotheses[h]; return t ? `- \`${h}\`: consistent in ${t.consistent} of ${t.n} completed run(s)${t.inconsistent ? `, inconsistent in ${t.inconsistent}` : ""}${t.undetermined ? `, undetermined in ${t.undetermined}` : ""}.` : `- \`${h}\`: not evaluated.`; });
  const metricTable = (s: NonNullable<StudyResult["summary"][keyof StudyResult["summary"]]>) => [
    "| metric | n | min | median | mean | max |", "|---|---:|---:|---:|---:|---:|",
    ...hypMetrics.map((id) => { const v = s.metrics[id]; return v ? `| \`${id}\` | ${v.n} | ${v.min} | ${v.median} | ${v.mean} | ${v.max} |` : `| \`${id}\` | 0 | — | — | — | — |`; }),
  ];
  const seeds = study.runs.filter((r) => r.group === "seeds");
  if (study.summary.seeds) {
    out.push(`### Seed sweep (${seeds.length} runs, hypothesis outcomes ${hyps.join(" / ")})`, "", "| run | seed | events | head | outcomes |", "|---|---|---:|---|---|",
      ...seeds.map((r) => `| ${r.id} | \`${String(r.variation.seed)}\` | ${r.eventCount ?? "—"} | ${head(r)} | ${r.status === "completed" ? outcomes(r) : `infeasible: ${r.reason}`} |`),
      "", ...tally(study.summary.seeds), "", ...metricTable(study.summary.seeds), "");
  }
  const doctrines = study.runs.filter((r) => r.group === "doctrines");
  if (study.summary.doctrines) {
    out.push(`### Doctrine variants (${doctrines.length} runs, statutory law overridden at founding)`, "", "| variant | island | amendment | events | head | outcomes |", "|---|---|---|---:|---|---|",
      ...doctrines.map((r) => `| ${r.id} | ${String(r.variation.island)} | \`${JSON.stringify(r.variation.amendment)}\` | ${r.eventCount ?? "—"} | ${head(r)} | ${r.status === "completed" ? outcomes(r) : `infeasible: ${r.reason}`} |`),
      "", ...tally(study.summary.doctrines), "", ...metricTable(study.summary.doctrines), "");
  }
  const timelines = study.runs.filter((r) => r.group === "timelines");
  if (study.summary.timelines) {
    out.push(`### Alternate timelines (${timelines.length} runs, branched after seq ${study.base.branchSeq ?? "—"})`, "", "| timeline | seed | amendment at the branch | events | head | outcomes |", "|---|---|---|---:|---|---|",
      ...timelines.map((r) => `| ${r.id} | \`${String(r.variation.seed)}\` | ${r.variation.amendment ? `\`${JSON.stringify(r.variation.amendment)}\`` : "none"} | ${r.eventCount ?? "—"} | ${head(r)}${r.headHash === study.base.headHash ? " (= base)" : ""} | ${r.status === "completed" ? outcomes(r) : `infeasible: ${r.reason}`} |`),
      "", ...tally(study.summary.timelines), "", ...metricTable(study.summary.timelines), "");
  }
  return out.join("\n");
}

export function draftPublication(experiment: Experiment, manifest: ExperimentManifest, metricDefinitions: readonly MetricDefinition[], metrics: readonly MetricValue[], observations: readonly Observation[], findings: readonly Finding[], study: StudyResult | null = null): Publication {
  const val = (id: string) => metrics.find((m) => m.metric === id)?.value ?? 0;
  const consistent = findings.filter((f) => f.outcome === "consistent-with-hypothesis").length;
  const unit = (id: string) => metricDefinitions.find((d) => d.id === id)?.unit ?? "";
  const metricRows = metrics.map((m) => `| \`${m.metric}\` | ${m.value} | ${unit(m.metric)} |`);
  const defRows = metricDefinitions.map((d) => `| \`${d.id}\` | ${d.name} | ${d.unit} | ${d.definition} |`);
  const trace = (o: Observation) => [...o.events.map((e) => `seq ${e.seq}`), ...o.metrics.map((m) => `\`${m.metric}\``)].join(", ");
  return PublicationSchema.parse({
    id: `pub-${experiment.id}`,
    experimentId: experiment.id,
    title: experiment.title,
    status: "draft",
    sections: [
      section("Abstract", "observation", [
        `${experiment.category === "demonstration" ? "Demonstration" : "Experiment"} \`${experiment.id}\` ran scenario \`${experiment.scenario}\` with seed \`${experiment.seed}\` on simulation ${experiment.simulationVersion}.`,
        `The event store recorded ${val("simulation.events")} events over ${val("simulation.ticks")} ticks, with ${val("population.records")} citizen records, ${val("identity.forks")} fork event(s) and ${val("identity.continuity_claims")} continuity claim(s).`,
        `${findings.length} operationalised hypotheses were evaluated: ${consistent} result(s) consistent and ${findings.length - consistent} not consistent with the hypothesis as operationalised.`,
        "This abstract restates computed values only. It contains no interpretation.",
      ].join(" ")),
      section("Research Question", "method", `**${manifest.question.id}**: ${manifest.question.text}\n\n_Motivation (researcher-authored):_ ${manifest.question.motivation}`),
      section("Hypothesis", "hypothesis", manifest.hypotheses.map((h) => `- **${h.id}**: ${h.statement}\n  - Operationalisation: \`${h.operationalisation.metric} ${h.operationalisation.comparator} ${h.operationalisation.threshold}\``).join("\n")),
      section("Experimental Design", "method", [
        `_Scenario description (researcher-authored):_ ${manifest.description}`,
        "",
        `- Category: ${manifest.category} — ${CATEGORY_MEANING[manifest.category]}`,
        `- Minds: ${manifest.minds.kind} (\`${manifest.minds.model}\` ${manifest.minds.modelVersion}, prompt \`${manifest.minds.promptId}\`)`,
        `- Researchers: ${manifest.researchers.map((r) => `\`${r.id}\` (${r.role})`).join("; ")}`,
        `- Research bounds: interventions ${manifest.researchBounds.allowedInterventions.join(", ")}; at most ${manifest.researchBounds.maxInterventions}; max grant ${manifest.researchBounds.maxCreditsPerGrant}`,
        `- Agent-based epilogue rounds: ${manifest.parameters.abmRounds}`,
        "- Kernel: deterministic, event-sourced. Only commands that pass schema, authorisation and island-law validation change the world.",
      ].join("\n")),
      section("Configuration", "provenance", [
        "| key | value |", "|---|---|",
        `| experiment id | \`${experiment.id}\` |`,
        `| civilization id | \`${experiment.civilizationId}\` |`,
        `| simulation version | ${experiment.simulationVersion} |`,
        `| interchange version | ${INTERCHANGE_VERSION} |`,
        `| configuration hash | \`${experiment.configurationHash}\` |`,
        `| seed | \`${experiment.seed}\` |`,
        `| start timestamp | ${experiment.startedAt} |`,
        `| end timestamp | ${experiment.endedAt} |`,
      ].join("\n")),
      section("Results", "metric", [
        "### Findings", "",
        "| hypothesis | metric | observed | test | outcome |", "|---|---|---:|---|---|",
        ...findings.map((f) => `| ${f.hypothesisId} | \`${f.metric}\` | ${f.observedValue ?? "n/a"} | \`${f.comparator} ${f.threshold}\` | ${f.outcome} |`),
        "", ...findings.map((f) => `- ${f.statement}`),
        "", "### Metrics", "", "| metric | value | unit |", "|---|---:|---|", ...metricRows,
      ].join("\n")),
      ...(study ? [section("Study", "metric", studyMarkdown(study, manifest))] : []),
      section("Observations", "observation", observations.map((o) => `- **${o.id}** (${o.basis}): ${o.statement} _[trace: ${trace(o)}]_`).join("\n")),
      section("Interpretation", "interpretation", "_Not generated._ The system does not produce interpretations or conclusions beyond the computed findings above. Researchers may add interpretation here. It must be labelled as interpretation and kept separate from observations. Any discussion of consciousness must be framed as a labelled hypothesis or as fiction."),
      section("Limitations", "limitation", [...manifest.limitations, ...(manifest.category === "demonstration" ? [`Demonstration: ${CATEGORY_MEANING.demonstration}`] : []), ...(study ? [STUDY_LIMITATION] : []), "Single deterministic run. Results describe this run and support no statistical inference.", EPISTEMIC_STATEMENT].map((l) => `- ${l}`).join("\n")),
      section("Future Work", "method", manifest.futureWork.length > 0 ? manifest.futureWork.map((f) => `- ${f}`).join("\n") : "- None recorded."),
      section("Reproducibility Information", "provenance", [
        `- Simulation: ${experiment.simulationVersion}; interchange v${INTERCHANGE_VERSION}`,
        `- Configuration hash: \`${experiment.configurationHash}\``,
        `- Seed: \`${experiment.seed}\``,
        `- Event store head hash: \`${experiment.eventStore.headHash}\` (${experiment.eventStore.eventCount} events)`,
        "- Reproduce: `cd simulation && npx tsx src/cli.ts publish ../experiments/<experiment>/experiment.yaml ..`",
        "- Verify: `cd simulation && npx tsx src/cli.ts verify ../exports/<experiment-id>`",
        "", "### Metric definitions", "", "| metric | name | unit | definition |", "|---|---|---|---|", ...defRows,
      ].join("\n")),
    ],
  });
}

/** The full pipeline: Simulation → Metrics → Observations → Findings → Publication Draft. */
export function runResearchPipeline(input: ResearchInput, manifest: ExperimentManifest, times: RunTimestamps, study: StudyResult | null = null): ResearchBundle {
  const metricDefinitions = definitions();
  const metrics = computeMetrics(input);
  const observations = deriveObservations(input, metrics, manifest.hypotheses);
  const findings = deriveFindings(manifest.hypotheses, metrics, observations);
  const last = input.events[input.events.length - 1] as StreamEvent;
  const experiment = ExperimentSchema.parse({
    id: manifest.id,
    title: manifest.title,
    category: manifest.category,
    civilizationId: manifest.civilizationId,
    questionId: manifest.question.id,
    hypothesisIds: manifest.hypotheses.map((h) => h.id),
    scenario: manifest.scenario,
    seed: manifest.seed,
    simulationVersion: input.simulation.version,
    configurationHash: configurationHash(manifest),
    startedAt: times.startedAt,
    endedAt: times.endedAt,
    eventStore: { headHash: last.hash, eventCount: input.events.length },
  });
  const chronicle = buildChronicle(input, manifest.civilizationId);
  const { visualizations, data } = buildVisualizations(input, metrics, metricDefinitions);
  const publication = draftPublication(experiment, manifest, metricDefinitions, metrics, observations, findings, study);
  return { experiment, manifest, metricDefinitions, metrics, observations, findings, chronicle, publication, visualizations, visualizationData: data };
}
