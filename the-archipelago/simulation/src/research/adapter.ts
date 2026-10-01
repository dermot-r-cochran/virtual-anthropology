import type { WorldState } from "../domain/model.js";
import type { RecordedEvent } from "../kernel/events.js";
import { applyRecorded } from "../kernel/reducer.js";
import { buildTimeline } from "../narrative/timeline.js";
import type { ContinuityEvidence } from "./evidence.js";
import { ResearchInputSchema, INTERCHANGE_VERSION, type ResearchInput, type Snapshot } from "./interchange.js";
import type { IslandInterpretation } from "./legal.js";
import { buildLineageGraph } from "./lineage.js";
import { measure } from "./metrics.js";

export const SIMULATION_NAME = "the-archipelago";
export const SIMULATION_VERSION = "0.1.0";

export function snapshotOf(s: WorldState): Snapshot {
  return {
    seq: s.seq,
    tick: s.tick,
    citizens: Object.values(s.citizens).map((c) => ({
      id: c.id, name: c.name, lifecycle: c.lifecycle, residence: c.residence, citizenships: c.citizenships, occupation: c.occupation,
      birthKind: c.birth.kind, birthSeq: c.birth.atSeq, parents: c.lineage.parents, forkId: c.lineage.forkId,
      reputation: c.reputation, credits: s.balances[`citizen:${c.id}`] ?? 0,
    })),
    islands: Object.values(s.islands).map((i) => ({
      id: i.id, name: i.name, lawVersion: i.law.version, doctrine: i.law.continuityDoctrine, copying: i.law.copying, countingRule: i.law.countingRule,
      memoryExchange: i.law.memoryExchange, merging: i.law.merging, federation: i.law.federation,
      immigration: i.law.immigration, emigration: i.law.emigration, descendantCitizenship: i.law.descendantCitizenship,
    })),
    relationships: Object.values(s.relationships).map((r) => ({ id: r.id, a: r.a, b: r.b, kind: r.kind, status: r.status, origin: r.origin, sinceSeq: r.sinceSeq, endedAtSeq: r.endedAtSeq })),
    institutions: Object.values(s.institutions).map((i) => ({ id: i.id, name: i.name, island: i.island, kind: i.kind, members: i.members, foundedAtSeq: i.foundedAtSeq })),
    memories: Object.values(s.memories).map((m) => ({
      id: m.id, holder: m.holder, archive: m.archive, experiencedBy: m.experiencedBy, experiencedAtSeq: m.experiencedAtSeq, island: m.island,
      status: m.status, integrity: m.integrity, derivedFrom: m.derivedFrom, tags: m.tags,
      provenance: m.provenance.map((p) => ({ action: p.action, by: p.by, atSeq: p.atSeq, island: p.island })),
    })),
    proposals: Object.values(s.proposals).map((p) => ({ id: p.id, island: p.island, title: p.title, status: p.status, electorate: p.electorate, votes: p.votes, openedAtSeq: p.openedAtSeq })),
    artefacts: Object.values(s.artefacts).map((a) => ({ id: a.id, kind: a.kind, title: a.title, island: a.island, authors: a.authors, introducedBy: a.introducedBy, createdAtSeq: a.createdAtSeq })),
    economy: { totalSupply: s.totalSupply, balancesTotal: Object.values(s.balances).reduce((a, b) => a + b, 0) },
  };
}

function flatten(prefix: string, v: unknown, out: Record<string, number>): void {
  if (typeof v === "number") out[prefix] = v;
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) flatten(prefix ? `${prefix}.${k}` : k, x, out);
}

/** Converts a simulation run into the stable research interchange format. */
export function toResearchInput(
  log: readonly RecordedEvent[],
  state: WorldState,
  analyses: { evidence: ContinuityEvidence | null; legal: readonly IslandInterpretation[] | null } = { evidence: null, legal: null },
): ResearchInput {
  const timeline = buildTimeline(log, state);
  const series: ResearchInput["series"] = [];
  let s: WorldState | null = null;
  log.forEach((rec, i) => {
    s = applyRecorded(s as WorldState, rec);
    const next = log[i + 1];
    if (!next || next.tick !== (s as WorldState).tick) {
      const values: Record<string, number> = {};
      flatten("", measure(s as WorldState), values);
      delete values.seq;
      delete values.tick;
      series.push({ tick: (s as WorldState).tick, seq: rec.seq, values });
    }
  });
  const lineage = buildLineageGraph(state);
  const { evidence, legal } = analyses;
  const input: ResearchInput = {
    interchangeVersion: INTERCHANGE_VERSION,
    simulation: { name: SIMULATION_NAME, version: SIMULATION_VERSION },
    seed: state.seed,
    events: log.map((rec, i) => ({
      seq: rec.seq,
      tick: rec.tick,
      type: rec.event.type,
      actor: `${rec.actor.kind}:${rec.actor.id}`,
      hash: rec.hash,
      citizens: [...(timeline[i]?.citizens ?? [])],
      summary: timeline[i]?.summary ?? "",
      data: rec.event.type === "WorldFounded" ? { scenario: rec.event.scenario, citizens: Object.keys(rec.event.state.citizens).length } : (structuredClone(rec.event) as unknown as Record<string, unknown>),
    })),
    snapshot: snapshotOf(state),
    series,
    analyses: {
      lineage: structuredClone(lineage) as unknown as ResearchInput["analyses"]["lineage"],
      continuity:
        evidence && legal
          ? {
              subject: { citizenId: evidence.subject.citizenId, beforeSeq: evidence.subject.beforeSeq, name: evidence.subject.name },
              claimants: evidence.claimants.map((c) => ({
                claimant: c.claimant,
                sameProcess: c.process.sameProcessId,
                sameCivicId: c.civic.sameCivicId,
                sharedMemoryFraction: c.memory.sharedFraction,
                importedOrIntegrated: c.memory.importedHeld + c.memory.integratedForeign,
              })),
              recognition: Object.fromEntries(legal.map((i) => [i.island, Object.fromEntries(i.readings.map((r) => [r.claimant, r.recognisesContinuity]))])),
            }
          : null,
    },
  };
  return ResearchInputSchema.parse(input);
}
