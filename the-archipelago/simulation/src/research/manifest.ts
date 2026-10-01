import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { ResearcherIdSchema } from "../domain/ids.js";
import { ResearchBoundsSchema } from "../domain/model.js";
import { canonicalJson, sha256Hex } from "../kernel/canonical.js";
import { HypothesisSchema, ResearchQuestionSchema } from "./domain.js";

/**
 * The experiment definition (input). It pins everything needed to reproduce a
 * run. Each run also emits a research_manifest.yaml (output provenance).
 */
export const ExperimentManifestSchema = z
  .object({
    schemaVersion: z.literal(2),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    title: z.string().min(1),
    scenario: z.string().regex(/^[a-z0-9-]+$/),
    civilizationId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    description: z.string().min(1),
    seed: z.string().min(1),
    simulationVersion: z.string().min(1),
    question: ResearchQuestionSchema,
    hypotheses: z.array(HypothesisSchema).min(1),
    minds: z.object({ kind: z.enum(["deterministic", "language-model"]), model: z.string().min(1), modelVersion: z.string().min(1), promptId: z.string().min(1) }).strict(),
    researchers: z.array(z.object({ id: ResearcherIdSchema, role: z.string().min(1) }).strict()).min(1),
    researchBounds: ResearchBoundsSchema,
    parameters: z.object({ abmRounds: z.number().int().min(0).max(100) }).strict(),
    ethics: z.object({ consciousnessClaims: z.literal("none"), notes: z.array(z.string().min(1)) }).strict(),
    limitations: z.array(z.string().min(1)).min(1),
    futureWork: z.array(z.string().min(1)),
    reproducibility: z
      .object({ expectedHeadHash: z.string().regex(/^[0-9a-f]{64}$/).nullable(), expectedEventCount: z.number().int().min(1).nullable() })
      .strict(),
  })
  .strict()
  .superRefine((m, ctx) => {
    for (const h of m.hypotheses) {
      if (h.questionId !== m.question.id) ctx.addIssue({ code: "custom", message: `hypothesis ${h.id} refers to unknown question ${h.questionId}` });
    }
    if (new Set(m.hypotheses.map((h) => h.id)).size !== m.hypotheses.length) ctx.addIssue({ code: "custom", message: "duplicate hypothesis ids" });
  });
export type ExperimentManifest = z.infer<typeof ExperimentManifestSchema>;

/** Parses a manifest from YAML or JSON text. */
export function parseManifest(source: string): ExperimentManifest {
  return ExperimentManifestSchema.parse(parseYaml(source));
}

export function loadManifest(path: string): ExperimentManifest {
  return parseManifest(readFileSync(path, "utf8"));
}

/**
 * Hash of the configuration that determines the run: the manifest without its
 * reproducibility expectations (which are outputs recorded after the fact).
 */
export function configurationHash(m: ExperimentManifest): string {
  const { reproducibility: _omit, ...config } = m;
  return sha256Hex(canonicalJson(config));
}
