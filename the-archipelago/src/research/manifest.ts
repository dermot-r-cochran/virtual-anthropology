import { readFileSync } from "node:fs";
import { z } from "zod";
import { ResearcherIdSchema } from "../domain/ids.js";
import { ResearchBoundsSchema } from "../domain/model.js";

/** An experiment manifest pins everything needed to reproduce a run. */
export const ExperimentManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    scenario: z.string().regex(/^[a-z0-9-]+$/),
    description: z.string().min(1),
    seed: z.string().min(1),
    kernelVersion: z.string().min(1),
    minds: z.object({ kind: z.enum(["deterministic", "language-model"]), model: z.string().min(1), modelVersion: z.string().min(1), promptId: z.string().min(1) }),
    researchers: z.array(z.object({ id: ResearcherIdSchema, role: z.string().min(1) })).min(1),
    researchBounds: ResearchBoundsSchema,
    hypotheses: z.array(z.string().min(1)),
    outputs: z.array(z.string().min(1)),
    ethics: z.object({
      consciousnessClaims: z.enum(["none", "labelled-hypothesis-only"]),
      notes: z.array(z.string().min(1)),
    }),
    reproducibility: z.object({ expectedHeadHash: z.string().regex(/^[0-9a-f]{64}$/).nullable(), expectedEventCount: z.number().int().min(1).nullable() }),
  })
  .strict();
export type ExperimentManifest = z.infer<typeof ExperimentManifestSchema>;

export function loadManifest(path: string): ExperimentManifest {
  return ExperimentManifestSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}
