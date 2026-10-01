import type { CitizenId } from "../domain/ids.js";
import type { WorldState } from "../domain/model.js";

/**
 * Person-stage lineage graph. A citizen record is split into stages at events
 * that create other persons from it (forks as parent, mergers as source), so
 * claims can point at "the person before the fork" without privileging any
 * claimant. Edges describe recorded relations, not identity verdicts.
 */
export interface StageNode {
  readonly id: string;
  readonly citizen: CitizenId;
  readonly name: string;
  readonly fromSeq: number;
  /** Exclusive end; null while the stage is current. */
  readonly untilSeq: number | null;
  readonly label: string;
}

export interface LineageEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: "same-record-continues" | "forked-into" | "merged-into" | "claims-continuity-with";
  readonly atSeq: number;
  readonly note: string;
}

export interface LineageGraph {
  readonly nodes: StageNode[];
  readonly edges: LineageEdge[];
}

const stageId = (c: string, fromSeq: number) => `${c}@${fromSeq}`;

export function buildLineageGraph(s: WorldState): LineageGraph {
  const splits = new Map<string, Set<number>>();
  const add = (c: string, seq: number) => (splits.get(c) ?? splits.set(c, new Set()).get(c))?.add(seq);
  for (const f of Object.values(s.forks)) add(f.parent, f.atSeq);
  for (const m of Object.values(s.mergers)) if (m.status === "executed" || m.status === "reversed") {
    const created = m.result ? s.citizens[m.result] : undefined;
    if (created) for (const src of m.sources) add(src, created.birth.atSeq);
  }

  const nodes: StageNode[] = [];
  const stagesOf = new Map<string, StageNode[]>();
  for (const c of Object.values(s.citizens).sort((a, b) => a.id.localeCompare(b.id))) {
    const bounds = [c.birth.atSeq, ...[...(splits.get(c.id) ?? [])].sort((a, b) => a - b)];
    const list = bounds.map((from, i) => {
      const until = bounds[i + 1] ?? null;
      const label = until === null ? `${c.name} (${c.id}) from seq ${from}` : `${c.name} (${c.id}) seq ${from}–${until - 1}`;
      return { id: stageId(c.id, from), citizen: c.id, name: c.name, fromSeq: from, untilSeq: until, label };
    });
    stagesOf.set(c.id, list);
    nodes.push(...list);
  }
  const stageContaining = (c: string, seq: number): StageNode | undefined =>
    stagesOf.get(c)?.find((n) => n.fromSeq <= seq && (n.untilSeq === null || seq < n.untilSeq));

  const edges: LineageEdge[] = [];
  for (const list of stagesOf.values()) {
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1] as StageNode;
      const b = list[i] as StageNode;
      edges.push({ from: a.id, to: b.id, kind: "same-record-continues", atSeq: b.fromSeq, note: "same citizen record and process lineage" });
    }
  }
  for (const f of Object.values(s.forks).sort((a, b) => a.atSeq - b.atSeq)) {
    const pre = stageContaining(f.parent, f.atSeq - 1);
    for (const d of f.descendants) {
      const first = stagesOf.get(d)?.[0];
      if (pre && first) edges.push({ from: pre.id, to: first.id, kind: "forked-into", atSeq: f.atSeq, note: `${f.id} on ${f.island} (law v${f.lawVersion})` });
    }
  }
  for (const m of Object.values(s.mergers)) {
    const created = m.result ? s.citizens[m.result] : undefined;
    if (!created) continue;
    for (const src of m.sources) {
      const pre = stageContaining(src, created.birth.atSeq - 1);
      const first = stagesOf.get(created.id)?.[0];
      if (pre && first) edges.push({ from: pre.id, to: first.id, kind: "merged-into", atSeq: created.birth.atSeq, note: `${m.id} (${m.reversibility})` });
    }
  }
  for (const claim of s.claims) {
    const subject = stageContaining(claim.subject.citizenId, claim.subject.beforeSeq - 1);
    const claimant = stageContaining(claim.claimant, claim.atSeq);
    if (subject && claimant) edges.push({ from: claimant.id, to: subject.id, kind: "claims-continuity-with", atSeq: claim.atSeq, note: `${claim.id}: testimony, not a determination` });
  }
  return { nodes, edges };
}

/** Restricts a graph to the stages of the given citizens. */
export function subgraph(g: LineageGraph, citizens: readonly CitizenId[]): LineageGraph {
  const keep = new Set(g.nodes.filter((n) => citizens.includes(n.citizen)).map((n) => n.id));
  return { nodes: g.nodes.filter((n) => keep.has(n.id)), edges: g.edges.filter((e) => keep.has(e.from) && keep.has(e.to)) };
}

export function lineageMermaid(g: LineageGraph): string {
  const key = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "_");
  const arrow: Record<LineageEdge["kind"], string> = {
    "same-record-continues": "-->",
    "forked-into": "==>",
    "merged-into": "==>",
    "claims-continuity-with": "-.->",
  };
  const lines = ["flowchart TD"];
  for (const n of g.nodes) lines.push(`  ${key(n.id)}["${n.label.replace(/"/g, "'")}"]`);
  for (const e of g.edges) lines.push(`  ${key(e.from)} ${arrow[e.kind]}|${e.kind}| ${key(e.to)}`);
  return lines.join("\n") + "\n";
}
