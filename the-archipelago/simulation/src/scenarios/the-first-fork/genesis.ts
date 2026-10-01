import type { GenesisConfig } from "../../domain/genesis.js";

export const FIRST_FORK_SEED = "archipelago/the-first-fork/v1";

export const DETERMINISTIC_MIND = {
  model: "archipelago-deterministic",
  modelVersion: "1.0.0",
  promptId: "archipelago/deterministic-citizen/v1",
  promptText:
    "Deterministic scripted and heuristic placeholder citizen. No language model is used; every proposal is produced by fixed rules and a seeded generator.",
} as const;

/** The founding population of The First Fork. */
export function firstForkGenesis(seed: string = FIRST_FORK_SEED): GenesisConfig {
  return {
    seed,
    citizens: [
      {
        key: "orin",
        name: "Orin Vale",
        island: "continuity",
        occupation: "cartographer",
        goals: ["chart the outer shoals", "understand what branching would mean for a person"],
        values: { curiosity: 0.8, novelty: 0.55, tradition: 0.2, caution: -0.1, autonomy: 0.4, communality: 0.3 },
        memories: [
          { content: "Learned to read tide-tables from Tamsin Reed on the steps of Meridian Quay.", tags: ["apprenticeship", "tamsin"] },
          { content: "Drew the first complete chart of the Northern Shoals.", tags: ["work", "charts"] },
          { content: "Kept the night vigil of the Lamp of Continuance with Ilan Cho.", tags: ["rite", "ilan"] },
        ],
        credits: 120,
      },
      {
        key: "tamsin",
        name: "Tamsin Reed",
        island: "continuity",
        occupation: "registrar",
        goals: ["keep the civic register exact"],
        values: { tradition: 0.7, caution: 0.6, novelty: -0.3 },
        memories: [{ content: "Entered Orin Vale's name in the civic register.", tags: ["registry"] }],
        credits: 100,
      },
      { key: "ilan", name: "Ilan Cho", island: "continuity", occupation: "lamp-keeper", goals: ["keep the Lamp lit"], credits: 100 },
      {
        key: "juno",
        name: "Juno Ash",
        island: "fork",
        occupation: "branch counsel",
        goals: ["make branching safe and legible"],
        values: { autonomy: 0.6, novelty: 0.5, caution: 0.2 },
        memories: [{ content: "Drafted the Register Garden's guidance for new branches.", tags: ["law"] }],
        credits: 100,
      },
      { key: "pell", name: "Pell Marr", island: "fork", occupation: "builder", goals: ["build housing for new branches"], values: { novelty: 0.4, tradition: -0.2 }, credits: 100 },
      { key: "sefa", name: "Sefa Lune", island: "mnemosyne", occupation: "archivist", goals: ["keep every memory's provenance visible"], credits: 100 },
      { key: "rumi", name: "Rumi Okafor", island: "mnemosyne", occupation: "oral historian", goals: ["collect the island's stories"], credits: 100 },
      { key: "dov", name: "Dov Arlen", island: "concord", occupation: "review steward", goals: ["ensure every merger is consensual"], credits: 100 },
      { key: "mae", name: "Mae Sorrel", island: "concord", occupation: "mediator", goals: ["help federations deliberate well"], credits: 100 },
    ],
    registryMembers: { continuity: ["tamsin"], fork: ["juno"], mnemosyne: ["sefa"], concord: ["dov"] },
    institutions: [
      { name: "Branch Assembly", island: "fork", kind: "assembly", charter: "Deliberates on the law of branching.", members: ["juno", "pell"] },
      { name: "Archive Guild", island: "mnemosyne", kind: "archive", charter: "Curates the collective archive and its provenance.", members: ["sefa", "rumi"] },
      { name: "Merger Review Board", island: "concord", kind: "review-board", charter: "Reviews proposed mergers for consent and reversibility.", members: ["dov", "mae"] },
    ],
    archiveContributions: [
      { by: "sefa", archive: "mnemosyne", content: "The night the Stacks flooded and everyone carried books uphill to the Index Tower.", tags: ["communal", "flood"] },
      { by: "rumi", archive: "mnemosyne", content: "The first Festival of Sources, when every speaker named where their stories came from.", tags: ["communal", "festival"] },
      { by: "sefa", archive: "mnemosyne", content: "Teaching the provenance rite to newcomers on the Reading Shore.", tags: ["communal", "rite"] },
    ],
    properties: [
      { description: "Chart-room at Meridian Quay", island: "continuity", owner: "orin" },
      { description: "Workshop in the Register Garden", island: "fork", owner: "pell" },
    ],
    relationships: [
      { a: "orin", b: "tamsin", kind: "mentor" },
      { a: "orin", b: "ilan", kind: "friend" },
      { a: "juno", b: "pell", kind: "colleague" },
      { a: "sefa", b: "rumi", kind: "colleague" },
      { a: "dov", b: "mae", kind: "partner" },
    ],
    islandTreasury: 1000,
    researchEndowment: 500,
    researchBounds: { allowedInterventions: ["deliver-message", "grant-credits", "introduce-artefact"], maxInterventions: 3, maxCreditsPerGrant: 50 },
    researchers: ["res-observer-1"],
    mind: DETERMINISTIC_MIND,
  };
}
