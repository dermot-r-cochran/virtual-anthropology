import { PLURAL_RULE_BASE_ID, pluralProvenance } from "../../agents/plural.js";
import { CIVIC_RULES, RuleBaseSchema, symbolicProvenance, type RuleBase } from "../../agents/symbolic.js";
import type { GenesisConfig } from "../../domain/genesis.js";
import type { PluralSystem } from "../../domain/plurality.js";

export const TWO_VOICES_SEED = "archipelago/two-voices/v1";

/**
 * Two Voices in One Record: the founding population.
 *
 * One citizen of Continuity, Marren Tide, is a plural system; the other three
 * are singular, so the comparison is plain. Everyone's mind is symbolic, so
 * every proposal in the record carries the trace of the rules that produced
 * it. Nothing here is drawn from any other work; the names and the system are
 * this scenario's own.
 */

/** Ash, the keeper: votes when there is a ballot, otherwise records the day. */
export const KEEPER_RULES: RuleBase = RuleBaseSchema.parse({
  id: "archipelago/symbolic/keeper/v1",
  rules: [
    { id: "vote-when-a-ballot-is-open", salience: 90, when: [{ fact: "ballot-open", op: "is", value: "yes" }], then: { intend: { kind: "participate-in-governance", target: "ballot-id" } } },
    { id: "record-the-day", salience: 50, when: [], then: { intend: { kind: "record-experience", target: null } } },
  ],
});

/** Brin, the poet: makes a poem before anything else, and tends kin when there is nothing to make. */
export const POET_RULES: RuleBase = RuleBaseSchema.parse({
  id: "archipelago/symbolic/poet/v1",
  rules: [
    { id: "make-a-poem", salience: 60, when: [], then: { intend: { kind: "create-culture", target: null } } },
    { id: "tend-kin", salience: 40, when: [{ fact: "has-kin", op: "is", value: "yes" }], then: { intend: { kind: "maintain-relationships", target: "kin-chosen" } } },
  ],
});

/** First of Many, the speaker of the subsystem: tends kin before all else. */
export const SPEAKER_RULES: RuleBase = RuleBaseSchema.parse({
  id: "archipelago/symbolic/speaker/v1",
  rules: [
    { id: "tend-kin", salience: 70, when: [{ fact: "has-kin", op: "is", value: "yes" }], then: { intend: { kind: "maintain-relationships", target: "kin-chosen" } } },
    { id: "record-the-day", salience: 30, when: [], then: { intend: { kind: "record-experience", target: null } } },
  ],
});

/** Rule bases by member path. Members without one (none here front) would share the civic rules. */
export const TIDE_VOICES: Readonly<Record<string, RuleBase>> = { ash: KEEPER_RULES, brin: POET_RULES, "many/first": SPEAKER_RULES };

/**
 * Marren Tide as the record knows the system at genesis. Three known members
 * of a membership the system does not count: Ash and Brin, who co-front and
 * whose say differs (2 and 1), and The Many, who has never fronted and is a
 * subsystem of 720,000 members of whom two are known, with its own front and
 * its own way of deciding. Reconciliation is by weighted say: when co-fronting
 * members propose different things the greater say decides, and the other
 * proposals are recorded beside the decision as ordinary difference.
 */
export const TIDE_SYSTEM: PluralSystem = {
  membership: { kind: "unbounded" },
  reconciliation: "weighted-say",
  fronting: ["ash", "brin"],
  members: [
    { id: "ash", name: "Ash", role: "keeper", say: 2, everFronted: true, subsystem: null },
    { id: "brin", name: "Brin", role: "poet", say: 1, everFronted: true, subsystem: null },
    {
      id: "many",
      name: "The Many",
      role: null,
      say: 1,
      everFronted: false,
      subsystem: {
        membership: { kind: "counted", count: 720_000 },
        reconciliation: "front-decides",
        fronting: ["first"],
        members: [
          { id: "first", name: "First of Many", role: "speaker", say: 1, everFronted: true, subsystem: null },
          { id: "second", name: "Second of Many", role: null, say: 1, everFronted: false, subsystem: null },
        ],
      },
    },
  ],
};

export const TWO_VOICES_MIND = {
  model: "archipelago-symbolic",
  modelVersion: "1.0.0",
  promptId: CIVIC_RULES.id,
  promptText: "Symbolic placeholder citizens: every proposal is produced by forward-chaining production rules whose trace is recorded as its rationale. No language model is used.",
} as const;

/** The founding population of Two Voices in One Record. */
export function twoVoicesGenesis(seed: string = TWO_VOICES_SEED): GenesisConfig {
  const civic = (key: string) => symbolicProvenance(CIVIC_RULES, `${seed}/${key}`);
  return {
    seed,
    citizens: [
      {
        key: "marren",
        name: "Marren Tide",
        island: "continuity",
        occupation: "lantern-keeper and poet",
        goals: ["keep the quay lanterns lit", "set the quay's weather to verse"],
        values: { novelty: 0.4, autonomy: 0.3, caution: 0.1, tradition: 0.2, communality: 0.5 },
        memories: [{ content: "Lit the first lantern of the season on the quay wall, and found a line for it.", tags: ["lanterns", "verse"] }],
        credits: 100,
        plurality: TIDE_SYSTEM,
        provenance: pluralProvenance(TIDE_VOICES, CIVIC_RULES, `${seed}/marren`),
      },
      {
        key: "odile",
        name: "Odile Ferrant",
        island: "continuity",
        occupation: "registrar",
        goals: ["keep the civic register exact"],
        values: { tradition: 0.6, caution: 0.5, novelty: -0.2 },
        memories: [{ content: "Entered Marren Tide in the civic register as one citizen.", tags: ["registry"] }],
        credits: 100,
        provenance: civic("odile"),
      },
      { key: "teo", name: "Teo Lask", island: "continuity", occupation: "lamp-keeper", goals: ["keep the Lamp lit"], credits: 100, provenance: civic("teo") },
      { key: "hale", name: "Hale Morrow", island: "continuity", occupation: "cartographer", goals: ["chart the harbour mouth"], values: { curiosity: 0.5 }, credits: 100, provenance: civic("hale") },
    ],
    registryMembers: { continuity: ["odile"], fork: [], mnemosyne: [], concord: [] },
    relationships: [
      { a: "marren", b: "teo", kind: "friend" },
      { a: "odile", b: "hale", kind: "colleague" },
    ],
    islandTreasury: 500,
    researchEndowment: 200,
    researchBounds: { allowedInterventions: ["deliver-message"], maxInterventions: 1, maxCreditsPerGrant: 0 },
    researchers: ["res-observer-1"],
    mind: TWO_VOICES_MIND,
  };
}

export { PLURAL_RULE_BASE_ID };
