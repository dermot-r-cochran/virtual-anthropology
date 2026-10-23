import type { ProposalRecord } from "../../agents/runtime.js";
import { depthOf, describeMembership, memberCount, type PluralSystem } from "../../domain/plurality.js";
import { buildTimeline, timelineMarkdown } from "../../narrative/timeline.js";
import type { ExperimentManifest } from "../../research/manifest.js";
import type { ScenarioRun } from "../index.js";
import type { TwoVoicesRun } from "./run.js";

/**
 * Two Voices' scenario-specific products: the event timeline and a report of
 * the plural citizen's season, every line of it from the record: each change
 * of front with its event and the charter rule cited, each reconciliation
 * with every fronting member's rule trace and the system's decision, and what
 * the system said when asked who was speaking. Nothing here interprets; the
 * members' differences are reported as the record holds them, as difference.
 */

export interface FrontingChange {
  readonly seq: number;
  readonly hash: string;
  readonly tick: number;
  readonly from: readonly string[];
  readonly to: readonly string[];
  readonly newlyFronted: readonly string[];
  readonly citations: readonly string[];
  readonly findings: readonly string[];
}

export interface Reconciliation {
  readonly beat: string;
  readonly outcome: ProposalRecord["outcome"];
  readonly commandId: string | null;
  /** The event the proposal produced, when applied. */
  readonly event: { seq: number; type: string; hash: string } | null;
  /** The rationale split into its lines: one per fronting member's trace, the difference or concurrence, and the decision. */
  readonly lines: readonly string[];
  readonly plan: string;
}

export function frontingChanges(run: TwoVoicesRun): FrontingChange[] {
  return run.world.log.flatMap((r) =>
    r.event.type === "FrontingChanged"
      ? [{ seq: r.seq, hash: r.hash, tick: r.tick, from: r.event.from, to: r.event.to, newlyFronted: r.event.newlyFronted, citations: r.policy?.citations ?? [], findings: r.policy?.findings ?? [] }]
      : [],
  );
}

export function reconciliations(run: TwoVoicesRun): Reconciliation[] {
  const { system } = run.markers;
  const byCommand = new Map(run.world.log.filter((r) => r.commandId !== null && r.event.type !== "CommandRejected").map((r) => [r.commandId as string, r]));
  return run.runtime.proposals
    .filter((p) => p.proposer === system && p.rationale.startsWith("plural "))
    .map((p) => {
      const [body, plan] = p.rationale.split("; plan ");
      const rec = p.commandId ? byCommand.get(p.commandId) : undefined;
      return {
        beat: p.beat,
        outcome: p.outcome,
        commandId: p.commandId,
        event: rec ? { seq: rec.seq, type: rec.event.type, hash: rec.hash } : null,
        lines: (body ?? p.rationale).split(" | "),
        plan: plan ?? "",
      };
    });
}

function systemSummary(sys: PluralSystem, indent = ""): string[] {
  const out = [`${indent}- membership: ${describeMembership(sys)}; reconciliation: ${sys.reconciliation}; fronting at the end of the run: ${sys.fronting.join(", ") || "nobody"}; nesting depth ${depthOf(sys)}`];
  for (const m of sys.members) {
    out.push(`${indent}- ${m.name} (\`${m.id}\`)${m.role ? `, ${m.role}` : ""}: say ${m.say}; ${m.everFronted ? "has fronted" : "has never fronted"}${m.subsystem ? `; a subsystem of ${memberCount(m.subsystem)?.toLocaleString("en-GB") ?? "uncounted"} members, ${m.subsystem.members.length} known:` : ""}`);
    if (m.subsystem) out.push(...systemSummary(m.subsystem, `${indent}  `));
  }
  return out;
}

export function twoVoicesMarkdown(run: TwoVoicesRun, title: string): string {
  const s = run.world.state;
  const sys = s.citizens[run.markers.system];
  if (!sys?.plurality) throw new Error("Two Voices: the system is not recorded as plural");
  const changes = frontingChanges(run);
  const recs = reconciliations(run);
  const out = [
    `# ${title}: the plural citizen's season`,
    "",
    `_Every line below is read from the event store or the agent runtime's proposal log of this run. A plural system is one citizen; its members' differing proposals are recorded as difference, and the system's own declared way of deciding reconciles them. Nothing here is interpreted._`,
    "",
    `## The system as the record knows it`,
    "",
    `${sys.name} (\`${sys.id}\`, civic identity ${sys.civicId}), one citizen of ${s.islands[sys.residence]?.name ?? sys.residence}, holds one ledger account and one place in every electorate it belongs to.`,
    "",
    ...systemSummary(sys.plurality),
    "",
    "## Changes of front",
    "",
    "| seq | tick | from | to | fronting for the first time | charter rule cited | finding |",
    "|---:|---:|---|---|---|---|---|",
    ...changes.map((c) => `| ${c.seq} | ${c.tick} | ${c.from.join(", ") || "nobody"} | ${c.to.join(", ") || "nobody"} | ${c.newlyFronted.join(", ") || "—"} | ${c.citations.map((x) => `\`${x}\``).join(", ")} | ${c.findings[0] ?? ""} |`),
    "",
    `Each change is the citizen's own \`ChangeFronting\` command, recorded as \`FrontingChanged\` (event hashes: ${changes.map((c) => `\`${c.hash.slice(0, 12)}…\``).join(", ")}). No fork and no descendant record arose from any of them.`,
    "",
    "## Reconciliations",
    "",
    `_One per interlude in which the system proposed. Each fronting member's line is the trace of its own rule base; the next line says whether the members differed or concurred; the last says how the system decided (\`${sys.plurality.reconciliation}\`: ${sys.plurality.reconciliation === "weighted-say" ? "the fronting member with the greatest say decides, and equal say is a recorded choice point" : sys.plurality.reconciliation})._`,
    "",
  ];
  recs.forEach((r, i) => {
    out.push(`### Interlude ${i + 1}`, "");
    for (const line of r.lines) out.push(`- ${line}`);
    out.push(`- plan: ${r.plan}`, `- outcome: ${r.outcome}${r.event ? `, recorded as \`${r.event.type}\` at seq ${r.event.seq} (\`${r.event.hash.slice(0, 12)}…\`)` : ""}`, "");
  });
  out.push("## What the system said when asked who was speaking", "");
  for (const c of run.conversations) {
    const rec = c.recorded.status === "applied" ? c.recorded.events[0] : undefined;
    out.push(`- ${rec ? `(seq ${rec.seq}) ` : ""}"${c.reply}"${c.flags.length ? ` _guard flags: ${c.flags.join(", ")}_` : ""}`);
  }
  out.push("", "## The ballot", "");
  for (const p of Object.values(s.proposals)) {
    out.push(`"${p.title}" on ${s.islands[p.island]?.name ?? p.island}: electorate of ${p.electorate.length}, ${Object.keys(p.votes).length} vote(s) cast, ${p.status}${p.tally ? ` (yes ${p.tally.yes}, no ${p.tally.no}, abstain ${p.tally.abstain})` : ""}. ${sys.name}'s vote: ${p.votes[sys.id] ?? "none"}; one vote, whichever members fronted.`);
  }
  return out.join("\n") + "\n";
}

export function twoVoicesScenarioOutputs(run: TwoVoicesRun, manifest: ExperimentManifest): ScenarioRun {
  const { world, markers } = run;
  const s = world.state;
  const log = world.log;
  const timeline = buildTimeline(log, s, run.beats);
  const sys = s.citizens[markers.system]?.plurality ?? null;
  return {
    log,
    state: s,
    headHash: world.headHash,
    branchSeq: null,
    choices: run.choices,
    unusedFlips: [],
    analyses: { evidence: null, legal: null },
    dataset: {
      markers,
      beats: run.beats,
      timeline,
      plurality: sys ? { citizen: markers.system, knownMembers: sys.members.length, memberCount: memberCount(sys), depth: depthOf(sys), fronting: sys.fronting, reconciliation: sys.reconciliation } : null,
      frontingChanges: frontingChanges(run),
      reconciliations: reconciliations(run),
      conversations: run.conversations.map((c) => ({ reply: c.reply, flags: c.flags, blocked: c.blocked })),
      abmRounds: run.rounds,
      agentProposals: run.runtime.proposals,
    },
    files: {
      "reports/timeline.md": timelineMarkdown(timeline, manifest.title),
      "reports/two-voices.md": twoVoicesMarkdown(run, manifest.title),
    },
  };
}
