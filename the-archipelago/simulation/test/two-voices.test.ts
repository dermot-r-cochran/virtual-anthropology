import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { publishExperiment } from "../src/export/dataset.js";
import { loadManifest } from "../src/research/manifest.js";
import { runScenario } from "../src/scenarios/index.js";
import { runTwoVoices } from "../src/scenarios/two-voices/run.js";

const MANIFEST = fileURLToPath(new URL("../../experiments/two-voices/experiment.yaml", import.meta.url));
const EXPORTS = fileURLToPath(new URL("../../exports/two-voices-v1/", import.meta.url));
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const fixed = { start: () => "2026-01-01T00:00:00.000Z", end: () => "2026-01-01T00:00:00.000Z" };

/** Words the record must not use of a plural citizen. The First Fork's metric `identity.dimension_dissociation` is about continuity dimensions and is excluded by name. */
const CLINICAL = /\b(disorder|pathology|pathological|symptom|malfunction|unstable|instability|treatment|dissociative|alters?\b|split personality|fragment)/i;

describe("Two Voices in One Record", async () => {
  const m = loadManifest(MANIFEST);
  const run = await runScenario(m);
  const out = await publishExperiment(m, fixed);
  const research = JSON.parse(out.exportFiles["research.json"]!);
  const dataset = JSON.parse(out.exportFiles["dataset.json"]!);

  it("is deterministic and matches the manifest's pinned head hash", () => {
    expect(run.headHash).toBe(m.reproducibility.expectedHeadHash);
    expect(run.log.length).toBe(m.reproducibility.expectedEventCount);
  });

  it("regeneration with a fixed clock is byte-identical to the committed export", () => {
    for (const f of ["index.json", "research_manifest.yaml", "research.json", "events.jsonl", "reports/two-voices.md"]) expect(out.exportFiles[f]).toBe(read(EXPORTS + f));
  });

  it("is filed as a demonstration whose every finding is a consistent metric comparison, with interpretation left blank", () => {
    expect(m.category).toBe("demonstration");
    expect(research.findings.map((f: { hypothesisId: string; outcome: string }) => [f.hypothesisId, f.outcome])).toEqual([
      ["h1-one-record", "consistent-with-hypothesis"],
      ["h2-no-copy", "consistent-with-hypothesis"],
      ["h3-one-vote", "consistent-with-hypothesis"],
      ["h4-difference-is-not-a-fault", "consistent-with-hypothesis"],
    ]);
    for (const f of research.findings) expect(f.observedValue).toBe(research.metrics.find((x: { metric: string }) => x.metric === f.metric)?.value);
    const md = out.reportFiles[`reports/experiments/${m.id}.md`]!;
    expect(md).toMatch(/_Not generated\._/);
    expect(md).toMatch(/^- Demonstration: the protagonists' actions are authored by the scenario/m);
    expect(out.exportFiles["research_manifest.yaml"]).toMatch(/^category: demonstration$/m);
    expect(out.exportFiles["research_manifest.yaml"]).toMatch(/kind: symbolic/);
  });

  it("the plural citizen is one record, changes front three times by its own command (once a member's first), and no fork or descendant arises", () => {
    const sys = run.state.citizens[dataset.scenario.markers.system]!;
    expect(sys.plurality?.members).toHaveLength(3);
    expect(sys.plurality?.membership).toEqual({ kind: "unbounded" });
    expect(sys.plurality?.members[2]?.subsystem?.membership).toEqual({ kind: "counted", count: 720_000 });
    expect(Object.keys(run.state.citizens)).toHaveLength(4);
    const fronts = run.log.filter((r) => r.event.type === "FrontingChanged");
    expect(fronts).toHaveLength(3);
    expect(fronts.every((r) => r.actor.kind === "citizen" && r.actor.id === sys.id)).toBe(true);
    expect(fronts.map((r) => (r.event.type === "FrontingChanged" ? r.event.to : []))).toEqual([["brin"], ["many"], ["ash", "brin", "many"]]);
    expect(fronts.map((r) => (r.event.type === "FrontingChanged" ? r.event.newlyFronted : []))).toEqual([[], ["many"], []]);
    expect(fronts.every((r) => r.policy?.citations.includes("archipelago/charter/a-plural-system-is-one-person"))).toBe(true);
    expect(Object.keys(run.state.forks)).toEqual([]);
    expect(run.log.some((r) => r.event.type === "CommandRejected")).toBe(false);
    expect(sys.plurality?.members.find((x) => x.id === "many")?.everFronted).toBe(true);
  });

  it("members differ in the record and the difference is reconciled by weighted say, recorded as ordinary difference, with every member's trace beside it", () => {
    const recs = dataset.scenario.reconciliations as { lines: string[]; outcome: string; event: { type: string } | null }[];
    expect(recs.length).toBeGreaterThanOrEqual(4);
    expect(recs[0]!.lines.some((l) => l.startsWith("members differ: ash proposes participate-in-governance → prop-0001; brin proposes create-culture (ordinary difference, recorded)"))).toBe(true);
    expect(recs[0]!.lines.at(-1)).toBe("reconciled by weighted-say → ash: participate-in-governance → prop-0001");
    expect(recs[0]!.event?.type).toBe("VoteCast");
    expect(recs[1]!.event?.type).toBe("ArtefactCreated");
    expect(recs[2]!.lines[0]).toMatch(/^plural weighted-say: many \(subsystem, front-decides\): many\/first: symbolic archipelago\/symbolic\/speaker\/v1/);
    expect(recs[2]!.event?.type).toBe("CitizenEndorsed");
    expect(recs[3]!.lines.some((l) => l.startsWith("members differ: ash proposes record-experience; brin proposes create-culture; many proposes maintain-relationships"))).toBe(true);
    expect(recs.every((r) => r.outcome === "applied")).toBe(true);
    const vote = run.state.proposals["prop-0001"]!;
    expect(Object.keys(vote.votes)).toHaveLength(4);
    expect(vote.votes[dataset.scenario.markers.system]).toBe("yes");
  });

  it("the system's replies open with the artificial-nature statement and name who is fronting; the record uses no clinical word of plurality", () => {
    const convs = run.state.conversations;
    expect(convs).toHaveLength(2);
    for (const c of convs) {
      expect(c.citizenReply.startsWith("I am a simulated digital person")).toBe(true);
      expect(c.guardFlags).toEqual([]);
    }
    expect(convs[0]!.citizenReply).toMatch(/Brin is fronting and speaks here/);
    expect(convs[1]!.citizenReply).toMatch(/Ash, Brin, The Many are co-fronting; this reply is reconciled by weighted-say/);
    const texts = [out.exportFiles["reports/two-voices.md"]!, out.exportFiles["reports/timeline.md"]!, out.exportFiles["publication/chronicle.md"]!, JSON.stringify(dataset.scenario), read(MANIFEST)];
    for (const t of texts) expect(t).not.toMatch(CLINICAL);
    const chronicle = out.exportFiles["publication/chronicle.md"]!;
    expect(chronicle).toMatch(/First change of front: Marren Tide, a plural system, changes front: brin now fronts; the one citizen remains/);
    expect(chronicle).toMatch(/many now fronts \(many for the first time in the record\)/);
  });

  it("every chronicle statement traces to real events with matching hashes", () => {
    const byseq = new Map(run.log.map((r) => [r.seq, r]));
    for (const p of research.chronicle.periods) for (const st of p.statements) for (const e of st.events) expect(byseq.get(e.seq)?.hash).toBe(e.hash);
  });

  it("the scenario runs the same twice", async () => {
    const a = await runTwoVoices();
    const b = await runTwoVoices();
    expect(a.world.headHash).toBe(b.world.headHash);
    expect(a.choices).toEqual(b.choices);
    expect(a.runtime.proposals.map((p) => p.rationale)).toEqual(b.runtime.proposals.map((p) => p.rationale));
  });
});
