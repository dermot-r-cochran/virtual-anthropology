import type { CitizenId, IslandId } from "../domain/ids.js";
import type { Memory, WorldState } from "../domain/model.js";

/**
 * Source-monitoring categories for an episode, following the episodic-memory
 * distinction between what a citizen lived through and what it merely holds.
 */
export type EpisodeSource =
  | "lived" // experienced by this citizen
  | "lived-by-ancestor" // experienced by a lineage ancestor before a fork or merger
  | "integrated" // imported, then explicitly adopted into the self-narrative
  | "imported" // held from an archive, not autobiographical
  | "licensed"; // held under licence, not autobiographical

export interface Episode {
  readonly memoryId: string;
  /** What: the content, or null if destroyed. */
  readonly what: string | null;
  /** Where the episode happened. */
  readonly where: IslandId;
  /** When (event sequence number) it was experienced. */
  readonly when: number;
  /** Whose experience produced it. */
  readonly who: CitizenId;
  readonly source: EpisodeSource;
  readonly autobiographical: boolean;
  readonly integrity: Memory["integrity"];
  readonly tags: readonly string[];
  /** Provenance chain as compact human-readable steps. */
  readonly provenance: readonly string[];
}

function sourceOf(m: Memory, holder: CitizenId): EpisodeSource {
  if (m.status === "integrated") return "integrated";
  if (m.status === "imported") return m.license ? "licensed" : "imported";
  return m.experiencedBy === holder ? "lived" : "lived-by-ancestor";
}

/** All episodes accessible to a citizen, oldest first, with source monitoring. */
export function episodesOf(state: WorldState, id: CitizenId): Episode[] {
  const c = state.citizens[id];
  if (!c) throw new Error(`unknown citizen ${id}`);
  const out: Episode[] = [];
  for (const mid of [...c.selfNarrativeMemories, ...c.heldMemories]) {
    const m = state.memories[mid];
    if (!m || m.status === "destroyed") continue;
    const source = sourceOf(m, id);
    out.push({
      memoryId: m.id,
      what: m.content,
      where: m.island,
      when: m.experiencedAtSeq,
      who: m.experiencedBy,
      source,
      autobiographical: source === "lived" || source === "lived-by-ancestor" || source === "integrated",
      integrity: m.integrity,
      tags: m.tags,
      provenance: m.provenance.map((p) => `${p.action}@${p.atSeq}${p.by ? ` by ${p.by}` : ""} on ${p.island}`),
    });
  }
  return out.sort((a, b) => a.when - b.when || a.memoryId.localeCompare(b.memoryId));
}

export interface RecallCue {
  readonly tags?: readonly string[];
  readonly where?: IslandId;
  readonly beforeSeq?: number;
  readonly autobiographicalOnly?: boolean;
}

/**
 * Cue-based deterministic recall: episodes are scored by tag overlap, place
 * match and recency; ties break by memory id. Damaged episodes are recalled
 * but flagged, never silently repaired.
 */
export function recall(state: WorldState, id: CitizenId, cue: RecallCue = {}, limit = 5): Episode[] {
  const eps = episodesOf(state, id).filter(
    (e) => (cue.beforeSeq === undefined || e.when < cue.beforeSeq) && (!cue.autobiographicalOnly || e.autobiographical),
  );
  const horizon = Math.max(1, state.seq);
  const scored = eps.map((e) => {
    const overlap = cue.tags ? e.tags.filter((t) => cue.tags?.includes(t)).length : 0;
    const place = cue.where && e.where === cue.where ? 1 : 0;
    const recency = e.when / horizon;
    return { e, score: overlap * 2 + place + recency };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.e.memoryId.localeCompare(b.e.memoryId))
    .slice(0, limit)
    .map((s) => s.e);
}
