import { stringify as toYaml } from "yaml";
import type { CivilizationChronicle, EpistemicKind, MetricValue, Publication } from "./domain.js";
import type { ResearchInput } from "./interchange.js";
import { METRIC_INDEX } from "./metric-registry.js";
import { EPISTEMIC_STATEMENT, type ResearchBundle } from "./pipeline.js";

const KIND_LABEL: Record<EpistemicKind, string> = {
  observation: "Observation — restates recorded events or computed values",
  metric: "Metric — computed by a documented, deterministic function",
  hypothesis: "Hypothesis — researcher-authored, tested only as operationalised",
  interpretation: "Interpretation — researcher-authored; never generated",
  method: "Method — design and configuration as declared",
  limitation: "Limitation",
  provenance: "Provenance — identifiers for reproduction",
};

/** reports/experiments/<experiment-id>.md */
export function experimentReportMarkdown(pub: Publication): string {
  const out = [`# ${pub.title}`, "", `_Publication draft \`${pub.id}\`, generated from experiment \`${pub.experimentId}\`._`, "", `> ${EPISTEMIC_STATEMENT}`, ""];
  for (const s of pub.sections) out.push(`# ${s.heading}`, "", `> _Epistemic category: ${KIND_LABEL[s.kind]}._`, "", s.body, "");
  return out.join("\n");
}

/** reports/chronicles/<civilization-id>.md */
export function chronicleMarkdown(ch: CivilizationChronicle, title: string): string {
  const out = [
    `# Chronicle of ${title}`, "",
    `Generated from the event stream. ${ch.timeMapping}. Each statement cites the events it was generated from (\`seq:type\`). No statement exists without an event.`, "",
  ];
  for (const p of ch.periods) {
    out.push(`## Year ${p.year}`, "");
    for (const st of p.statements) out.push(`- ${st.text} _[${st.events.map((e) => `${e.seq}:${e.type}`).join(", ")}]_`);
    out.push("");
  }
  return out.join("\n");
}

function metricLine(metrics: readonly MetricValue[], id: string): string {
  const def = METRIC_INDEX.get(id);
  const v = metrics.find((x) => x.metric === id)?.value ?? 0;
  return `| ${def?.name ?? id} | \`${id}\` | ${v} | ${def?.unit ?? ""} |`;
}

function metricTable(metrics: readonly MetricValue[], ids: readonly string[]): string[] {
  return ["| measure | metric | value | unit |", "|---|---|---:|---|", ...ids.map((id) => metricLine(metrics, id))];
}

/**
 * Anthropological observations: templated statements, each the restatement
 * of one or more computed metrics. Conditions select the template; no
 * statement goes beyond the values it cites.
 */
export function anthropologicalObservations(metrics: readonly MetricValue[]): { text: string; metrics: string[] }[] {
  const v = (id: string) => metrics.find((x) => x.metric === id)?.value ?? 0;
  const out: { text: string; metrics: string[] }[] = [];
  if (v("identity.forks") > 0)
    out.push({ text: `${v("identity.forks")} fork event(s) produced ${v("identity.fork_descendants")} descendant record(s) and ${v("social.fork_kin_ties")} fork-kin tie(s).`, metrics: ["identity.forks", "identity.fork_descendants", "social.fork_kin_ties"] });
  if (v("identity.continuity_claims") > 0)
    out.push({
      text: `${v("identity.continuity_claims")} continuity claim(s) were recorded. Among the claimants, ${v("identity.process_continuers")} share the subject's process identifier, ${v("identity.civic_continuers")} share the civic identifier and ${v("identity.memory_continuers")} hold every pre-reference self-narrative record (dissociation = ${v("identity.dimension_dissociation")}).`,
      metrics: ["identity.continuity_claims", "identity.process_continuers", "identity.civic_continuers", "identity.memory_continuers", "identity.dimension_dissociation"],
    });
  if (v("identity.continuity_claims") > 0)
    out.push({ text: `The number of claimants recognised as continuing the subject differs by ${v("legal.recognition_range")} across islands. ${v("legal.unadjudicating_islands")} island(s) do not adjudicate.`, metrics: ["legal.recognition_range", "legal.unadjudicating_islands"] });
  if (v("governance.votes_refused_outside_electorate") > 0)
    out.push({ text: `${v("governance.votes_refused_outside_electorate")} vote(s) were refused because the voter was outside the electorate snapshot.`, metrics: ["governance.votes_refused_outside_electorate"] });
  out.push({ text: `${v("governance.commands_rejected")} command(s) were rejected by validation, authorisation or law. ${v("governance.laws_enacted")} law version(s) were enacted.`, metrics: ["governance.commands_rejected", "governance.laws_enacted"] });
  if (v("memory.imported") + v("memory.integrated") > 0)
    out.push({ text: `${v("memory.imported")} imported record(s) remain marked as imported and ${v("memory.integrated")} were integrated into a self-narrative. Provenance completeness is ${v("memory.provenance_complete")}.`, metrics: ["memory.imported", "memory.integrated", "memory.provenance_complete"] });
  out.push({ text: `The credit Gini coefficient is ${v("economy.credit_gini")}. Supply conserved = ${v("economy.supply_conserved")}.`, metrics: ["economy.credit_gini", "economy.supply_conserved"] });
  return out;
}

/** reports/civilizations/<civilization-id>.md */
export function civilizationReportMarkdown(input: ResearchInput, b: ResearchBundle): string {
  const s = input.snapshot;
  const m = b.metrics;
  const isl = (id: string) => s.islands.find((i) => i.id === id)?.name ?? id;
  const significant = b.chronicle.periods.flatMap((p) => p.statements.filter((st) => ["founding", "identity", "migration", "governance", "testimony"].includes(st.category)).map((st) => ({ year: p.year, st })));
  const out = [
    `# Virtual Anthropology Report: ${b.manifest.civilizationId}`, "",
    `Experiment \`${b.experiment.id}\` · seed \`${b.experiment.seed}\` · head \`${b.experiment.eventStore.headHash}\` · configuration \`${b.experiment.configurationHash}\``, "",
    `> ${EPISTEMIC_STATEMENT} Every value below is computed from the event store or the final snapshot. Section notes say which.`, "",
    "# Population", "",
    ...metricTable(m, ["population.records", "population.active", "population.genesis", "population.stateless"]), "",
    "| residence | citizens |", "|---|---:|",
    ...s.islands.map((i) => `| ${i.name} | ${s.citizens.filter((c) => c.residence === i.id).length} |`), "",
    "# Identity Structures", "",
    "| citizen | name | birth | parents | lifecycle | residence |", "|---|---|---|---|---|---|",
    ...s.citizens.map((c) => `| \`${c.id}\` | ${c.name} | ${c.birthKind} (seq ${c.birthSeq}) | ${c.parents.map((p) => `\`${p}\``).join(", ") || "—"} | ${c.lifecycle} | ${isl(c.residence)} |`), "",
    "# Citizenship Models", "",
    "_Island law at the end of the run (snapshot)._", "",
    "| island | law v | doctrine | copying | memory exchange | merging | immigration | descendant citizenship | citizens |", "|---|---:|---|---|---|---|---|---|---:|",
    ...s.islands.map((i) => `| ${i.name} | ${i.lawVersion} | ${i.doctrine} | ${i.copying} | ${i.memoryExchange} | ${i.merging} | ${i.immigration} | ${i.descendantCitizenship} | ${s.citizens.filter((c) => c.citizenships.includes(i.id)).length} |`), "",
    "# Governance", "",
    ...metricTable(m, ["governance.proposals", "governance.votes_cast", "governance.laws_enacted", "governance.votes_refused_outside_electorate", "governance.commands_rejected", "governance.migrations"]), "",
    "| proposal | island | title | status |", "|---|---|---|---|",
    ...s.proposals.map((p) => `| \`${p.id}\` | ${isl(p.island)} | ${p.title} | ${p.status} |`), "",
    "# Culture", "",
    ...metricTable(m, ["culture.artefacts", "culture.chronicle_entries"]), "",
    "| artefact | kind | title | island | origin |", "|---|---|---|---|---|",
    ...s.artefacts.map((a) => `| \`${a.id}\` | ${a.kind} | ${a.title} | ${isl(a.island)} | ${a.introducedBy ? `researcher intervention (${a.introducedBy})` : "citizens"} |`), "",
    "# Institutions", "",
    ...metricTable(m, ["institutions.count"]), "",
    "| institution | kind | island | members | founded at seq |", "|---|---|---|---:|---:|",
    ...s.institutions.map((i) => `| ${i.name} | ${i.kind} | ${isl(i.island)} | ${i.members.length} | ${i.foundedAtSeq} |`), "",
    "# Significant Historical Events", "",
    "_From the chronicle. Each line cites its source events._", "",
    ...significant.map(({ year, st }) => `- Year ${year}: ${st.text} _[${st.events.map((e) => `${e.seq}:${e.type}`).join(", ")}]_`), "",
    "# Identity Fork Statistics", "",
    ...metricTable(m, ["identity.forks", "identity.fork_descendants", "social.fork_kin_ties", "memory.fork_inherited", "identity.mergers", "identity.continuity_claims", "identity.process_continuers", "identity.civic_continuers", "identity.memory_continuers", "identity.dimension_dissociation", "legal.recognition_range"]), "",
    "# Digital Death Statistics", "",
    ...metricTable(m, ["death.asleep", "death.suspended", "death.archived", "death.process_ended_restorable", "death.memory_damaged", "death.identity_discontinuous", "death.irreversibly_deleted", "death.transitions"]), "",
    "# Anthropological Observations", "",
    "_Each statement restates the cited metrics. Interpretation is left to researchers and must be labelled as such._", "",
    ...anthropologicalObservations(m).map((o) => `- ${o.text} _[${o.metrics.map((x) => `\`${x}\``).join(", ")}]_`), "",
  ];
  return out.join("\n");
}

export interface OutputEntry {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}

/** research_manifest.yaml: the authoritative provenance document of a run. */
export function researchManifestYaml(b: ResearchBundle, input: ResearchInput, outputs: readonly OutputEntry[]): string {
  const mf = b.manifest;
  const doc = {
    schema: "archipelago/research-manifest/v1",
    experiment_id: b.experiment.id,
    title: mf.title,
    question: mf.question,
    hypothesis: mf.hypotheses.map((h) => ({ id: h.id, statement: h.statement, operationalisation: h.operationalisation })),
    world: {
      civilization_id: mf.civilizationId,
      scenario: mf.scenario,
      islands: input.snapshot.islands.map((i) => ({ id: i.id, name: i.name, doctrine: i.doctrine })),
    },
    governance_policy: input.snapshot.islands.map((i) => ({
      island: i.id, law_version: i.lawVersion, copying: i.copying, memory_exchange: i.memoryExchange, merging: i.merging,
      federation: i.federation, immigration: i.immigration, emigration: i.emigration, descendant_citizenship: i.descendantCitizenship,
    })),
    population: {
      founding: b.metrics.find((x) => x.metric === "population.genesis")?.value ?? 0,
      final_records: b.metrics.find((x) => x.metric === "population.records")?.value ?? 0,
      minds: mf.minds,
    },
    simulation_seed: mf.seed,
    simulation_version: b.experiment.simulationVersion,
    configuration_hash: b.experiment.configurationHash,
    start_timestamp: b.experiment.startedAt,
    end_timestamp: b.experiment.endedAt,
    simulated_ticks: input.snapshot.tick,
    event_store: { head_hash: b.experiment.eventStore.headHash, event_count: b.experiment.eventStore.eventCount },
    metrics: b.metricDefinitions.map((d) => ({ id: d.id, unit: d.unit, value: b.metrics.find((x) => x.metric === d.id)?.value ?? null, definition: d.definition })),
    findings: b.findings.map((f) => ({ hypothesis: f.hypothesisId, metric: f.metric, observed: f.observedValue, test: `${f.comparator} ${f.threshold}`, outcome: f.outcome })),
    outputs: outputs.map((o) => ({ path: o.path, sha256: o.sha256, bytes: o.bytes })),
    limitations: mf.limitations,
    ethics: { consciousness_claims: mf.ethics.consciousnessClaims, statement: EPISTEMIC_STATEMENT, notes: mf.ethics.notes },
  };
  return `# Generated by the Archipelago research pipeline. Do not edit by hand.\n${toYaml(doc, { lineWidth: 0 })}`;
}
