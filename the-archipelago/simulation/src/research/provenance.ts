import type { CitizenId } from "../domain/ids.js";
import type { WorldState } from "../domain/model.js";
import { episodesOf, type EpisodeSource } from "../agents/episodic.js";

export interface ProvenanceRow {
  readonly memoryId: string;
  readonly holder: CitizenId;
  readonly source: EpisodeSource;
  readonly autobiographical: boolean;
  readonly status: string;
  readonly integrity: string;
  readonly experiencedBy: CitizenId;
  readonly experiencedAtSeq: number;
  /** Whether the episode was experienced before the reference seq (e.g. the fork). */
  readonly beforeReference: boolean;
  readonly contentHash: string;
  readonly preview: string;
  readonly chain: ReadonlyArray<{ action: string; by: string | null; from: string | null; atSeq: number; island: string; note: string }>;
}

export interface ProvenanceReport {
  readonly referenceSeq: number;
  readonly holders: ReadonlyArray<{
    readonly citizen: CitizenId;
    readonly name: string;
    readonly counts: Record<EpisodeSource, number>;
    readonly rows: ProvenanceRow[];
  }>;
  /** Content hashes held by more than one of the listed holders, with who holds them. */
  readonly sharedContent: ReadonlyArray<{ contentHash: string; preview: string; holders: CitizenId[] }>;
}

/** Memory-provenance report for a set of holders, relative to a reference seq. */
export function memoryProvenanceReport(s: WorldState, holders: readonly CitizenId[], referenceSeq: number): ProvenanceReport {
  const byHash = new Map<string, { preview: string; holders: Set<CitizenId> }>();
  const out = holders.map((h) => {
    const counts: Record<EpisodeSource, number> = { lived: 0, "lived-by-ancestor": 0, integrated: 0, imported: 0, licensed: 0 };
    const rows: ProvenanceRow[] = episodesOf(s, h).map((e) => {
      const m = s.memories[e.memoryId];
      if (!m) throw new Error(`missing memory ${e.memoryId}`);
      counts[e.source] += 1;
      const preview = (m.content ?? "[destroyed]").slice(0, 100);
      const entry = byHash.get(m.contentHash) ?? { preview, holders: new Set<CitizenId>() };
      entry.holders.add(h);
      byHash.set(m.contentHash, entry);
      return {
        memoryId: m.id,
        holder: h,
        source: e.source,
        autobiographical: e.autobiographical,
        status: m.status,
        integrity: m.integrity,
        experiencedBy: m.experiencedBy,
        experiencedAtSeq: m.experiencedAtSeq,
        beforeReference: m.experiencedAtSeq < referenceSeq,
        contentHash: m.contentHash,
        preview,
        chain: m.provenance.map((p) => ({ ...p })),
      };
    });
    return { citizen: h, name: s.citizens[h]?.name ?? h, counts, rows };
  });
  const sharedContent = [...byHash.entries()]
    .filter(([, v]) => v.holders.size > 1)
    .map(([contentHash, v]) => ({ contentHash, preview: v.preview, holders: [...v.holders].sort() }))
    .sort((a, b) => a.contentHash.localeCompare(b.contentHash));
  return { referenceSeq, holders: out, sharedContent };
}
