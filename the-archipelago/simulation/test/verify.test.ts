import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { verifyDataset } from "../src/export/dataset.js";
import { canonicalJson, sha256Hex } from "../src/kernel/canonical.js";
import { loadManifest } from "../src/research/manifest.js";

// `verifyDataset` is what `npm run verify:*` and the Verify line printed in each experiment report run. CI proves it
// passes on the committed exports; these tests prove it fails when it should, each failure by name.
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PUBLISHED = [
  { id: "the-first-fork-v1", manifest: "experiments/the-first-fork/experiment.yaml" },
  { id: "two-voices-v1", manifest: "experiments/two-voices/experiment.yaml" },
] as const;
const pinned = (manifest: string) => loadManifest(join(ROOT, manifest)).reproducibility.expectedHeadHash!;

const scratch = mkdtempSync(join(tmpdir(), "archipelago-verify-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
let copies = 0;

/** A private copy of a committed export, LF-normalised so that a checkout made with CRLF stages the bytes CI sees. */
function stage(id: string): string {
  const from = join(ROOT, "exports", id);
  const to = join(scratch, `${id}-${copies++}`);
  for (const e of readdirSync(from, { recursive: true, withFileTypes: true })) {
    if (!e.isFile()) continue;
    const src = join(e.parentPath, e.name);
    const dest = join(to, src.slice(from.length + 1));
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(src, "utf8").replace(/\r\n/g, "\n"));
  }
  return to;
}

const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");
const write = (dir: string, path: string, body: string) => writeFileSync(join(dir, path), body);

interface Index { headHash: string; eventCount: number; files: { path: string; sha256: string; bytes: number }[] }
/** Rewrites index.json's entry for a file to match what is on disk, as someone hiding a change would. */
function rehash(dir: string, path: string, change: (index: Index) => void = () => {}): void {
  const index = JSON.parse(read(dir, "index.json")) as Index;
  const body = read(dir, path);
  const f = index.files.find((x) => x.path === path)!;
  f.sha256 = sha256Hex(body);
  f.bytes = Buffer.byteLength(body);
  change(index);
  write(dir, "index.json", `${JSON.stringify(index, null, 2)}\n`);
}

/** Changes the endorsement at seq 11 of Two Voices from one point to two, and returns the altered log. */
function alterEndorsement(dir: string): Record<string, unknown>[] {
  const log = read(dir, "events.jsonl").split("\n").filter((l) => l.length > 0).map((l) => JSON.parse(l) as Record<string, unknown>);
  const event = log[11]!.event as { type: string; delta: number };
  expect(event).toMatchObject({ type: "CitizenEndorsed", delta: 1 });
  event.delta = 2;
  return log;
}
const jsonl = (log: Record<string, unknown>[]) => `${log.map((r) => JSON.stringify(r)).join("\n")}\n`;

describe("verifying a published dataset", () => {
  it("each committed export verifies against its manifest's pinned head hash", () => {
    for (const p of PUBLISHED) {
      const index = JSON.parse(read(join(ROOT, "exports", p.id), "index.json")) as Index;
      expect(verifyDataset(stage(p.id), pinned(p.manifest))).toEqual({ ok: true, problems: [], headHash: index.headHash, eventCount: index.eventCount });
    }
  });

  it("one character added to a published file is a hash mismatch for that file, and a removed file is missing", () => {
    const changed = stage("two-voices-v1");
    write(changed, "dataset.json", `${read(changed, "dataset.json")} `);
    expect(verifyDataset(changed)).toMatchObject({ ok: false, problems: ["hash mismatch for dataset.json"] });

    const removed = stage("two-voices-v1");
    rmSync(join(removed, "reports", "two-voices.md"));
    expect(verifyDataset(removed)).toMatchObject({ ok: false, problems: ["missing reports/two-voices.md"] });
  });

  it("a changed event fails the replay even when index.json is rewritten to match the file", () => {
    const dir = stage("two-voices-v1");
    write(dir, "events.jsonl", jsonl(alterEndorsement(dir)));
    expect(verifyDataset(dir).problems).toEqual(["hash mismatch for events.jsonl", "replay failed: log integrity: hash mismatch at seq 11"]);
    rehash(dir, "events.jsonl");
    expect(verifyDataset(dir)).toMatchObject({ ok: false, problems: ["replay failed: log integrity: hash mismatch at seq 11"], headHash: null });
  });

  it("a log cut short is a different head hash and event count, in the index and in research_manifest.yaml", () => {
    const dir = stage("two-voices-v1");
    const lines = read(dir, "events.jsonl").split("\n").filter((l) => l.length > 0);
    write(dir, "events.jsonl", `${lines.slice(0, -1).join("\n")}\n`);
    rehash(dir, "events.jsonl");
    const r = verifyDataset(dir);
    expect(r.problems).toEqual(["replayed head hash differs from index", "event count differs from index", "research_manifest.yaml head hash differs from the replayed event store"]);
    expect(r.eventCount).toBe(lines.length - 1);
  });

  it("a research_manifest.yaml that names another head hash is refused", () => {
    const dir = stage("two-voices-v1");
    const head = pinned("experiments/two-voices/experiment.yaml");
    write(dir, "research_manifest.yaml", read(dir, "research_manifest.yaml").replace(`head_hash: ${head}`, `head_hash: ${"0".repeat(64)}`));
    rehash(dir, "research_manifest.yaml");
    expect(verifyDataset(dir).problems).toEqual(["research_manifest.yaml head hash differs from the replayed event store"]);
  });

  it("a chain rebuilt from the changed event on is consistent with itself, and only the manifest's pinned head hash refuses it", () => {
    const dir = stage("two-voices-v1");
    const log = alterEndorsement(dir);
    let prev = log[10]!.hash as string;
    for (const rec of log.slice(11)) {
      const { hash: _old, ...rest } = rec;
      rec.prevHash = prev;
      prev = rec.hash = sha256Hex(prev + canonicalJson({ ...rest, prevHash: undefined }));
    }
    const original = pinned("experiments/two-voices/experiment.yaml");
    expect(prev).not.toBe(original);
    write(dir, "events.jsonl", jsonl(log));
    write(dir, "research_manifest.yaml", read(dir, "research_manifest.yaml").replace(`head_hash: ${original}`, `head_hash: ${prev}`));
    rehash(dir, "events.jsonl");
    rehash(dir, "research_manifest.yaml", (index) => { index.headHash = prev; });

    expect(verifyDataset(dir)).toMatchObject({ ok: true, headHash: prev });
    expect(verifyDataset(dir, original)).toMatchObject({ ok: false, problems: ["head hash differs from the manifest's expected value"] });
  });

  it("git stores every published file with LF and checks it out with LF on every platform", (ctx) => {
    // The recorded sha256 is of the LF bytes. Without the eol=lf rule in .gitattributes a Windows checkout
    // (core.autocrlf) rewrote every file with CRLF and `verify` reported a sound dataset as 22 hash mismatches.
    let listing: string;
    try {
      listing = execFileSync("git", ["ls-files", "--eol", "--", "exports", "reports"], { cwd: ROOT, encoding: "utf8" });
    } catch {
      return ctx.skip(); // not a git checkout (a source archive): there is no checkout rule to hold
    }
    const files = listing.split("\n").filter((l) => l.length > 0);
    expect(files.length).toBeGreaterThan(40);
    const wrong = files.filter((l) => !/^i\/lf\s+w\/\S+\s+attr\/text eol=lf\s/.test(l));
    expect(wrong).toEqual([]);
  });
});
