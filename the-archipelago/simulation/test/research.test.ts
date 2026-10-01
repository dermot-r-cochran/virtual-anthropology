import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { publishExperiment } from "../src/export/dataset.js";
import { loadManifest, parseManifest } from "../src/research/manifest.js";
import { runScenario } from "../src/scenarios/index.js";

const MANIFEST = new URL("../../experiments/the-first-fork/experiment.yaml", import.meta.url).pathname;
const EXPORTS = new URL("../../exports/the-first-fork-v1/", import.meta.url).pathname;
const fixed = { start: () => "2026-01-01T00:00:00.000Z", end: () => "2026-01-01T00:00:00.000Z" };

describe("The First Fork and the research pipeline", async () => {
  const m = loadManifest(MANIFEST);
  const run = await runScenario(m);
  const out = await publishExperiment(m, fixed);
  const research = JSON.parse(out.exportFiles["research.json"]!);

  it("is deterministic and matches the manifest's pinned head hash", () => {
    expect(run.headHash).toBe(m.reproducibility.expectedHeadHash);
    expect(run.log.length).toBe(m.reproducibility.expectedEventCount);
  });

  it("three claimants claim continuity; evidence returns no verdict", () => {
    expect(run.log.filter((r) => r.event.type === "ContinuityClaimed")).toHaveLength(3);
    const ev = run.analyses.evidence as unknown as Record<string, unknown>;
    expect(JSON.stringify(ev)).not.toMatch(/"realPerson"|"isReal"/);
    expect(run.analyses.legal).toHaveLength(4);
  });

  it("findings are mechanical metric comparisons", () => {
    for (const f of research.findings) {
      const v = research.metrics.find((x: { metric: string }) => x.metric === f.metric)?.value;
      expect(f.observedValue).toBe(v);
    }
  });

  it("every chronicle statement traces to real events with matching hashes", () => {
    const byseq = new Map(run.log.map((r) => [r.seq, r]));
    for (const p of research.chronicle.periods)
      for (const st of p.statements) {
        expect(st.events.length).toBeGreaterThan(0);
        for (const e of st.events) expect(byseq.get(e.seq)?.hash).toBe(e.hash);
      }
  });

  it("experiment report has the standard sections and never generates interpretation", () => {
    const md = out.reportFiles[`reports/experiments/${m.id}.md`]!;
    const headings = md.split("\n").filter((l) => l.startsWith("# ")).slice(1).map((l) => l.slice(2));
    expect(headings).toEqual(["Abstract", "Research Question", "Hypothesis", "Experimental Design", "Configuration", "Results", "Observations", "Interpretation", "Limitations", "Future Work", "Reproducibility Information"]);
    expect(md).toMatch(/_Not generated\._/);
    expect(md).toMatch(/configuration hash/);
  });

  it("research_manifest.yaml carries the required provenance keys", () => {
    const y = out.exportFiles["research_manifest.yaml"]!;
    for (const k of ["experiment_id", "title", "question", "hypothesis", "world", "governance_policy", "population", "simulation_seed", "start_timestamp", "end_timestamp", "metrics", "outputs", "limitations"]) expect(y).toMatch(new RegExp(`^${k}:`, "m"));
  });

  it("regeneration with a fixed clock is byte-identical to the committed export", () => {
    for (const f of ["index.json", "research_manifest.yaml", "research.json", "events.jsonl"]) expect(out.exportFiles[f]).toBe(readFileSync(EXPORTS + f, "utf8"));
  });

  it("the First Fork is filed as a demonstration, and every output says so", () => {
    expect(m.category).toBe("demonstration");
    expect(JSON.parse(out.exportFiles["index.json"]!).category).toBe("demonstration");
    expect(out.exportFiles["research_manifest.yaml"]).toMatch(/^category: demonstration$/m);
    expect(research.experiment.category).toBe("demonstration");
    const md = out.reportFiles[`reports/experiments/${m.id}.md`]!;
    expect(md).toMatch(/^Demonstration `the-first-fork-v1` ran scenario/m);
    expect(md).toMatch(/^- Category: demonstration — /m);
    expect(md).toMatch(/^- Demonstration: the protagonists' actions are authored by the scenario/m);
  });

  it("manifest validation rejects a missing or unknown category", () => {
    const src = readFileSync(MANIFEST, "utf8");
    expect(() => parseManifest(src.replace("category: demonstration\n", ""))).toThrow();
    expect(() => parseManifest(src.replace("category: demonstration", "category: study"))).toThrow();
    expect(parseManifest(src.replace("category: demonstration", "category: experiment")).category).toBe("experiment");
  });

  it("manifest validation rejects consciousness claims", () => {
    const src = readFileSync(MANIFEST, "utf8").replace("consciousnessClaims: none", "consciousnessClaims: asserted");
    expect(() => parseManifest(src)).toThrow();
  });
});
