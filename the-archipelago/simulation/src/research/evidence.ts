import type { CitizenId } from "../domain/ids.js";
import type { PersonStageRef, WorldState } from "../domain/model.js";
import type { RecordedEvent } from "../kernel/events.js";
import { ancestorsOf } from "../kernel/invariants.js";
import { stateAtSeq } from "./replay.js";

/**
 * Evidence bearing on a continuity claim. Every field is an observation about
 * records; none is a verdict. `verdict` is always null: the system does not
 * determine which claimant is metaphysically "the real person".
 */
export interface ClaimantEvidence {
  readonly claimant: CitizenId;
  readonly name: string;
  readonly claim: { statement: string; grounds: readonly string[]; atSeq: number } | null;
  readonly process: { sameProcessId: boolean; processId: string; subjectProcessId: string; epochsSinceSubject: number };
  readonly civic: { sameCivicId: boolean; civicId: string; subjectCivicId: string; citizenships: readonly string[] };
  readonly lineage: { relation: "same-record" | "descendant" | "unrelated"; path: string };
  readonly memory: {
    subjectSelfNarrative: number;
    sharedWithSubject: number;
    sharedFraction: number;
    livedSinceSubject: number;
    importedHeld: number;
    integratedForeign: number;
    damaged: number;
  };
  readonly character: { valueCosine: number; goalJaccard: number; occupationUnchanged: boolean; occupation: string };
  readonly social: { subjectRelationshipsRetained: number; subjectRelationships: number; forkKin: number; newRelationships: number };
  readonly assets: { credits: number; subjectCredits: number; propertiesRetained: readonly string[]; subjectProperties: readonly string[] };
  readonly residence: { atSubject: string; now: string };
  readonly verdict: null;
}

export interface ContinuityEvidence {
  readonly subject: PersonStageRef & { name: string };
  readonly claimants: ClaimantEvidence[];
  readonly caveats: readonly string[];
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;

function cosine(a: Record<string, number>, b: Record<string, number>): number {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  let dot = 0, na = 0, nb = 0;
  for (const k of keys) {
    const x = a[k] ?? 0, y = b[k] ?? 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  return na === 0 || nb === 0 ? 0 : r3(dot / Math.sqrt(na * nb));
}

function jaccard(a: readonly string[], b: readonly string[]): number {
  const A = new Set(a), B = new Set(b);
  const union = new Set([...A, ...B]);
  return union.size === 0 ? 1 : r3([...A].filter((x) => B.has(x)).length / union.size);
}

export function continuityEvidence(log: readonly RecordedEvent[], now: WorldState, subject: PersonStageRef, claimants: readonly CitizenId[]): ContinuityEvidence {
  const then = stateAtSeq(log, subject.beforeSeq - 1);
  const subj = then.citizens[subject.citizenId];
  if (!subj) throw new Error(`subject ${subject.citizenId} did not exist before seq ${subject.beforeSeq}`);
  const subjHashes = new Set(subj.selfNarrativeMemories.map((m) => then.memories[m]?.contentHash));
  const subjRels = Object.values(then.relationships).filter((r) => r.status === "active" && (r.a === subj.id || r.b === subj.id));
  const subjProps = Object.values(then.properties).filter((p) => p.owner === `citizen:${subj.id}`).map((p) => p.id).sort();

  const rows = claimants.map((cid): ClaimantEvidence => {
    const c = now.citizens[cid];
    if (!c) throw new Error(`unknown claimant ${cid}`);
    const own = [...c.selfNarrativeMemories, ...c.heldMemories].map((m) => now.memories[m]).filter((m) => m !== undefined);
    const shared = own.filter((m) => m.status !== "destroyed" && subjHashes.has(m.contentHash) && m.experiencedAtSeq < subject.beforeSeq);
    const claim = [...now.claims].reverse().find((k) => k.claimant === cid && k.subject.citizenId === subject.citizenId);
    const relation = cid === subj.id ? "same-record" : ancestorsOf(now, cid).has(subj.id) ? "descendant" : "unrelated";
    const fork = c.lineage.forkId ? now.forks[c.lineage.forkId] : undefined;
    const rels = Object.values(now.relationships).filter((r) => r.status === "active" && (r.a === cid || r.b === cid));
    const counterpart = (r: { a: string; b: string }, self: string) => (r.a === self ? r.b : r.a);
    const subjCounterparts = new Set(subjRels.map((r) => counterpart(r, subj.id)));
    return {
      claimant: cid,
      name: c.name,
      claim: claim ? { statement: claim.statement, grounds: claim.grounds, atSeq: claim.atSeq } : null,
      process: { sameProcessId: c.processId === subj.processId, processId: c.processId, subjectProcessId: subj.processId, epochsSinceSubject: c.id === subj.id ? c.processEpoch - subj.processEpoch : 0 },
      civic: { sameCivicId: c.civicId === subj.civicId, civicId: c.civicId, subjectCivicId: subj.civicId, citizenships: c.citizenships },
      lineage: {
        relation,
        path: relation === "same-record" ? `${cid} is the record that existed before seq ${subject.beforeSeq}` : relation === "descendant" ? `${cid} ← ${fork?.id ?? "lineage"} ← ${subj.id}` : "no recorded lineage",
      },
      memory: {
        subjectSelfNarrative: subj.selfNarrativeMemories.length,
        sharedWithSubject: shared.length,
        sharedFraction: subj.selfNarrativeMemories.length === 0 ? 0 : r3(shared.length / subj.selfNarrativeMemories.length),
        livedSinceSubject: own.filter((m) => m.experiencedBy === cid && m.experiencedAtSeq >= subject.beforeSeq && m.status === "autobiographical").length,
        importedHeld: own.filter((m) => m.status === "imported").length,
        integratedForeign: own.filter((m) => m.status === "integrated").length,
        damaged: own.filter((m) => m.integrity === "damaged").length,
      },
      character: { valueCosine: cosine(c.values, subj.values), goalJaccard: jaccard(c.goals, subj.goals), occupationUnchanged: c.occupation === subj.occupation, occupation: c.occupation },
      social: {
        subjectRelationshipsRetained: rels.filter((r) => r.kind !== "fork-kin" && subjCounterparts.has(counterpart(r, cid))).length,
        subjectRelationships: subjRels.length,
        forkKin: rels.filter((r) => r.kind === "fork-kin").length,
        newRelationships: rels.filter((r) => r.kind !== "fork-kin" && !subjCounterparts.has(counterpart(r, cid))).length,
      },
      assets: {
        credits: now.balances[`citizen:${cid}`] ?? 0,
        subjectCredits: then.balances[`citizen:${subj.id}`] ?? 0,
        propertiesRetained: subjProps.filter((p) => now.properties[p]?.owner === `citizen:${cid}`),
        subjectProperties: subjProps,
      },
      residence: { atSubject: subj.residence, now: c.residence },
      verdict: null,
    };
  });
  return {
    subject: { ...subject, name: subj.name },
    claimants: rows,
    caveats: [
      "Evidence describes records in a deterministic simulation; it does not establish facts about persons, consciousness, or metaphysical identity.",
      "Fork descendants copy values, goals and pre-fork memories by construction; high similarity is expected and is not independent evidence.",
      "Different continuity theories weight these dimensions differently; see the legal interpretations for four institutionalised readings.",
      "verdict is always null by design.",
    ],
  };
}
