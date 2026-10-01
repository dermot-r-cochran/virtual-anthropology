import type { CitizenId } from "../domain/ids.js";
import type { WorldState } from "../domain/model.js";
import type { RecordedEvent } from "../kernel/events.js";
import { applyRecorded } from "../kernel/reducer.js";

/** Dimensions along which identity continuity can be preserved or broken. */
export const CONTINUITY_DIMENSIONS = ["process", "civic", "lineage", "memory", "narrative", "jurisdiction", "testimony"] as const;
export type ContinuityDimension = (typeof CONTINUITY_DIMENSIONS)[number];

export type ContinuityEffect =
  | "began" // a new process / civic identity / lineage node starts
  | "preserved" // explicitly carried through an event that could have broken it
  | "branched" // one continuer, others originate from it
  | "originated" // came into being from another person's history
  | "interrupted" // paused, restorable
  | "resumed"
  | "replaced" // continued on a new process instance
  | "extended" // gained foreign (non-autobiographical) content
  | "altered"
  | "ended"
  | "asserted"; // testimony: a claim, not a fact

/**
 * An identity-continuity event: a typed, derived record of a transition that
 * bears on whether a person continues. It is a projection of the canonical
 * event log (never an input to it) so analyses can be recomputed and audited.
 */
export interface IdentityContinuityEvent {
  readonly seq: number;
  readonly tick: number;
  readonly citizen: CitizenId;
  readonly dimension: ContinuityDimension;
  readonly effect: ContinuityEffect;
  readonly related: readonly CitizenId[];
  readonly sourceEvent: string;
  readonly detail: string;
}

/** Derives identity-continuity events from a log by replaying it. */
export function deriveContinuityEvents(log: readonly RecordedEvent[]): IdentityContinuityEvent[] {
  const out: IdentityContinuityEvent[] = [];
  let before: WorldState | null = null;
  for (const rec of log) {
    const after: WorldState = applyRecorded(before as WorldState, rec);
    const push = (citizen: CitizenId, dimension: ContinuityDimension, effect: ContinuityEffect, detail: string, related: CitizenId[] = []) =>
      out.push({ seq: rec.seq, tick: rec.tick, citizen, dimension, effect, related, sourceEvent: rec.event.type, detail });
    const e = rec.event;
    switch (e.type) {
      case "WorldFounded":
        for (const c of Object.values(e.state.citizens).sort((a, b) => a.id.localeCompare(b.id))) {
          push(c.id, "process", "began", `process ${c.processId} instantiated at genesis`);
          push(c.id, "civic", "began", `civic identity ${c.civicId} on ${c.residence}`);
        }
        break;
      case "CitizenForked": {
        const parent = e.fork.parent;
        const p = after.citizens[parent];
        push(parent, "process", "preserved", `continuing process ${p?.processId} through fork ${e.fork.id} on ${e.fork.island}`, e.fork.descendants);
        push(parent, "lineage", "branched", `fork ${e.fork.id} created ${e.fork.descendants.length} descendants`, e.fork.descendants);
        for (const d of e.descendants) {
          push(d.id, "process", "began", `new process ${d.processId}`, [parent]);
          push(d.id, "civic", "began", `separate civic identity ${d.civicId}${d.citizenships.length === 0 ? " (stateless: no citizenship granted)" : ""}`, [parent]);
          push(d.id, "lineage", "originated", `descendant of ${parent} in ${e.fork.id}; shared history ends at seq ${e.fork.atSeq}`, [parent]);
          push(d.id, "memory", "originated", `${d.selfNarrativeMemories.length} self-narrative records copied from ${parent} with fork-inherited provenance`, [parent]);
        }
        break;
      }
      case "CitizenMigrated": {
        const c = after.citizens[e.citizen];
        push(e.citizen, "jurisdiction", "altered", `moved ${e.from} → ${e.to}${e.citizenshipGranted ? `; citizenship of ${e.to} granted` : ""}`);
        push(e.citizen, "civic", "preserved", `civic identity ${c?.civicId} carried across jurisdictions`);
        break;
      }
      case "MemoryImported":
        if (e.record.holder) push(e.record.holder, "memory", "extended", `imported ${e.record.id} from archive record ${e.source}; experienced by ${e.record.experiencedBy}; not autobiographical`, [e.record.experiencedBy]);
        break;
      case "MemoryLicensed":
        if (e.record.holder) push(e.record.holder, "memory", "extended", `licensed ${e.record.id} from ${e.source}; not autobiographical`, [e.record.experiencedBy]);
        break;
      case "MemoryIntegrated": {
        const m = after.memories[e.memoryId];
        push(e.citizen, "narrative", "altered", `explicitly integrated ${e.memoryId} (experienced by ${m?.experiencedBy}) into the self-narrative; provenance still shows external origin`, m ? [m.experiencedBy] : []);
        break;
      }
      case "LifecycleChanged": {
        const { citizen, from, to } = e;
        if (e.newProcessId) push(citizen, "process", "replaced", `restored from ${from} on new process ${e.newProcessId}`);
        else if (to === "active") push(citizen, "process", "resumed", `${from} → active`);
        if (["asleep", "suspended", "archived", "process-ended-restorable"].includes(to)) push(citizen, "process", "interrupted", `${from} → ${to}: ${e.reason}`);
        if (to === "memory-damaged") push(citizen, "memory", "altered", `records damaged: ${e.damagedMemoryIds.join(", ") || "none listed"}`);
        if (to === "identity-discontinuous") push(citizen, "civic", "ended", `identity discontinuous: ${e.reason}`);
        if (to === "irreversibly-deleted") {
          push(citizen, "process", "ended", "irreversibly deleted");
          push(citizen, "memory", "ended", `${e.destroyedMemoryIds.length} records destroyed; hashes retained`);
          push(citizen, "civic", "ended", "death in law");
        }
        break;
      }
      case "MergerExecuted": {
        const m = before?.mergers[e.mergerId];
        const sources = m?.sources ?? [];
        if (e.merged) {
          push(e.merged.id, "process", "began", `merged identity ${e.merged.civicId} from ${sources.join(", ")}`, sources);
          push(e.merged.id, "lineage", "originated", `${m?.reversibility} merger ${e.mergerId}`, sources);
          for (const s of sources) push(s, e.sourceState === "identity-discontinuous" ? "civic" : "process", e.sourceState === "identity-discontinuous" ? "ended" : "interrupted", `source of ${m?.reversibility} merger ${e.mergerId} → ${e.sourceState}; never erased`, [e.merged.id]);
        } else if (e.federation) {
          for (const s of sources) push(s, "civic", "preserved", `joined federation ${e.federation.id}; individual identity retained`, sources.filter((x) => x !== s));
        }
        break;
      }
      case "MergerReversed": {
        const m = after.mergers[e.mergerId];
        for (const s of m?.sources ?? []) push(s, "process", "resumed", `merger ${e.mergerId} reversed: ${e.reason}`);
        break;
      }
      case "ContinuityClaimed":
        push(e.claim.claimant, "testimony", "asserted", `claims continuity with ${e.claim.subject.citizenId} before seq ${e.claim.subject.beforeSeq} on grounds: ${e.claim.grounds.join(", ")}`, [e.claim.subject.citizenId]);
        break;
      default:
        break;
    }
    before = after;
  }
  return out;
}
