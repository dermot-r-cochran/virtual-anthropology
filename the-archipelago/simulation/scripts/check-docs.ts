/**
 * Doc check for the repository's Markdown. Node's standard library only:
 * no package is imported, so it runs under `tsx` (as CI runs it) or under
 * any Node that strips types.
 *
 * Five checks:
 *
 * 1. Every relative link in a README (the repository's, The Archipelago's,
 *    and any README below it) and under `the-archipelago/docs/` resolves to
 *    a file or directory that exists: Markdown links, reference
 *    definitions, and `src`/`href` in inline HTML. External links and
 *    in-page anchors are not checked.
 * 2. No Markdown file carries a second front-matter block: a `---` line,
 *    then only `key: value` lines, then `---`, anywhere but at the very top
 *    (what a stray fragment left by a merge looks like). Generated reports
 *    are Markdown too and are held to the same rule.
 * 3. What `the-archipelago/README.md` counts or lists matches the disk: the
 *    directory table names every directory in `the-archipelago/` and nothing
 *    else; "four law-governed islands" and the islands it names match
 *    `ISLAND_IDS` in `src/domain/ids.ts`; and the First Fork's outputs list
 *    has one bullet per file in `exports/the-first-fork-v1/reports/`.
 * 4. Every test the READMEs and `docs/` cite exists (since 2026-10-31). A
 *    cited test file (`kernel.test.ts`, `test_bridge.py`, with or without a
 *    path) is in `simulation/test/` or `evennia/tests/`. A double-quoted
 *    string on a line that names a test file, or inside a parenthesis, is a
 *    citation of a vitest title, and must be a substring of some `it(...)`
 *    title in a test file the line names, or in any test file when the line
 *    names none (the plural bullets cite by title alone). A backticked
 *    `SomeTests`, `SomeTests.test_x` or `test_x` must be a unittest class
 *    or method in `evennia/tests/`. A renamed test used to leave its
 *    citation standing in the README with nothing behind it; now it fails
 *    here. What this still cannot check is that the test proves the claim
 *    beside it.
 * 5. `docs/evennia.md` and `evennia/README.md` are byte-identical, as
 *    CLAUDE.md says they are (since 2026-10-31; an edit to one is an edit to
 *    both).
 *
 * The shape follows architecture-definition-model's check_docs.py. The
 * README-proof convention it backs was Dermot's decision of 10 October 2026:
 * every capability row or bullet in a README names the test that proves it,
 * or says "no test yet" or "not yet implemented".
 *
 *     npm run check:docs        (from the-archipelago/simulation/)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ARCH = join(ROOT, "the-archipelago");
const SKIP = new Set(["node_modules", "coverage", "_site", "__pycache__"]);
const errors: string[] = [];

const rel = (p: string): string => relative(ROOT, p).split(sep).join("/");
const lines = (p: string): string[] => readFileSync(p, "utf8").replace(/\r\n/g, "\n").split("\n");
const FENCE = /^\s*(```|~~~)/;

function markdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...markdownFiles(p));
    else if (name.toLowerCase().endsWith(".md")) out.push(p);
  }
  return out.sort();
}

// 2. front matter
function frontMatter(file: string): void {
  const ls = lines(file);
  let fenced = false;
  for (let i = 0; i < ls.length; i++) {
    const line = ls[i] ?? "";
    if (FENCE.test(line)) { fenced = !fenced; continue; }
    if (fenced || line.trim() !== "---") continue;
    let j = i + 1;
    while (j < ls.length && /^[A-Za-z_][\w-]*\s*:(\s|$)/.test(ls[j] ?? "")) j++;
    if (j === i + 1 || j >= ls.length || (ls[j] ?? "").trim() !== "---") continue;
    if (i > 0) errors.push(`${rel(file)}:${i + 1}: a front-matter block below the top`);
    i = j;
  }
}

// 1. links
const LINK = /\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const REF = /^\s{0,3}\[[^\]]+\]:\s*<?([^\s>]+)>?/;
const HTML = /\s(?:src|href)="([^"]+)"/g;
function links(file: string): void {
  let fenced = false;
  lines(file).forEach((raw, index) => {
    if (FENCE.test(raw)) { fenced = !fenced; return; }
    if (fenced) return;
    const line = raw.replace(/`[^`\n]*`/g, "");
    const targets = [...line.matchAll(LINK), ...line.matchAll(HTML)].map((m) => m[1] ?? "");
    const ref = REF.exec(line);
    if (ref?.[1]) targets.push(ref[1]);
    for (const target of targets) {
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) continue;
      const bare = decodeURI(target.split("#")[0]?.split("?")[0] ?? "");
      if (!bare) continue;
      const resolved = bare.startsWith("/") ? join(ROOT, bare) : join(dirname(file), bare);
      if (!existsSync(resolved)) errors.push(`${rel(file)}:${index + 1}: link ${JSON.stringify(target)} resolves to nothing`);
    }
  });
}

// 3. the README against the disk
function section(ls: string[], heading: string): string[] {
  const out: string[] = [];
  let inside = false;
  for (const line of ls) {
    if (line.startsWith("#")) {
      if (inside) break;
      inside = line.replace(/^#+/, "").trim() === heading;
      continue;
    }
    if (inside) out.push(line);
  }
  return out;
}
const NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
function disk(): void {
  const readme = join(ARCH, "README.md");
  const ls = lines(readme);
  const text = ls.join("\n");

  const listed = new Set(ls.map((l) => /^\|\s*`([^`]+)\/`\s*\|/.exec(l)?.[1]).filter((d): d is string => !!d));
  const dirs = readdirSync(ARCH).filter((d) => !d.startsWith(".") && statSync(join(ARCH, d)).isDirectory());
  for (const d of dirs) if (!listed.has(d)) errors.push(`${rel(readme)}: the directory table does not list ${d}/`);
  for (const d of listed) if (!dirs.includes(d)) errors.push(`${rel(readme)}: the directory table lists ${d}/, which does not exist`);

  const ids = /ISLAND_IDS\s*=\s*\[([^\]]*)\]/.exec(readFileSync(join(ARCH, "simulation", "src", "domain", "ids.ts"), "utf8"));
  const islands = [...(ids?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? "");
  const said = /\b(\w+) law-governed islands: ((?:\*\*\w+\*\*(?:, | and )?)+)/.exec(text);
  if (!said) errors.push(`${rel(readme)}: no longer says how many law-governed islands there are`);
  else {
    const n = NUMBERS[(said[1] ?? "").toLowerCase()] ?? Number(said[1]);
    const named = [...(said[2] ?? "").matchAll(/\*\*(\w+)\*\*/g)].map((m) => (m[1] ?? "").toLowerCase());
    if (n !== islands.length) errors.push(`${rel(readme)}: says ${said[1]} islands, and ISLAND_IDS has ${islands.length}`);
    if (named.slice().sort().join() !== islands.slice().sort().join()) errors.push(`${rel(readme)}: names ${named.join(", ")}, and ISLAND_IDS is ${islands.join(", ")}`);
  }

  const outputs = section(ls, "First scenario: The First Fork").filter((l) => /^- /.test(l));
  const reports = readdirSync(join(ARCH, "exports", "the-first-fork-v1", "reports"));
  if (outputs.length !== reports.length) errors.push(`${rel(readme)}: lists ${outputs.length} outputs of The First Fork, and exports/the-first-fork-v1/reports/ holds ${reports.length} files`);
}

// 4. cited tests against the suites
const TS_TITLE = /^\s*(?:it|test)\(\s*(["'])((?:(?!\1)[^\\]|\\.)*)\1/gm;
const vitest = new Map<string, string[]>(); // basename → it() titles
for (const name of readdirSync(join(ARCH, "simulation", "test")).filter((n) => n.endsWith(".test.ts")).sort()) {
  const src = readFileSync(join(ARCH, "simulation", "test", name), "utf8");
  vitest.set(name, [...src.matchAll(TS_TITLE)].map((m) => m[2] ?? ""));
}
const unittest = new Map<string, Set<string>>(); // class → test methods
const pyFiles = new Set<string>();
for (const name of readdirSync(join(ARCH, "evennia", "tests")).filter((n) => /^test_\w+\.py$/.test(n)).sort()) {
  pyFiles.add(name);
  let cls = "";
  for (const line of lines(join(ARCH, "evennia", "tests", name))) {
    const c = /^class\s+(\w+)/.exec(line);
    if (c) { cls = c[1] ?? ""; if (!unittest.has(cls)) unittest.set(cls, new Set()); continue; }
    const m = /^\s+def\s+(test_\w+)/.exec(line);
    if (m && cls) unittest.get(cls)?.add(m[1] ?? "");
  }
}
const pyMethods = new Set([...unittest.values()].flatMap((s) => [...s]));
const TEST_FILE = /(?:[\w.-]+\/)*([\w-]+\.test\.ts|test_\w+\.py)\b/g;
const QUOTED = /"([^"]+)"/g;
const PY_REF = /`([A-Z]\w*Tests)(?:\.(test_\w+))?`|`(test_\w+)`/g;
let cited = 0;
function citations(file: string): void {
  let fenced = false;
  lines(file).forEach((raw, index) => {
    if (FENCE.test(raw)) { fenced = !fenced; return; }
    if (fenced) return;
    const where = `${rel(file)}:${index + 1}`;
    const line = raw.replace(/<[^>]*>/g, "");
    const named: string[] = [];
    for (const m of line.matchAll(TEST_FILE)) {
      const name = m[1] ?? "";
      if (name.endsWith(".ts") ? !vitest.has(name) : !pyFiles.has(name)) errors.push(`${where}: cites ${name}, which is not in the test suites`);
      else if (name.endsWith(".ts")) named.push(name);
    }
    const firstFile = line.search(TEST_FILE);
    const blanked = line.replace(QUOTED, (q) => " ".repeat(q.length));
    const pool = named.length ? named : [...vitest.keys()];
    const titles = pool.flatMap((n) => vitest.get(n) ?? []);
    for (const m of line.matchAll(QUOTED)) {
      const at = m.index ?? 0;
      const before = blanked.slice(0, at);
      const inParens = (before.match(/\(/g) ?? []).length > (before.match(/\)/g) ?? []).length;
      if (!inParens && !(firstFile >= 0 && firstFile < at)) continue;
      cited++;
      const title = m[1] ?? "";
      if (!titles.some((t) => t.includes(title))) {
        errors.push(`${where}: cites "${title}", which is no test in ${named.length ? named.join(", ") : "simulation/test/"}`);
      }
    }
    for (const m of line.matchAll(PY_REF)) {
      cited++;
      const [, cls, method, bare] = m;
      if (bare) { if (!pyMethods.has(bare)) errors.push(`${where}: cites ${bare}, which is no test in evennia/tests/`); continue; }
      const methods = unittest.get(cls ?? "");
      if (!methods) errors.push(`${where}: cites ${cls}, which is no test class in evennia/tests/`);
      else if (method && !methods.has(method)) errors.push(`${where}: cites ${cls}.${method}, which is no test in evennia/tests/`);
    }
  });
}

// 5. the two Evennia docs
function twins(): void {
  const a = join(ARCH, "docs", "evennia.md");
  const b = join(ARCH, "evennia", "README.md");
  if (!readFileSync(a).equals(readFileSync(b))) errors.push(`${rel(a)} and ${rel(b)} differ; CLAUDE.md says they are byte-identical copies, so edit both`);
}

const all = markdownFiles(ROOT);
const linked = all.filter((f) => /(^|\/)README\.md$/.test(rel(f)) || rel(f).startsWith("the-archipelago/docs/"));
for (const f of all) frontMatter(f);
for (const f of linked) { links(f); citations(f); }
disk();
twins();
for (const e of errors) console.error(`  FAIL: ${e}`);
console.log(`${all.length} Markdown files, ${linked.length} link-checked, ${cited} test citation(s) checked, ${errors.length} problem(s)`);
process.exit(errors.length ? 1 : 0);
