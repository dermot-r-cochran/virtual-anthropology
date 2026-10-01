import { GEOGRAPHY } from "../domain/geography.js";
import type { ContinuityEvidence } from "../research/evidence.js";
import type { IslandInterpretation } from "../research/legal.js";
import type { ProvenanceReport } from "../research/provenance.js";

const esc = (t: string) => t.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function provenanceMarkdown(r: ProvenanceReport): string {
  const out = ["# Memory-provenance report", "", `Reference point: seq ${r.referenceSeq} (records experienced before it are pre-reference).`, ""];
  for (const h of r.holders) {
    out.push(`## ${h.name} (${h.citizen})`, "");
    out.push(`Sources: ${Object.entries(h.counts).map(([k, v]) => `${k} ${v}`).join(", ")}`, "");
    out.push("| memory | source | autobiographical | pre-reference | experienced by @seq | provenance chain | content |", "|---|---|---|---|---|---|---|");
    for (const m of h.rows) {
      const chain = m.chain.map((p) => `${p.action}@${p.atSeq}${p.by ? `(${p.by})` : ""}`).join(" → ");
      out.push(`| ${m.memoryId} | ${m.source} | ${m.autobiographical ? "yes" : "no"} | ${m.beforeReference ? "yes" : "no"} | ${m.experiencedBy} @${m.experiencedAtSeq} | ${chain} | ${esc(m.preview)} |`);
    }
    out.push("");
  }
  out.push("## Content held by more than one holder", "", "| content hash | holders | content |", "|---|---|---|");
  for (const c of r.sharedContent) out.push(`| ${c.contentHash.slice(0, 12)}… | ${c.holders.join(", ")} | ${esc(c.preview)} |`);
  return out.join("\n") + "\n";
}

export function evidenceMarkdown(e: ContinuityEvidence): string {
  const out = [
    "# Identity-continuity evidence",
    "",
    `Subject: **${e.subject.name}** (${e.subject.citizenId}) as recorded before seq ${e.subject.beforeSeq}.`,
    "",
    "> The system exposes evidence and competing interpretations. It does not determine which claimant is metaphysically \"the real person\"; every `verdict` is `null`.",
    "",
  ];
  const cols = e.claimants;
  const row = (label: string, f: (c: (typeof cols)[number]) => string) => `| ${label} | ${cols.map((c) => esc(f(c))).join(" | ")} |`;
  out.push(`| dimension | ${cols.map((c) => `${c.name} (${c.claimant})`).join(" | ")} |`, `|---|${cols.map(() => "---").join("|")}|`);
  out.push(
    row("claim", (c) => (c.claim ? `"${c.claim.statement}" [${c.claim.grounds.join(", ")}]` : "none")),
    row("same process", (c) => `${c.process.sameProcessId ? "yes" : "no"} (${c.process.processId.slice(0, 12)}…)`),
    row("same civic id", (c) => `${c.civic.sameCivicId ? "yes" : "no"} (${c.civic.civicId})`),
    row("citizenships", (c) => c.civic.citizenships.join(", ") || "none"),
    row("lineage", (c) => `${c.lineage.relation}: ${c.lineage.path}`),
    row("pre-subject memories shared", (c) => `${c.memory.sharedWithSubject}/${c.memory.subjectSelfNarrative} (${c.memory.sharedFraction})`),
    row("lived since subject", (c) => String(c.memory.livedSinceSubject)),
    row("imported / integrated", (c) => `${c.memory.importedHeld} / ${c.memory.integratedForeign}`),
    row("value cosine", (c) => String(c.character.valueCosine)),
    row("goal overlap (Jaccard)", (c) => String(c.character.goalJaccard)),
    row("occupation", (c) => `${c.character.occupation}${c.character.occupationUnchanged ? " (unchanged)" : " (changed)"}`),
    row("subject relationships retained", (c) => `${c.social.subjectRelationshipsRetained}/${c.social.subjectRelationships}; fork-kin ${c.social.forkKin}; new ${c.social.newRelationships}`),
    row("credits (subject had)", (c) => `${c.assets.credits} (${c.assets.subjectCredits})`),
    row("properties retained", (c) => `${c.assets.propertiesRetained.join(", ") || "none"} of ${c.assets.subjectProperties.join(", ") || "none"}`),
    row("residence (then → now)", (c) => `${c.residence.atSubject} → ${c.residence.now}`),
    row("verdict", () => "null"),
  );
  out.push("", "## Caveats", "", ...e.caveats.map((c) => `- ${c}`));
  return out.join("\n") + "\n";
}

export function legalMarkdown(interps: readonly IslandInterpretation[], names: Record<string, string>): string {
  const out = ["# Legal interpretation from each island", "", "Each island reads the same evidence under its own law. The readings conflict by design; none is privileged.", ""];
  for (const i of interps) {
    out.push(`## ${GEOGRAPHY[i.island].name} — law v${i.lawVersion} (${i.doctrine})`, "", `> ${i.doctrineText}`, "", i.summary, "");
    for (const r of i.readings) {
      out.push(`- **${names[r.claimant] ?? r.claimant}** (${r.claimant}): \`${r.standing}\``);
      for (const why of r.reasoning) out.push(`  - ${why}`);
      out.push(`  - citations: ${r.citations.join(", ")}`);
    }
    if (i.registryRecord.length > 0) {
      out.push("", "Registry record:");
      for (const rr of i.registryRecord) out.push(`- seq ${rr.seq}, ${rr.petitionId} ${rr.side}: ${rr.decision}. ${rr.findings.join("; ")} [${rr.citations.join(", ")}]`);
    }
    out.push("");
  }
  return out.join("\n") + "\n";
}

export function commentaryTemplate(e: ContinuityEvidence, interps: readonly IslandInterpretation[], manifestId: string, headHash: string): string {
  return [
    `# Researcher commentary — ${manifestId}`,
    "",
    `Dataset head hash: \`${headHash}\``,
    "",
    "_Template. Fill each section; keep observations (what the records show) separate from interpretations (what you think they mean)._",
    "",
    "## 1. Researcher and role",
    "",
    "- Name / identifier:",
    "- Role in this run (observer / experimenter / interlocutor):",
    "- Interventions made (cite seq numbers):",
    "",
    "## 2. Observations",
    "",
    ...e.claimants.map((c) => `- ${c.name} (${c.claimant}): `),
    "",
    "## 3. Which evidence dimensions did you weight, and why?",
    "",
    "| dimension | weight (none/low/high) | justification |",
    "|---|---|---|",
    ...["process", "civic identity", "lineage", "shared memory", "foreign memory", "values and goals", "relationships", "assets", "testimony"].map((d) => `| ${d} | | |`),
    "",
    "## 4. Reflections on the island readings",
    "",
    ...interps.map((i) => `- ${GEOGRAPHY[i.island].name} (${i.doctrine}): `),
    "",
    "## 5. Competing interpretations you consider defensible",
    "",
    "1. ",
    "2. ",
    "",
    "## 6. Reflexivity",
    "",
    "- How might your conversations or interventions have shaped the record?",
    "- Where did you find yourself anthropomorphising?",
    "",
    "## 7. Limitations",
    "",
    "- Deterministic placeholder agents; no language model was used.",
    "- No claim is made that any citizen is conscious. Any discussion of consciousness must be labelled as hypothesis or fiction.",
    "",
  ].join("\n");
}
