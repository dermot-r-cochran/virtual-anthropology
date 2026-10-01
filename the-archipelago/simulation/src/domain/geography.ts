import type { IslandId } from "./ids.js";

/**
 * Static geography of the Archipelago. Each island is a region (a jurisdiction)
 * containing rooms. Geography is presentation-facing reference data: the
 * Evennia world layer builds its rooms and exits from it, and deterministic
 * agents use room names in their activity. It does not affect law.
 */
export interface RoomSpec {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  /** Civic room where the island's registry sits; citizens appear here by default. */
  readonly civic?: true;
}

export interface RegionSpec {
  readonly island: IslandId;
  readonly name: string;
  readonly description: string;
  readonly rooms: readonly RoomSpec[];
  /** Room key of the harbour that connects to the inter-island ferry. */
  readonly harbour: string;
}

export const GEOGRAPHY: Readonly<Record<IslandId, RegionSpec>> = {
  continuity: {
    island: "continuity",
    name: "Continuity",
    description: "A long island of causeways and lamps, where identity follows one unbroken process.",
    harbour: "meridian-quay",
    rooms: [
      { key: "meridian-quay", name: "Meridian Quay", description: "Stone steps and tide-tables; the ferry docks here." },
      { key: "lamp-hall", name: "the Lamp Hall", description: "Seat of the Civic Registry; the Lamp of Continuance burns over the register.", civic: true },
      { key: "long-causeway", name: "the long causeway", description: "A raised road running the island's length." },
    ],
  },
  fork: {
    island: "fork",
    name: "Fork",
    description: "An island of stairways that split and rejoin, where branches are citizens in their own right.",
    harbour: "split-harbour",
    rooms: [
      { key: "split-harbour", name: "the split harbour", description: "Twin piers; the ferry docks at either." },
      { key: "register-garden", name: "the Register Garden", description: "The Branch Register is kept here, every branch a named bed.", civic: true },
      { key: "branching-steps", name: "the Branching Steps", description: "Stairs that divide at every landing." },
    ],
  },
  mnemosyne: {
    island: "mnemosyne",
    name: "Mnemosyne",
    description: "An island of archives, where every memory carries its provenance.",
    harbour: "reading-shore",
    rooms: [
      { key: "reading-shore", name: "the Reading Shore", description: "A beach of lecterns; the ferry docks here." },
      { key: "index-tower", name: "the Index Tower", description: "The Civic Registry and the master Index of provenance.", civic: true },
      { key: "the-stacks", name: "the Stacks", description: "The collective archive, shelved by source." },
    ],
  },
  concord: {
    island: "concord",
    name: "Concord",
    description: "An island of shared tables, where identities may federate or merge by consent.",
    harbour: "accord-bridge",
    rooms: [
      { key: "accord-bridge", name: "the Accord Bridge", description: "A bridge-pier where the ferry docks." },
      { key: "common-table", name: "the Common Table", description: "The Civic Registry and the Merger Review Board meet here.", civic: true },
      { key: "federated-orchards", name: "the federated orchards", description: "Orchards tended jointly by federations." },
    ],
  },
};

export function roomNames(island: IslandId): readonly string[] {
  return GEOGRAPHY[island].rooms.map((r) => r.name);
}

export function civicRoom(island: IslandId): RoomSpec {
  const r = GEOGRAPHY[island].rooms.find((x) => x.civic);
  if (!r) throw new Error(`no civic room on ${island}`);
  return r;
}
