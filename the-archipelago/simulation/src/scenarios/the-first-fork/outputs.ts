import { commentaryTemplate, evidenceMarkdown, legalMarkdown, provenanceMarkdown } from "../../narrative/reports.js";
import { buildTimeline, timelineMarkdown } from "../../narrative/timeline.js";
import { deriveContinuityEvents } from "../../research/continuity-events.js";
import { continuityEvidence } from "../../research/evidence.js";
import { legalInterpretations } from "../../research/legal.js";
import { buildLineageGraph, lineageMermaid, subgraph } from "../../research/lineage.js";
import type { ExperimentManifest } from "../../research/manifest.js";
import { memoryProvenanceReport } from "../../research/provenance.js";
import type { ScenarioRun } from "../index.js";
import type { FirstForkRun } from "./run.js";

/**
 * The First Fork's scenario-specific products: event timeline, lineage graph,
 * memory-provenance report, legal interpretation per island,
 * identity-continuity evidence and researcher commentary template.
 */
export function firstForkScenarioOutputs(run: FirstForkRun, manifest: ExperimentManifest): ScenarioRun {
  const { world, markers } = run;
  const s = world.state;
  const log = world.log;
  const claimants = [markers.original, markers.remainsOnFork, markers.movedToMnemosyne];
  const names = Object.fromEntries(Object.values(s.citizens).map((c) => [c.id, c.name]));
  const timeline = buildTimeline(log, s, run.beats);
  const lineageFocus = subgraph(buildLineageGraph(s), claimants);
  const provenance = memoryProvenanceReport(s, claimants, markers.forkSeq);
  const evidence = continuityEvidence(log, s, markers.subject, claimants);
  const legal = legalInterpretations(s, log, evidence);
  return {
    log,
    state: s,
    headHash: world.headHash,
    branchSeq: run.branchSeq,
    analyses: { evidence, legal },
    dataset: {
      markers,
      beats: run.beats,
      timeline,
      continuityEvents: deriveContinuityEvents(log),
      lineageFocus,
      provenance,
      evidence,
      legal,
      abmRounds: run.rounds,
      agentProposals: run.runtime.proposals,
    },
    files: {
      "reports/timeline.md": timelineMarkdown(timeline, manifest.title),
      "reports/lineage.mmd": lineageMermaid(lineageFocus),
      "reports/memory-provenance.md": provenanceMarkdown(provenance),
      "reports/continuity-evidence.md": evidenceMarkdown(evidence),
      "reports/legal-interpretations.md": legalMarkdown(legal, names),
      "reports/researcher-commentary-template.md": commentaryTemplate(evidence, legal, manifest.id, world.headHash),
    },
  };
}
