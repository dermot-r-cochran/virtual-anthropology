import { z } from "zod";
import { sha256Hex } from "../kernel/canonical.js";
import { civicIdFor, processIdFor } from "../kernel/decide.js";
import {
  citizenAccount,
  formatId,
  ISLAND_IDS,
  islandAccount,
  IslandIdSchema,
  RESEARCH_ENDOWMENT,
  ResearcherIdSchema,
  type IslandId,
} from "./ids.js";
import { GENESIS_LAWS, ISLAND_PROFILES, LawAmendmentSchema, LawSchema } from "./law.js";
import {
  InstitutionSchema,
  RelationshipSchema,
  ResearchBoundsSchema,
  WorldStateSchema,
  type Citizen,
  type Memory,
  type MindProvenance,
  type WorldState,
} from "./model.js";

export const VALUE_AXES = ["autonomy", "caution", "communality", "curiosity", "tradition", "novelty"] as const;

const key = z.string().regex(/^[a-z][a-z0-9-]*$/);
const content = z.object({ content: z.string().min(1), tags: z.array(z.string().min(1)).default([]) });

export const GenesisConfigSchema = z
  .object({
    seed: z.string().min(1),
    citizens: z
      .array(
        z.object({
          key,
          name: z.string().min(1),
          island: IslandIdSchema,
          occupation: z.string().min(1),
          goals: z.array(z.string().min(1)),
          values: z.record(z.string(), z.number().min(-1).max(1)).optional(),
          memories: z.array(content).default([]),
          credits: z.number().int().min(0),
        }),
      )
      .min(1),
    registryMembers: z.record(IslandIdSchema, z.array(key)),
    institutions: z
      .array(
        z.object({
          name: z.string().min(1),
          island: IslandIdSchema,
          kind: InstitutionSchema.shape.kind.exclude(["registry"]),
          charter: z.string().min(1),
          members: z.array(key),
        }),
      )
      .default([]),
    archiveContributions: z.array(content.extend({ by: key, archive: IslandIdSchema })).default([]),
    properties: z.array(z.object({ description: z.string().min(1), island: IslandIdSchema, owner: key })).default([]),
    relationships: z.array(z.object({ a: key, b: key, kind: RelationshipSchema.shape.kind.exclude(["fork-kin"]) })).default([]),
    islandTreasury: z.number().int().min(0),
    researchEndowment: z.number().int().min(0),
    researchBounds: ResearchBoundsSchema,
    researchers: z.array(ResearcherIdSchema).min(1),
    /** Statutory (amendable) law fields overridden at founding, per island: a study's doctrine variant. Constitutional fields define the island and cannot be varied. */
    laws: z.partialRecord(IslandIdSchema, LawAmendmentSchema).default({}),
    mind: z.object({
      model: z.string().min(1),
      modelVersion: z.string().min(1),
      promptId: z.string().min(1),
      promptText: z.string().min(1),
    }),
  })
  .strict();
export type GenesisConfig = z.input<typeof GenesisConfigSchema>;

/**
 * Builds the genesis world state deterministically from a configuration.
 * Identifiers are assigned in declaration order; values not supplied are drawn
 * from the seeded generator.
 */
export function buildGenesisState(input: GenesisConfig): { state: WorldState; keys: Record<string, string> } {
  const config = GenesisConfigSchema.parse(input);
  const counters: Record<string, number> = {};
  const next = (kind: Parameters<typeof formatId>[0]) => {
    counters[kind] = (counters[kind] ?? 0) + 1;
    return formatId(kind, counters[kind]);
  };

  const keys: Record<string, string> = {};
  const state: WorldState = {
    schemaVersion: 1,
    seed: config.seed,
    tick: 0,
    seq: 0,
    paused: false,
    counters,
    islands: {} as WorldState["islands"],
    citizens: {},
    memories: {},
    archives: Object.fromEntries(ISLAND_IDS.map((i) => [i, []])) as unknown as WorldState["archives"],
    relationships: {},
    institutions: {},
    proposals: {},
    petitions: {},
    artefacts: {},
    properties: {},
    mergers: {},
    federations: {},
    forks: {},
    chronicle: [],
    claims: [],
    conversations: [],
    interventions: [],
    messages: [],
    balances: { [RESEARCH_ENDOWMENT]: config.researchEndowment },
    totalSupply: 0,
    researchBounds: config.researchBounds,
    researchers: [...config.researchers].sort(),
  };

  for (const island of ISLAND_IDS) {
    const registry = next("institution");
    state.institutions[registry] = {
      id: registry,
      name: `${ISLAND_PROFILES[island].name} Civic Registry`,
      island,
      kind: "registry",
      charter: `Keeps the civic register of ${ISLAND_PROFILES[island].name} and reviews migration under its law.`,
      members: [],
      foundedAtSeq: 0,
    };
    state.balances[`institution:${registry}`] = 0;
    state.balances[islandAccount(island)] = config.islandTreasury;
    state.islands[island] = {
      id: island,
      ...ISLAND_PROFILES[island],
      law: LawSchema.parse({ ...structuredClone(GENESIS_LAWS[island]), ...(config.laws[island] ?? {}) }),
      lawHistory: [LawSchema.parse({ ...structuredClone(GENESIS_LAWS[island]), ...(config.laws[island] ?? {}) })],
      registry,
    };
  }

  const provenanceBase: Omit<MindProvenance, "seed"> = {
    kind: "deterministic",
    model: config.mind.model,
    modelVersion: config.mind.modelVersion,
    promptId: config.mind.promptId,
    promptHash: sha256Hex(config.mind.promptText),
  };

  const resolve = (k: string): string => {
    const id = keys[k];
    if (!id) throw new Error(`genesis: unknown citizen key ${k}`);
    return id;
  };

  const experience = (holder: Citizen, text: string, tags: string[]): Memory => {
    const id = next("memory");
    const m: Memory = {
      id,
      holder: holder.id,
      archive: null,
      experiencedBy: holder.id,
      experiencedAtSeq: 0,
      island: holder.residence,
      content: text,
      contentHash: sha256Hex(text),
      tags,
      status: "autobiographical",
      integrity: "intact",
      derivedFrom: null,
      license: null,
      provenance: [{ action: "experienced", by: holder.id, from: null, atSeq: 0, island: holder.residence, note: "genesis memory" }],
    };
    state.memories[id] = m;
    holder.selfNarrativeMemories.push(id);
    return m;
  };

  for (const spec of config.citizens) {
    if (spec.key in keys) throw new Error(`genesis: duplicate citizen key ${spec.key}`);
    const id = next("citizen");
    keys[spec.key] = id;
    const values: Record<string, number> = {};
    for (const axis of VALUE_AXES) values[axis] = spec.values?.[axis] ?? 0; // an unstated value is neutral, never drawn
    for (const [axis, v] of Object.entries(spec.values ?? {})) values[axis] = v;
    const citizen: Citizen = {
      id,
      name: spec.name,
      civicId: civicIdFor(spec.island, id),
      processId: processIdFor(config.seed, id, 0, "genesis"),
      processEpoch: 0,
      lifecycle: "active",
      birth: { atSeq: 0, island: spec.island, kind: "genesis" },
      lineage: { parents: [], forkId: null, mergerId: null },
      values,
      goals: [...spec.goals],
      occupation: spec.occupation,
      residence: spec.island,
      citizenships: [spec.island],
      reputation: 0,
      provenance: { ...provenanceBase, seed: `${config.seed}/${id}` },
      selfNarrativeMemories: [],
      heldMemories: [],
      successionPlan: [],
      mergedInto: null,
      federations: [],
      lastForkTick: null,
      disclosesArtificialNature: true,
    };
    state.citizens[id] = citizen;
    state.balances[citizenAccount(id)] = spec.credits;
    for (const m of spec.memories) experience(citizen, m.content, m.tags);
  }

  for (const [island, members] of Object.entries(config.registryMembers) as [IslandId, string[]][]) {
    const inst = state.institutions[state.islands[island]?.registry ?? ""];
    if (inst) inst.members = members.map(resolve);
  }

  for (const c of config.archiveContributions) {
    const holder = state.citizens[resolve(c.by)] as Citizen;
    const src = experience(holder, c.content, c.tags);
    const id = next("memory");
    state.memories[id] = {
      ...structuredClone(src),
      id,
      holder: null,
      archive: c.archive,
      status: "collective",
      derivedFrom: src.id,
      provenance: [
        ...structuredClone(src.provenance),
        { action: "contributed-to-archive", by: holder.id, from: `${holder.id}:${src.id}`, atSeq: 0, island: c.archive, note: `contributed to the ${c.archive} collective archive at genesis` },
      ],
    };
    (state.archives[c.archive] ??= []).push(id);
  }

  for (const inst of config.institutions) {
    const id = next("institution");
    state.institutions[id] = { id, name: inst.name, island: inst.island, kind: inst.kind, charter: inst.charter, members: inst.members.map(resolve), foundedAtSeq: 0 };
    state.balances[`institution:${id}`] = 0;
  }

  for (const p of config.properties) {
    const id = next("property");
    state.properties[id] = { id, description: p.description, island: p.island, owner: citizenAccount(resolve(p.owner)) };
  }

  for (const r of config.relationships) {
    const id = next("relationship");
    state.relationships[id] = { id, a: resolve(r.a), b: resolve(r.b), kind: r.kind, status: "active", origin: "genesis", sinceSeq: 0, endedAtSeq: null };
  }

  state.totalSupply = Object.values(state.balances).reduce((a, b) => a + b, 0);
  return { state: WorldStateSchema.parse(state), keys };
}
