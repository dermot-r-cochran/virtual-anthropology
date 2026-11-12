// The published site's rendering, without a browser: site/app.js runs as written in a node:vm
// context, with a minimal stand-in for the DOM and a fetch that serves the committed exports the
// way the Pages job lays them out (exports/ copied to data/). Nothing in app.js is changed for it.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const EXPORTS = join(ROOT, "exports");
const read = (p: string) => readFileSync(join(EXPORTS, p), "utf8");
const json = (p: string) => JSON.parse(read(p));

type Dataset = { id: string; path: string; title: string; category: string };
type ViewResult = string | { html: string; after?: () => unknown };
type Site = {
  views: Record<string, (ds: Dataset) => Promise<ViewResult>>;
  markdown: (src: string) => string;
  route: () => Promise<void>;
  start: Promise<void>;
};

const unescapeHtml = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const count = (html: string, needle: string) => html.split(needle).length - 1;
const settle = () => new Promise((r) => setTimeout(r, 0));

// A stand-in for the few DOM calls app.js makes. An unset <select> reads as the browser would:
// its option marked selected, else its first option, taken from the markup the view rendered.
function fakeDom() {
  const els = new Map<string, Record<string, unknown>>();
  const view = () => String(el("#view").innerHTML);
  function selectValue(id: string): string {
    const m = new RegExp(`<select id="${id}">([\\s\\S]*?)</select>`).exec(view());
    if (!m) return "";
    const opts = [...(m[1] ?? "").matchAll(/<option( value="([^"]*)")?( selected)?>([^<]*)<\/option>/g)];
    const pick = opts.find((o) => o[3]) ?? opts[0];
    return pick ? unescapeHtml(pick[2] ?? pick[4] ?? "") : "";
  }
  function el(sel: string): Record<string, unknown> {
    let e = els.get(sel);
    if (!e) {
      const state: Record<string, unknown> = { innerHTML: "", textContent: "", href: "" };
      let value: string | undefined;
      e = Object.assign(state, {
        listeners: [] as Array<() => unknown>,
        addEventListener(_t: string, f: () => unknown) { (state.listeners as Array<() => unknown>).push(f); },
        classList: { toggle() {} },
        getAttribute: () => null,
      });
      Object.defineProperty(e, "value", {
        get: () => value ?? (sel.startsWith("#") ? selectValue(sel.slice(1)) : ""),
        set: (v: string) => { value = v; },
      });
      els.set(sel, e);
    }
    return e;
  }
  const document = {
    querySelector: (sel: string) => el(sel),
    querySelectorAll: (sel: string) =>
      sel === "[data-cat]" ? [...view().matchAll(/data-cat="([^"]*)" checked/g)].map((m) => ({ checked: true, dataset: { cat: unescapeHtml(m[1] ?? "") }, addEventListener() {} })) : [],
  };
  return { el, document };
}

function loadSite(): { site: Site; el: (sel: string) => Record<string, unknown> } {
  const { el, document } = fakeDom();
  const fetch = async (url: string) => {
    const path = url.startsWith("data/") ? url.slice("data/".length) : null;
    try {
      if (path === null) throw new Error("not served");
      const text = read(path);
      return { ok: true, status: 200, text: async () => text, json: async () => JSON.parse(text) };
    } catch {
      return { ok: false, status: 404, text: async () => "", json: async () => null };
    }
  };
  const ctx = vm.createContext({ document, fetch, location: { hash: "" }, window: { addEventListener() {} }, console });
  const src = readFileSync(join(ROOT, "site", "app.js"), "utf8").replace(/\nstart\(\);\s*$/, "\nconst __started = start();\n");
  vm.runInContext(src, ctx, { filename: "site/app.js" });
  const site = vm.runInContext("({ views, markdown, route, start: __started })", ctx) as Site;
  // The renderer under a time limit, so a loop that stops advancing fails here instead of hanging.
  site.markdown = (text: string) => {
    ctx.__md = text;
    return vm.runInContext("markdown(__md)", ctx, { timeout: 2000 }) as string;
  };
  return { site, el };
}

const catalog = json("catalog.json") as { datasets: Dataset[] };

describe("site", () => {
  let site: Site;
  let el: (sel: string) => Record<string, unknown>;
  beforeAll(async () => {
    ({ site, el } = loadSite());
    await site.start;
  });

  async function render(name: string, ds: Dataset): Promise<string> {
    const result = await site.views[name]?.(ds);
    if (result === undefined) throw new Error(`no view ${name}`);
    const html = typeof result === "string" ? result : result.html;
    el("#view").innerHTML = html;
    if (typeof result === "object" && result.after) await result.after();
    await settle();
    return html;
  }

  it("the Markdown renderer escapes raw HTML and draws headings, tables, lists, quotes and code", () => {
    const out = site.markdown("# T <script>\n\n| a | b |\n|---|---|\n| `x` | **y** |\n\n- one\n- _two_\n\n> q\n\n```\n<b>\n```\n\npara & more");
    expect(out).toContain("<h2>T &lt;script&gt;</h2>");
    expect(out).toContain("<table><tr><th>a</th><th>b</th></tr><tr><td><code>x</code></td><td><strong>y</strong></td></tr></table>");
    expect(out).toContain("<ul><li>one</li><li><em>two</em></li></ul>");
    expect(out).toContain("<blockquote>q</blockquote>");
    expect(out).toContain("<pre>&lt;b&gt;</pre>");
    expect(out).toContain("<p>para &amp; more</p>");
    expect(out).not.toContain("<script");
    // A Windows checkout serves CRLF files to a local preview; each line must still advance.
    expect(site.markdown("# T\r\n\r\n| a |\r\n|---|\r\n| b |\r\n\r\ntext")).toBe("<h2>T</h2>\n<table><tr><th>a</th></tr><tr><td>b</td></tr></table>\n<p>text</p>");
  });

  it("the page starts from the committed catalog and the overview draws each dataset's title and findings", async () => {
    expect(String(el("#experiment").innerHTML).match(/<option /g)?.length).toBe(catalog.datasets.length);
    expect(String(el("#view").innerHTML)).toContain("<h2>");
    for (const ds of catalog.datasets) {
      const research = json(`${ds.path}/research.json`);
      const html = await render("overview", ds);
      expect(html).toContain(`<span class="tag">${ds.category}</span>`);
      for (const f of research.findings) expect(html).toContain(`<code>${f.hypothesisId}</code>`);
      expect(count(html, "<tr>") - 1).toBe(research.findings.length);
    }
  });

  it("the timeline, memory and chronicle views list every record in the export", async () => {
    for (const ds of catalog.datasets) {
      const events = json(`${ds.path}/interchange.json`).events;
      await render("timeline", ds);
      expect(el("#f-count").textContent).toBe(`${events.length} of ${events.length} events`);
      expect(count(String(el("#tl").innerHTML), 'class="event-row"')).toBe(events.length);

      const records = json(`${ds.path}/memory_history.json`).records;
      await render("memory", ds);
      expect(el("#m-count").textContent).toBe(`${records.length} of ${records.length} records`);

      const statements = json(`${ds.path}/research.json`).chronicle.periods.flatMap((p: { statements: unknown[] }) => p.statements);
      await render("chronicle", ds);
      expect(count(String(el("#chron").innerHTML), "<li>")).toBe(statements.length);
    }
  });

  it("the lineage and network views draw a node for each person-stage and citizen they show", async () => {
    for (const ds of catalog.datasets) {
      const g = json(`${ds.path}/lineage_graph.json`);
      const involved = new Set(g.edges.flatMap((e: { from: string; to: string }) => [e.from, e.to]));
      const lineage = await render("lineage", ds);
      expect(count(lineage, "<circle ")).toBe(g.nodes.filter((n: { id: string }) => involved.has(n.id)).length);
      expect(lineage).toContain(`${g.nodes.length - involved.size} other person-stage(s)`);

      const net = json(`${ds.path}/relationship_network.json`);
      const network = await render("network", ds);
      expect(count(network, "<circle ")).toBe(net.nodes.length);
      expect(count(network, "<line ")).toBe(net.links.length);
    }
  });

  it("the continuity, legal, metrics, study and reports views draw what each export holds, and none fails", async () => {
    for (const ds of catalog.datasets) {
      const d = json(`${ds.path}/dataset.json`);
      const continuity = await render("continuity", ds);
      if ((d.scenario?.continuityEvents ?? []).length === 0) expect(continuity).toContain("No identity-continuity events");
      else expect(continuity).toContain("<h2>Identity-continuity events</h2>");

      const legal = await render("legal", ds);
      if (!d.scenario?.legal) expect(legal).toContain("No legal analysis");
      else for (const i of d.scenario.legal) expect(legal).toContain(`<strong>${i.island}</strong>`);

      const cm = json(`${ds.path}/civilization_metrics.json`);
      const metrics = await render("metrics", ds);
      expect(count(metrics, "<tr><td><code>")).toBe(cm.definitions.length);
      expect(count(String(el("#chart").innerHTML), "<circle ")).toBe(cm.series.length);

      const index = json(`${ds.path}/index.json`);
      const study = await render("study", ds);
      if (!index.study) expect(study).toContain("This manifest declares no study.");
      else {
        const st = json(`${ds.path}/study.json`);
        for (const r of st.runs) expect(study).toContain(`<tr><td><code>${r.id}</code></td>`);
      }

      const docs = index.files.map((f: { path: string }) => f.path).filter((p: string) => /\.(md|mmd|yaml)$/.test(p));
      const reports = await render("reports", ds);
      expect(count(reports, "<option>")).toBe(docs.length);
      expect(String(el("#r-body").innerHTML).length).toBeGreaterThan(0);
      for (const p of docs.filter((x: string) => x.endsWith(".md"))) expect(site.markdown(read(`${ds.path}/${p}`))).not.toContain("<script");

      el("#view").innerHTML = "";
      await site.route();
      expect(String(el("#view").innerHTML)).not.toContain("Could not render");
    }
  });
});
