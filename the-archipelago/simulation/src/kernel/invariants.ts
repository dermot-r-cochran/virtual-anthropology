import type { RecordedEvent } from "./events.js";
import { LawSchema } from "../domain/law.js";
import type { WorldState } from "../domain/model.js";

/**
 * Invariants that must hold for every reachable world state. The kernel checks
 * them after every command; property-based tests check them over random runs.
 * Each returns human-readable violation messages (empty when the state is sound).
 */
export function checkInvariants(s: WorldState): string[] {
  const v: string[] = [];

  // Economy: conservation of supply and no overdrafts.
  const total = Object.values(s.balances).reduce((a, b) => a + b, 0);
  if (total !== s.totalSupply) v.push(`supply not conserved: ${total} != ${s.totalSupply}`);
  for (const [acct, bal] of Object.entries(s.balances)) if (bal < 0 || !Number.isInteger(bal)) v.push(`invalid balance on ${acct}`);
  for (const id of Object.keys(s.citizens)) if (!(`citizen:${id}` in s.balances)) v.push(`citizen ${id} has no ledger account`);

  // Islands and law.
  for (const island of Object.values(s.islands)) {
    if (!LawSchema.safeParse(island.law).success) v.push(`island ${island.id} has an invalid law`);
    const last = island.lawHistory[island.lawHistory.length - 1];
    if (!last || last.version !== island.law.version) v.push(`island ${island.id} law history does not end at current law`);
    island.lawHistory.forEach((l, i) => {
      if (l.version !== i + 1) v.push(`island ${island.id} law versions are not consecutive`);
    });
  }

  // Citizens, lineage, memory ownership.
  for (const c of Object.values(s.citizens)) {
    if (c.disclosesArtificialNature !== true) v.push(`${c.id} does not disclose artificial nature`);
    if (!(c.residence in s.islands)) v.push(`${c.id} resides on unknown island`);
    for (const p of c.lineage.parents) {
      const parent = s.citizens[p];
      if (!parent) v.push(`${c.id} has unknown parent ${p}`);
      else if (parent.birth.atSeq >= c.birth.atSeq && c.birth.kind !== "genesis") v.push(`${c.id} is older than parent ${p}`);
    }
    if (c.birth.kind === "fork" && (c.lineage.forkId === null || c.lineage.parents.length !== 1)) v.push(`${c.id} fork lineage incomplete`);
    if (c.birth.kind === "merger" && (c.lineage.mergerId === null || c.lineage.parents.length < 2)) v.push(`${c.id} merger lineage incomplete`);
    if (c.mergedInto !== null && !s.citizens[c.mergedInto]) v.push(`${c.id} merged into unknown citizen`);
    if (c.lifecycle === "active" && c.mergedInto !== null) v.push(`${c.id} is active but merged`);

    const ancestors = ancestorsOf(s, c.id);
    for (const id of c.selfNarrativeMemories) {
      const m = s.memories[id];
      if (!m) {
        v.push(`${c.id} references unknown memory ${id}`);
        continue;
      }
      if (m.holder !== c.id) v.push(`${id} listed by ${c.id} but held by ${m.holder}`);
      if (m.status === "autobiographical") {
        if (m.experiencedBy !== c.id && !ancestors.has(m.experiencedBy)) {
          v.push(`${id} is autobiographical for ${c.id} but was experienced by non-ancestor ${m.experiencedBy}`);
        }
        const foreign = m.provenance.some((p) => ["imported-from-archive", "licensed", "inherited", "contributed-to-archive"].includes(p.action));
        if (foreign) v.push(`${id} is marked autobiographical but has external provenance`);
      } else if (m.status === "integrated") {
        if (!m.provenance.some((p) => p.action === "integrated")) v.push(`${id} integrated without an integration step`);
      } else if (m.status !== "destroyed") {
        v.push(`${id} has status ${m.status} but is in ${c.id}'s self-narrative`);
      }
    }
    for (const id of c.heldMemories) {
      const m = s.memories[id];
      if (!m || m.holder !== c.id || (m.status !== "imported" && m.status !== "destroyed")) v.push(`${c.id} held memory ${id} is inconsistent`);
    }
  }
  for (const c of Object.values(s.citizens)) if (hasCycle(s, c.id)) v.push(`lineage cycle through ${c.id}`);

  // Memory provenance must always be visible and well-formed.
  for (const m of Object.values(s.memories)) {
    const first = m.provenance[0];
    if (!first || first.action !== "experienced" || first.by !== m.experiencedBy) v.push(`${m.id} provenance does not begin with its original experience`);
    if (m.derivedFrom !== null) {
      const parent = s.memories[m.derivedFrom];
      if (!parent) v.push(`${m.id} derived from unknown ${m.derivedFrom}`);
      else if (parent.contentHash !== m.contentHash) v.push(`${m.id} content hash differs from source`);
    }
    if (m.status === "destroyed" ? m.content !== null : m.content === null) v.push(`${m.id} content inconsistent with status`);
    if (m.status === "collective" && (m.holder !== null || m.archive === null)) v.push(`${m.id} collective record misplaced`);
    if (m.holder !== null && !s.citizens[m.holder]) v.push(`${m.id} held by unknown citizen`);
    if (m.holder !== null) {
      const h = s.citizens[m.holder];
      const listed = h && (h.selfNarrativeMemories.includes(m.id) || h.heldMemories.includes(m.id));
      if (!listed) v.push(`${m.id} not listed by its holder`);
    }
  }

  // Relationships, institutions, proposals, mergers, federations.
  for (const r of Object.values(s.relationships)) {
    if (!s.citizens[r.a] || !s.citizens[r.b]) v.push(`${r.id} references unknown citizen`);
    if (r.a === r.b) v.push(`${r.id} is reflexive`);
  }
  for (const i of Object.values(s.institutions)) for (const m of i.members) if (!s.citizens[m]) v.push(`${i.id} has unknown member`);
  for (const p of Object.values(s.proposals)) {
    for (const voter of Object.keys(p.votes)) if (!p.electorate.includes(voter)) v.push(`${p.id} has a vote from outside its electorate`);
  }
  for (const m of Object.values(s.mergers)) {
    for (const src of m.sources) if (!s.citizens[src]) v.push(`${m.id} source ${src} has been erased`);
    if (m.status === "executed" && m.mode === "merge") {
      for (const src of m.sources) if (s.citizens[src]?.mergedInto !== m.result) v.push(`${m.id} source ${src} not linked to result`);
    }
  }
  for (const f of Object.values(s.federations)) for (const m of f.members) if (!s.citizens[m]) v.push(`${f.id} member erased`);
  for (const lot of Object.values(s.properties)) if (!(lot.owner in s.balances)) v.push(`${lot.id} owned by unknown account`);
  if (s.interventions.length > s.researchBounds.maxInterventions) v.push("researcher intervention budget exceeded");
  return v;
}

export function ancestorsOf(s: WorldState, id: string): Set<string> {
  const out = new Set<string>();
  const stack = [...(s.citizens[id]?.lineage.parents ?? [])];
  while (stack.length > 0) {
    const p = stack.pop() as string;
    if (out.has(p)) continue;
    out.add(p);
    stack.push(...(s.citizens[p]?.lineage.parents ?? []));
  }
  return out;
}

function hasCycle(s: WorldState, id: string): boolean {
  return ancestorsOf(s, id).has(id);
}

/**
 * Invariants over the whole history (not visible in a single state).
 */
export function checkHistoryInvariants(log: readonly RecordedEvent[], states?: readonly WorldState[]): string[] {
  const v: string[] = [];
  const registered = new Set<string>();
  const deleted = new Set<string>();
  log.forEach((rec, i) => {
    if (rec.seq !== i) v.push(`event ${i} has seq ${rec.seq}`);
    if (i > 0 && rec.prevHash !== log[i - 1]?.hash) v.push(`event ${i} breaks the hash chain`);
    if (rec.actor.kind === "citizen" && deleted.has(rec.actor.id) && rec.event.type !== "CommandRejected") {
      v.push(`deleted citizen ${rec.actor.id} acted at seq ${rec.seq}`);
    }
    const e = rec.event;
    if (e.type === "WorldFounded") for (const id of Object.keys(e.state.citizens)) registered.add(id);
    if (e.type === "CitizenForked") {
      for (const d of e.descendants) registered.add(d.id);
      const lawVersion = e.fork.lawVersion;
      const state = states?.[i - 1];
      const law = state?.islands[e.fork.island]?.lawHistory.find((l) => l.version === lawVersion);
      if (state && law?.copying !== "permitted") v.push(`fork ${e.fork.id} occurred where copying is prohibited`);
      for (const d of e.descendants) {
        if (d.reputation !== 0 || d.successionPlan.length > 0 || d.heldMemories.length > 0) v.push(`${d.id} duplicated parent standing`);
      }
    }
    if (e.type === "MergerExecuted" && e.merged) registered.add(e.merged.id);
    if (e.type === "LifecycleChanged" && e.to === "irreversibly-deleted") {
      deleted.add(e.citizen);
      if (rec.actor.kind !== "citizen" || rec.actor.id !== e.citizen) v.push(`${e.citizen} was deleted without self-determination`);
    }
    const after = states?.[i];
    if (after) for (const id of registered) if (!after.citizens[id]) v.push(`${id} was erased from the registry at seq ${rec.seq}`);
  });
  return v;
}
