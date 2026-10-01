import type { CitizenId } from "../domain/ids.js";
import type { WorldState } from "../domain/model.js";
import type { RecordedEvent } from "../kernel/events.js";
import { episodesOf } from "./episodic.js";
import type { CognitiveState, Observation } from "./types.js";

function involves(rec: RecordedEvent, id: CitizenId): boolean {
  return (rec.actor.kind === "citizen" && rec.actor.id === id) || JSON.stringify(rec.event).includes(`"${id}"`);
}

/** Builds the citizen-scoped observation from canonical state. */
export function observe(state: WorldState, log: readonly RecordedEvent[], id: CitizenId, sinceSeq: number): Observation {
  const self = state.citizens[id];
  if (!self) throw new Error(`unknown citizen ${id}`);
  const law = state.islands[self.residence]?.law;
  if (!law) throw new Error(`unknown island ${self.residence}`);
  const kin = Object.values(state.relationships)
    .filter((r) => r.status === "active" && (r.a === id || r.b === id))
    .map((r) => {
      const other = state.citizens[r.a === id ? r.b : r.a];
      return other ? { id: other.id, name: other.name, kind: r.kind, residence: other.residence } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const fork = self.lineage.forkId ? state.forks[self.lineage.forkId] : undefined;
  return structuredClone({
    seq: state.seq,
    tick: state.tick,
    self,
    residenceLaw: law,
    kin,
    openProposals: Object.values(state.proposals).filter((p) => p.status === "open" && self.citizenships.includes(p.island)),
    petitions: Object.values(state.petitions).filter((p) => p.citizen === id),
    archiveCatalogue: (state.archives[self.residence] ?? []).map((mid) => {
      const m = state.memories[mid];
      const contributed = m?.provenance.find((p) => p.action === "contributed-to-archive");
      const alreadyHeld = [...self.heldMemories, ...self.selfNarrativeMemories].some((h) => state.memories[h]?.derivedFrom === mid);
      return { id: mid, tags: m?.tags ?? [], preview: (m?.content ?? "").slice(0, 80), contributedBy: contributed?.by ?? null, alreadyHeld };
    }),
    forksAsParent: Object.values(state.forks)
      .filter((f) => f.parent === id)
      .map((f) => ({ forkId: f.id, atSeq: f.atSeq, descendants: f.descendants })),
    ownFork: fork ? { forkId: fork.id, atSeq: fork.atSeq, parent: fork.parent } : null,
    messages: state.messages.filter((m) => m.to === id).map((m) => ({ from: `${m.from.kind}:${m.from.id}`, text: m.text, atSeq: m.atSeq })),
    recentEventSeqs: log.filter((r) => r.seq > sinceSeq && involves(r, id)).map((r) => r.seq),
    episodes: episodesOf(state, id),
  });
}

export function initialCognition(citizenId: CitizenId): CognitiveState {
  return { citizenId, lastSeenSeq: 0, beliefs: {}, desires: [], intentions: [], salientSeqs: [] };
}

/** Deterministically folds an observation into cognitive state. */
export function updateCognition(cog: CognitiveState, obs: Observation): CognitiveState {
  const salient = [...cog.salientSeqs, ...obs.recentEventSeqs].slice(-50);
  return {
    ...cog,
    lastSeenSeq: obs.seq,
    salientSeqs: salient,
    beliefs: {
      ...cog.beliefs,
      residence: obs.self.residence,
      doctrine: obs.residenceLaw.continuityDoctrine,
      kin: obs.kin.map((k) => k.id).join(","),
      lifecycle: obs.self.lifecycle,
      livedEpisodes: String(obs.episodes.filter((e) => e.source === "lived").length),
      ancestralEpisodes: String(obs.episodes.filter((e) => e.source === "lived-by-ancestor").length),
      foreignEpisodes: String(obs.episodes.filter((e) => !e.autobiographical || e.source === "integrated").length),
      branchOrigin: obs.ownFork ? `${obs.ownFork.forkId}@${obs.ownFork.atSeq}` : "none",
    },
  };
}
