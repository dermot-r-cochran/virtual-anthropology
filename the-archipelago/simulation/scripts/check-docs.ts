/**
 * Doc check for the repository's Markdown. Node's standard library only:
 * no package is imported, so it runs under `tsx` (as CI runs it) or under
 * any Node that strips types.
 *
 * Three checks:
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

const all = markdownFiles(ROOT);
const linked = all.filter((f) => /(^|\/)README\.md$/.test(rel(f)) || rel(f).startsWith("the-archipelago/docs/"));
for (const f of all) frontMatter(f);
for (const f of linked) links(f);
disk();
for (const e of errors) console.error(`  FAIL: ${e}`);
console.log(`${all.length} Markdown files, ${linked.length} link-checked, ${errors.length} problem(s)`);
process.exit(errors.length ? 1 : 0);
