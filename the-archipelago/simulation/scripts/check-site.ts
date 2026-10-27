/**
 * Site check. Node's standard library only, like check-docs.ts: no package
 * is imported, so it runs under `tsx` (as CI runs it) or under any Node that
 * strips types.
 *
 * The Pages job runs on `main` only, so before this check a change that broke
 * the site's assembly, or moved a file `app.js` reads, merged green and failed
 * on deploy (TestingStrategy.md, the known gap of 2026-10-01). This script
 * assembles the site into a temporary directory exactly as the Pages job does
 * (`site/` at the root, `exports/` as `data/`, `reports/` as `reports/`) and
 * holds the result to what the page needs:
 *
 * 1. `index.html` keeps to its own Content-Security-Policy and to the threat
 *    model (`docs/threat-model.md`, *XSS in the static site*): no inline
 *    `<script>`, no `<style>` element, no `style=` attribute and no `on*=`
 *    handler; and every relative `src` or `href` in it resolves to a file in
 *    the assembled site.
 * 2. `data/catalog.json` parses at schemaVersion 2, every dataset it lists is
 *    a directory under `data/`, and every export directory is in the catalog
 *    (an export the catalog does not list is invisible on the site).
 * 3. For every dataset, every file `app.js` fetches as `${ds.path}/<file>`
 *    exists, the list taken from `app.js` itself so the check follows the
 *    page rather than a copy of it; `study.json` is required exactly when the
 *    dataset's `index.json` declares a study, which is when `app.js` asks for
 *    it. Every path in `index.json`'s `files` exists with the byte size the
 *    index records, because the Reports view offers each of them.
 * 4. The catalog's title, category, head hash and event count for each dataset
 *    agree with that dataset's `index.json`, so the experiment selector and
 *    the overview say the same thing.
 *
 * What it does not check is the rendering: that each view draws what the
 * data says. That remains the one part of the site with no test.
 *
 *     npm run check:site        (from the-archipelago/simulation/)
 */
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ARCH = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const errors: string[] = [];
const fail = (message: string): void => { errors.push(message); };

// Assemble the site the way the Pages job in .github/workflows/archipelago.yml does.
const site = mkdtempSync(join(tmpdir(), "archipelago-site-"));
try {
  cpSync(join(ARCH, "site"), site, { recursive: true });
  cpSync(join(ARCH, "exports"), join(site, "data"), { recursive: true });
  cpSync(join(ARCH, "reports"), join(site, "reports"), { recursive: true });

  // 1. index.html: the policy it declares, and the files it names.
  const indexPath = join(site, "index.html");
  if (!existsSync(indexPath)) fail("site/index.html is missing");
  else {
    const html = readFileSync(indexPath, "utf8");
    if (/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(html)) fail("site/index.html has an inline <script>, which its CSP (script-src 'self') does not allow");
    if (/<style\b/i.test(html)) fail("site/index.html has a <style> element, which its CSP (style-src 'self') does not allow");
    if (/\sstyle\s*=/i.test(html)) fail("site/index.html has a style= attribute, which its CSP (style-src 'self') does not allow");
    if (/\son[a-z]+\s*=/i.test(html)) fail("site/index.html has an on*= handler, which its CSP (script-src 'self') does not allow");
    for (const m of html.matchAll(/\s(?:src|href)="([^"]+)"/g)) {
      const target = m[1] ?? "";
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) continue;
      const bare = target.split("#")[0]?.split("?")[0] ?? "";
      if (bare && !existsSync(join(site, bare))) fail(`site/index.html names ${JSON.stringify(target)}, which the assembled site does not have`);
    }
  }

  // The files app.js reads for a dataset, read from app.js itself.
  const appPath = join(site, "app.js");
  const app = existsSync(appPath) ? readFileSync(appPath, "utf8") : "";
  if (!app) fail("site/app.js is missing");
  const perDataset = [...new Set([...app.matchAll(/\$\{ds\.path\}\/([\w.-]+)/g)].map((m) => m[1] ?? ""))].filter(Boolean).sort();
  if (perDataset.length === 0) fail("site/app.js names no per-dataset file (the pattern `${ds.path}/<file>` was not found); the check needs updating with the page");

  // 2. The catalog against the export directories.
  const catalogPath = join(site, "data", "catalog.json");
  type Dataset = { path?: unknown; id?: unknown; title?: unknown; category?: unknown; headHash?: unknown; eventCount?: unknown };
  let datasets: Dataset[] = [];
  if (!existsSync(catalogPath)) fail("exports/catalog.json is missing (app.js loads nothing without it)");
  else {
    let catalog: { schemaVersion?: unknown; datasets?: unknown };
    try { catalog = JSON.parse(readFileSync(catalogPath, "utf8")); } catch (e) { fail(`exports/catalog.json does not parse: ${(e as Error).message}`); catalog = {}; }
    if (catalog.schemaVersion !== 2) fail(`exports/catalog.json has schemaVersion ${JSON.stringify(catalog.schemaVersion)}, not 2`);
    if (!Array.isArray(catalog.datasets)) fail("exports/catalog.json has no datasets array");
    else datasets = catalog.datasets as Dataset[];
    const listed = new Set(datasets.map((d) => (typeof d.path === "string" ? d.path : "")));
    const onDisk = readdirSync(join(site, "data")).filter((name) => statSync(join(site, "data", name)).isDirectory());
    for (const dir of onDisk) if (!listed.has(dir)) fail(`exports/${dir}/ is not in exports/catalog.json, so the site cannot show it`);
    if (datasets.length === 0) fail("exports/catalog.json lists no datasets");
  }

  // 3 and 4. Each dataset's files, and its catalog entry against its index.
  for (const ds of datasets) {
    const path = typeof ds.path === "string" ? ds.path : "";
    if (!path) { fail(`exports/catalog.json has a dataset without a path: ${JSON.stringify(ds)}`); continue; }
    const dir = join(site, "data", path);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) { fail(`exports/catalog.json lists ${path}, and exports/${path}/ is not a directory`); continue; }
    const indexFile = join(dir, "index.json");
    let index: { study?: unknown; files?: unknown; title?: unknown; category?: unknown; headHash?: unknown; eventCount?: unknown } = {};
    if (!existsSync(indexFile)) fail(`exports/${path}/index.json is missing`);
    else {
      try { index = JSON.parse(readFileSync(indexFile, "utf8")); } catch (e) { fail(`exports/${path}/index.json does not parse: ${(e as Error).message}`); }
    }
    for (const file of perDataset) {
      const wanted = file === "study.json" ? index.study !== null && index.study !== undefined : true;
      const present = existsSync(join(dir, file));
      if (wanted && !present) fail(`exports/${path}/${file} is missing, and site/app.js reads it`);
      if (!wanted && present) fail(`exports/${path}/study.json is present, and index.json declares no study`);
    }
    if (Array.isArray(index.files)) {
      for (const entry of index.files as { path?: unknown; bytes?: unknown }[]) {
        const p = typeof entry.path === "string" ? entry.path : "";
        if (!p) { fail(`exports/${path}/index.json lists a file without a path`); continue; }
        const full = join(dir, p);
        if (!existsSync(full)) { fail(`exports/${path}/index.json lists ${p}, which is missing`); continue; }
        const bytes = Buffer.byteLength(readFileSync(full, "utf8").replace(/\r\n/g, "\n"), "utf8");
        if (typeof entry.bytes === "number" && bytes !== entry.bytes) fail(`exports/${path}/${p} is ${bytes} bytes, and index.json records ${entry.bytes}`);
      }
    } else fail(`exports/${path}/index.json has no files array (the Reports view lists it)`);
    for (const key of ["title", "category", "headHash", "eventCount"] as const) {
      if (ds[key] !== index[key]) fail(`exports/catalog.json says ${key} ${JSON.stringify(ds[key])} for ${path}, and exports/${path}/index.json says ${JSON.stringify(index[key])}`);
    }
  }

  const n = datasets.length;
  for (const e of errors) console.error(`  FAIL: ${e}`);
  console.log(`site assembled as the Pages job does: ${n} dataset(s), ${perDataset.length} file(s) per dataset read by app.js, ${errors.length} problem(s)`);
} finally {
  rmSync(site, { recursive: true, force: true });
}
process.exit(errors.length ? 1 : 0);
