import { z } from "zod";

/**
 * The stable interchange contract between the simulation and the research
 * context. Everything in the research pipeline (metrics, observations,
 * findings, chronicles, publications, visualizations) is computed from this
 * shape alone. If the simulation's internals change, only the adapter that
 * produces a ResearchInput needs to change.
 */
export const INTERCHANGE_VERSION = 1;

const id = z.string().min(1);
const hash = z.string().regex(/^[0-9a-f]{64}$/);

export const StreamEventSchema = z
  .object({
    seq: z.number().int().min(0),
    tick: z.number().int().min(0),
    type: id,
    actor: id,
    hash,
    citizens: z.array(id),
    summary: z.string(),
    data: z.record(z.string(), z.unknown()),
  })
  .strict();
export type StreamEvent = z.infer<typeof StreamEventSchema>;

export const SnapshotSchema = z
  .object({
    seq: z.number().int(),
    tick: z.number().int(),
    citizens: z.array(
      z.object({
        id, name: id, lifecycle: id, residence: id, citizenships: z.array(id), occupation: id,
        birthKind: id, birthSeq: z.number().int(), parents: z.array(id), forkId: id.nullable(),
        reputation: z.number(), credits: z.number(),
      }).strict(),
    ),
    islands: z.array(
      z.object({
        id, name: id, lawVersion: z.number().int(), doctrine: id, copying: id, memoryExchange: id,
        merging: id, federation: id, immigration: id, emigration: id, descendantCitizenship: id,
      }).strict(),
    ),
    relationships: z.array(z.object({ id, a: id, b: id, kind: id, status: id, origin: id, sinceSeq: z.number().int(), endedAtSeq: z.number().int().nullable() }).strict()),
    institutions: z.array(z.object({ id, name: id, island: id, kind: id, members: z.array(id), foundedAtSeq: z.number().int() }).strict()),
    memories: z.array(
      z.object({
        id, holder: id.nullable(), archive: id.nullable(), experiencedBy: id, experiencedAtSeq: z.number().int(), island: id,
        status: id, integrity: id, derivedFrom: id.nullable(), tags: z.array(z.string()),
        provenance: z.array(z.object({ action: id, by: id.nullable(), atSeq: z.number().int(), island: id }).strict()),
      }).strict(),
    ),
    proposals: z.array(
      z.object({ id, island: id, title: id, status: id, electorate: z.array(id), votes: z.record(z.string(), z.string()), openedAtSeq: z.number().int() }).strict(),
    ),
    artefacts: z.array(z.object({ id, kind: id, title: id, island: id, authors: z.array(id), introducedBy: id.nullable(), createdAtSeq: z.number().int() }).strict()),
    economy: z.object({ totalSupply: z.number(), balancesTotal: z.number() }).strict(),
  })
  .strict();
export type Snapshot = z.infer<typeof SnapshotSchema>;

export const ResearchInputSchema = z
  .object({
    interchangeVersion: z.literal(INTERCHANGE_VERSION),
    simulation: z.object({ name: id, version: id }).strict(),
    seed: id,
    events: z.array(StreamEventSchema).min(1),
    snapshot: SnapshotSchema,
    /** Snapshot metrics at the end of each tick, for time series. */
    series: z.array(z.object({ tick: z.number().int(), seq: z.number().int(), values: z.record(z.string(), z.number()) }).strict()),
    /** Scenario-specific analyses (optional): lineage, evidence, legal readings. */
    analyses: z
      .object({
        lineage: z.object({ nodes: z.array(z.record(z.string(), z.unknown())), edges: z.array(z.record(z.string(), z.unknown())) }),
        continuity: z
          .object({
            subject: z.object({ citizenId: id, beforeSeq: z.number().int(), name: id }),
            claimants: z.array(z.object({ claimant: id, sameProcess: z.boolean(), sameCivicId: z.boolean(), sharedMemoryFraction: z.number(), importedOrIntegrated: z.number() })),
            /** island → claimants it recognises as continuing (true), not (false) or does not adjudicate (null). */
            recognition: z.record(z.string(), z.record(z.string(), z.boolean().nullable())),
          })
          .nullable(),
      })
      .strict(),
  })
  .strict();
export type ResearchInput = z.infer<typeof ResearchInputSchema>;
