import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { IslandIdSchema, ResearcherIdSchema } from "../domain/ids.js";
import { LawAmendmentSchema } from "../domain/law.js";
import { ResearchBoundsSchema } from "../domain/model.js";
import { canonicalJson, sha256Hex } from "../kernel/canonical.js";
import { ExperimentCategorySchema, HypothesisSchema, ResearchQuestionSchema } from "./domain.js";

const variantId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

/**
 * A study: replications of the base run under declared variations, each a
 * deterministic run of its own. `seeds` reruns the scenario under derived
 * seeds; `doctrines` reruns it with statutory law overridden at founding;
 * `timelines` replays the base record to the scenario's branch point and
 * continues the epilogue under another seed and/or an amendment enacted there.
 */
export const StudyPlanSchema = z
  .object({
    seeds: z.object({ count: z.number().int().min(1).max(64) }).strict().optional(),
    doctrines: z.array(z.object({ id: variantId, island: IslandIdSchema, amendment: LawAmendmentSchema }).strict()).min(1).optional(),
    timelines: z
      .object({
        rounds: z.number().int().min(1).max(100),
        variants: z
          .array(z.object({ id: variantId, seed: z.string().min(1).optional(), amendment: z.object({ island: IslandIdSchema, amendment: LawAmendmentSchema }).strict().optional() }).strict())
          .min(1),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (!p.seeds && !p.doctrines && !p.timelines) ctx.addIssue({ code: "custom", message: "a study must declare seeds, doctrines or timelines" });
    for (const v of p.timelines?.variants ?? []) if (!v.seed && !v.amendment) ctx.addIssue({ code: "custom", message: `timeline variant ${v.id} must set a seed or an amendment` });
    const ids = [...(p.doctrines ?? []).map((d) => d.id), ...(p.timelines?.variants ?? []).map((v) => v.id)];
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "duplicate study variant ids" });
  });
export type StudyPlan = z.infer<typeof StudyPlanSchema>;

/**
 * The experiment definition (input). It pins everything needed to reproduce a
 * run. Each run also emits a research_manifest.yaml (output provenance).
 */
export const ExperimentManifestSchema = z
  .object({
    schemaVersion: z.literal(2),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    title: z.string().min(1),
    /** demonstration (scenario-authored outcome) or experiment (unscripted outcome). Required: a default would file a run silently. */
    category: ExperimentCategorySchema,
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
    study: StudyPlanSchema.optional(),
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
