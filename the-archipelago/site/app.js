// The Archipelago research site. Dependency-free; renders exported JSON only.
// Data is loaded from ./data/ (GitHub Pages build) or ../exports/ (local preview).

const ISLAND_COLOURS = { continuity: "#2f6db5", fork: "#c0582b", mnemosyne: "#7a4fb0", concord: "#2e8b57" };
const EDGE_COLOURS = { "same-record-continues": "#1d2330", "forked-into": "#c0582b", "merged-into": "#2e8b57", "claims-continuity-with": "#7a4fb0" };

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (sel) => document.querySelector(sel);
const swatch = (c) => `<svg class="swatch" width="12" height="12" aria-hidden="true"><rect width="12" height="12" rx="2" fill="${c}"/></svg>`;

let base = "data/";
const cache = new Map();

async function fetchText(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  const text = await res.text();
  cache.set(path, text);
  return text;
}
const fetchJson = async (path) => JSON.parse(await fetchText(path));

async function locateData() {
  for (const candidate of ["data/", "../exports/"]) {
    try {
      const res = await fetch(candidate + "catalog.json");
      if (res.ok) { base = candidate; return res.json(); }
    } catch { /* try next */ }
  }
  throw new Error("No catalog.json found in ./data/ or ../exports/. Run the publish pipeline first.");
}

// ---------- minimal, escaping Markdown renderer ----------
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g, "$1<em>$2</em>");
}
function markdown(src) {
  const lines = src.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      out.push(`<pre>${esc(buf.join("\n"))}</pre>`);
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { const n = Math.min(h[1].length + 1, 5); out.push(`<h${n}>${inline(h[2])}</h${n}>`); i++; continue; }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const body = rows.filter((r, k) => !(k === 1 && /^\|[\s:|-]+\|?$/.test(r)));
      out.push("<table>" + body.map((r, k) => `<tr>${cells(r).map((c) => (k === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join("")}</tr>`).join("") + "</table>");
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ""));
      out.push(`<ul>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</ul>`);
      continue;
    }
    if (line.startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith(">")) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }
    if (line.trim() === "") { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#|\||>|```|\s*[-*]\s)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}

// ---------- views ----------
const views = {
  async overview(ds) {
    const [index, research] = await Promise.all([fetchJson(`${ds.path}/index.json`), fetchJson(`${ds.path}/research.json`)]);
    const v = (id) => research.metrics.find((m) => m.metric === id)?.value ?? 0;
    const kpis = [["Events", "simulation.events"], ["Ticks", "simulation.ticks"], ["Citizen records", "population.records"], ["Forks", "identity.forks"], ["Continuity claims", "identity.continuity_claims"], ["Laws enacted", "governance.laws_enacted"], ["Artefacts", "culture.artefacts"], ["Commands rejected", "governance.commands_rejected"]];
    return `
      <h2>${esc(index.title)}</h2>
      <p class="muted"><span class="tag">${esc(index.category)}</span> <code>${esc(index.experimentId)}</code> · seed <code>${esc(index.seed)}</code> · head <code>${esc(index.headHash.slice(0, 16))}…</code> · configuration <code>${esc(index.configurationHash.slice(0, 16))}…</code></p>
      <div class="card"><strong>Research question.</strong> ${esc(research.question.text)}</div>
      <div class="grid">${kpis.map(([l, id]) => `<div class="card"><div class="kpi">${esc(v(id))}</div><div class="muted">${esc(l)} <code>${esc(id)}</code></div></div>`).join("")}</div>
      <h3>Findings <span class="tag">computed</span></h3>
      <table><tr><th>Hypothesis</th><th>Statement</th><th>Test</th><th>Observed</th><th>Outcome</th></tr>
      ${research.findings.map((f) => {
        const h = research.hypotheses.find((x) => x.id === f.hypothesisId);
        const cls = f.outcome.startsWith("consistent") ? "ok" : f.outcome.startsWith("inconsistent") ? "no" : "na";
        return `<tr><td><code>${esc(f.hypothesisId)}</code></td><td>${esc(h?.statement)}</td><td><code>${esc(f.metric)} ${esc(f.comparator)} ${esc(f.threshold)}</code></td><td>${esc(f.observedValue ?? "n/a")}</td><td><span class="tag ${cls}">${esc(f.outcome)}</span></td></tr>`;
      }).join("")}</table>
      <p class="muted">Findings are mechanical results of each operationalised hypothesis in a single deterministic run. Interpretation is left to researchers.${index.category === "demonstration" ? " This run is a demonstration: its protagonists act as the scenario scripts them, so a consistent finding shows the platform and the declared law tables produce the declared outcome, not what citizens would do." : ""}</p>`;
  },

  async chronicle(ds) {
    const research = await fetchJson(`${ds.path}/research.json`);
    const ch = research.chronicle;
    const cats = [...new Set(ch.periods.flatMap((p) => p.statements.map((s) => s.category)))].sort();
    const html = `
      <h2>Civilization chronicle</h2>
      <p class="muted">${esc(ch.timeMapping)}. Each statement is generated from, and cites, recorded events.</p>
      <div class="filters">${cats.map((c) => `<label><input type="checkbox" data-cat="${esc(c)}" checked> ${esc(c)}</label>`).join("")}</div>
      <div id="chron"></div>`;
    const render = () => {
      const on = new Set([...document.querySelectorAll("[data-cat]")].filter((x) => x.checked).map((x) => x.dataset.cat));
      $("#chron").innerHTML = ch.periods.map((p) => {
        const sts = p.statements.filter((s) => on.has(s.category));
        if (sts.length === 0) return "";
        return `<h3>Year ${esc(p.year)}</h3><ul>${sts.map((s) => `<li>${esc(s.text)} <span class="muted">[${s.events.map((e) => `<code title="${esc(e.hash)}">${esc(e.seq)}:${esc(e.type)}</code>`).join(" ")}]</span> <span class="tag">${esc(s.category)}</span></li>`).join("")}</ul>`;
      }).join("");
    };
    return { html, after: () => { document.querySelectorAll("[data-cat]").forEach((x) => x.addEventListener("change", render)); render(); } };
  },

  async timeline(ds) {
    const input = await fetchJson(`${ds.path}/interchange.json`);
    const types = [...new Set(input.events.map((e) => e.type))].sort();
    const citizens = input.snapshot.citizens;
    const html = `
      <h2>Event timeline</h2>
      <div class="filters">
        <label>Type <select id="f-type"><option value="">all</option>${types.map((t) => `<option>${esc(t)}</option>`).join("")}</select></label>
        <label>Citizen <select id="f-cit"><option value="">all</option>${citizens.map((c) => `<option value="${esc(c.id)}">${esc(c.name)} (${esc(c.id)})</option>`).join("")}</select></label>
        <label>Search <input id="f-q" type="search" placeholder="text"></label>
        <span id="f-count" class="muted"></span>
      </div>
      <table id="tl"></table>`;
    const render = () => {
      const t = $("#f-type").value, c = $("#f-cit").value, q = $("#f-q").value.toLowerCase();
      const rows = input.events.filter((e) => (!t || e.type === t) && (!c || e.citizens.includes(c)) && (!q || e.summary.toLowerCase().includes(q)));
      $("#f-count").textContent = `${rows.length} of ${input.events.length} events`;
      $("#tl").innerHTML = `<tr><th>seq</th><th>tick</th><th>type</th><th>actor</th><th>summary</th></tr>` +
        rows.map((e) => `<tr class="event-row"><td>${esc(e.seq)}</td><td>${esc(e.tick)}</td><td><code>${esc(e.type)}</code></td><td>${esc(e.actor)}</td><td>${esc(e.summary)}</td></tr>`).join("");
    };
    return { html, after: () => { ["#f-type", "#f-cit", "#f-q"].forEach((s) => $(s).addEventListener("input", render)); render(); } };
  },

  async lineage(ds) {
    const g = await fetchJson(`${ds.path}/lineage_graph.json`);
    const involved = new Set(g.edges.flatMap((e) => [e.from, e.to]));
    const nodes = g.nodes.filter((n) => involved.has(n.id));
    const others = g.nodes.filter((n) => !involved.has(n.id));
    // Layered layout: column by fromSeq order, rows within column.
    const cols = [...new Set(nodes.map((n) => n.fromSeq))].sort((a, b) => a - b);
    const pos = new Map();
    cols.forEach((seq, ci) => nodes.filter((n) => n.fromSeq === seq).forEach((n, ri) => pos.set(n.id, { x: 120 + ci * 320, y: 60 + ri * 90 })));
    const height = Math.max(200, ...[...pos.values()].map((p) => p.y + 60));
    const width = 120 + cols.length * 320;
    const edges = g.edges.map((e, k) => {
      const a = pos.get(e.from), b = pos.get(e.to);
      if (!a || !b) return "";
      const curve = e.kind === "claims-continuity-with" ? 40 + (k % 3) * 15 : 0;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - curve;
      return `<path d="M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}" fill="none" stroke="${EDGE_COLOURS[e.kind] ?? "#888"}" stroke-width="2" ${e.kind === "claims-continuity-with" ? 'stroke-dasharray="5 4"' : ""} marker-end="url(#arrow)"><title>${esc(e.kind)} at seq ${esc(e.atSeq)}: ${esc(e.note)}</title></path>`;
    }).join("");
    const nodeSvg = nodes.map((n) => {
      const p = pos.get(n.id);
      return `<g><circle cx="${p.x}" cy="${p.y}" r="10" fill="#fff" stroke="#1d2330" stroke-width="2"><title>${esc(n.label)}</title></circle><text x="${p.x}" y="${p.y + 26}" text-anchor="middle">${esc(n.name)}</text><text x="${p.x}" y="${p.y + 39}" text-anchor="middle" class="muted">${esc(n.citizen)} · seq ${esc(n.fromSeq)}${n.untilSeq === null ? "+" : `–${n.untilSeq - 1}`}</text></g>`;
    }).join("");
    return `
      <h2>Identity lineage (person-stages)</h2>
      <p class="muted">A citizen record is split into person-stages at forks and mergers. Dashed edges are <em>testimony</em> (continuity claims), not adjudications. The system does not decide which claimant is "the real person".</p>
      <p class="legend">${Object.entries(EDGE_COLOURS).map(([k, c]) => `<span>${swatch(c)}${esc(k)}</span>`).join("")}</p>
      <svg viewBox="0 0 ${width} ${height}" width="${width}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>${edges}${nodeSvg}</svg>
      <p class="muted">${others.length} other person-stage(s) without lineage edges are omitted: ${others.map((n) => esc(n.name)).join(", ")}.</p>`;
  },

  async network(ds) {
    const net = await fetchJson(`${ds.path}/relationship_network.json`);
    const n = net.nodes.length, cx = 360, cy = 300, r = 230;
    const pos = new Map(net.nodes.map((node, i) => [node.id, { x: cx + r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2), y: cy + r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2) }]));
    const kinds = [...new Set(net.links.map((l) => l.kind))].sort();
    const dash = (k) => ({ "fork-kin": "6 3", kin: "2 3" })[k] ?? "";
    const links = net.links.map((l) => {
      const a = pos.get(l.source), b = pos.get(l.target);
      if (!a || !b) return "";
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${l.status === "active" ? "#555" : "#bbb"}" stroke-width="${l.status === "active" ? 2 : 1}" stroke-dasharray="${dash(l.kind)}"><title>${esc(l.kind)} (${esc(l.status)}, ${esc(l.origin)}) since seq ${esc(l.sinceSeq)}</title></line>`;
    }).join("");
    const nodes = net.nodes.map((node) => {
      const p = pos.get(node.id);
      return `<g><circle cx="${p.x}" cy="${p.y}" r="12" fill="${ISLAND_COLOURS[node.residence] ?? "#999"}"><title>${esc(node.name)} — ${esc(node.lifecycle)}, ${esc(node.birthKind)}</title></circle><text x="${p.x}" y="${p.y + 28}" text-anchor="middle">${esc(node.name)}</text></g>`;
    }).join("");
    return `
      <h2>Relationship network</h2>
      <p class="legend">${Object.entries(ISLAND_COLOURS).map(([k, c]) => `<span>${swatch(c)}${esc(k)}</span>`).join("")} · link kinds: ${kinds.map(esc).join(", ")}</p>
      <svg viewBox="0 0 720 600" width="720">${links}${nodes}</svg>`;
  },

  async continuity(ds) {
    const d = await fetchJson(`${ds.path}/dataset.json`);
    const evs = d.scenario?.continuityEvents ?? [];
    if (evs.length === 0) return "<p>No identity-continuity events in this experiment.</p>";
    const dims = [...new Set(evs.map((e) => e.dimension))];
    const cits = [...new Set(evs.map((e) => e.citizen))];
    const name = (id) => d.citizens.find((c) => c.id === id)?.name ?? id;
    return `
      <h2>Identity-continuity events</h2>
      <p class="muted">Projection of the event log onto continuity dimensions. Each cell lists effects with their source event sequence numbers.</p>
      <table><tr><th>citizen</th>${dims.map((x) => `<th>${esc(x)}</th>`).join("")}</tr>
      ${cits.map((c) => `<tr><td>${esc(name(c))}<br><code>${esc(c)}</code></td>${dims.map((dim) => `<td>${evs.filter((e) => e.citizen === c && e.dimension === dim).map((e) => `<div title="${esc(e.detail)}"><span class="tag">${esc(e.effect)}</span> <span class="muted">seq ${esc(e.seq)}</span></div>`).join("")}</td>`).join("")}</tr>`).join("")}
      </table>`;
  },

  async memory(ds) {
    const mh = await fetchJson(`${ds.path}/memory_history.json`);
    const statuses = [...new Set(mh.records.map((m) => m.status))].sort();
    const html = `
      <h2>Memory provenance explorer</h2>
      <p class="muted">Every record keeps its full provenance chain. Imported memory is not autobiographical unless explicitly integrated.</p>
      <div class="filters"><label>Status <select id="m-status"><option value="">all</option>${statuses.map((s) => `<option>${esc(s)}</option>`).join("")}</select></label>
      <label>Holder / experiencer <input id="m-q" type="search" placeholder="cit-0011"></label><span id="m-count" class="muted"></span></div>
      <table id="m-table"></table>
      <h3>Memory events</h3>
      <table>${mh.events.map((e) => `<tr><td>${esc(e.seq)}</td><td><code>${esc(e.type)}</code></td><td>${esc(e.summary)}</td></tr>`).join("")}</table>`;
    const render = () => {
      const st = $("#m-status").value, q = $("#m-q").value.trim();
      const rows = mh.records.filter((m) => (!st || m.status === st) && (!q || m.holder === q || m.experiencedBy === q));
      $("#m-count").textContent = `${rows.length} of ${mh.records.length} records`;
      $("#m-table").innerHTML = `<tr><th>id</th><th>holder</th><th>experienced by</th><th>status</th><th>integrity</th><th>provenance chain</th></tr>` +
        rows.map((m) => `<tr><td><code>${esc(m.id)}</code></td><td>${esc(m.holder ?? `archive:${m.archive}`)}</td><td>${esc(m.experiencedBy)}</td><td><span class="tag">${esc(m.status)}</span></td><td>${esc(m.integrity)}</td><td>${m.provenance.map((p) => `${esc(p.action)}${p.by ? ` by ${esc(p.by)}` : ""} @${esc(p.atSeq)} (${esc(p.island)})`).join(" → ")}</td></tr>`).join("");
    };
    return { html, after: () => { ["#m-status", "#m-q"].forEach((s) => $(s).addEventListener("input", render)); render(); } };
  },

  async legal(ds) {
    const d = await fetchJson(`${ds.path}/dataset.json`);
    const legal = d.scenario?.legal;
    if (!legal) return "<p>No legal analysis in this experiment.</p>";
    const name = (id) => d.citizens.find((c) => c.id === id)?.name ?? id;
    const claimants = [...new Set(legal.flatMap((i) => i.readings.map((r) => r.claimant)))];
    const cell = (r) => {
      const cls = r.recognisesContinuity === true ? "ok" : r.recognisesContinuity === false ? "no" : "na";
      const label = r.recognisesContinuity === true ? "recognised" : r.recognisesContinuity === false ? "not recognised" : "not adjudicated";
      return `<span class="tag ${cls}">${label}</span><div class="muted">${esc(r.standing)}</div><details><summary>reasoning</summary><ul>${r.reasoning.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>`;
    };
    return `
      <h2>Legal readings by island</h2>
      <p class="muted">Each island's law, applied to the same recorded evidence. The system reports these readings side by side. It does not choose between them.</p>
      <table><tr><th>island (doctrine)</th>${claimants.map((c) => `<th>${esc(name(c))}<br><code>${esc(c)}</code></th>`).join("")}</tr>
      ${legal.map((i) => `<tr><td><strong>${esc(i.island)}</strong><br><span class="muted">${esc(i.doctrine)} · law v${esc(i.lawVersion)}</span></td>${claimants.map((c) => { const r = i.readings.find((x) => x.claimant === c); return `<td>${r ? cell(r) : ""}</td>`; }).join("")}</tr>`).join("")}
      </table>`;
  },

  async metrics(ds) {
    const cm = await fetchJson(`${ds.path}/civilization_metrics.json`);
    const keys = Object.keys(cm.series[0]?.values ?? {});
    const html = `
      <h2>Civilization metrics</h2>
      <div class="filters"><label>Series <select id="s-key">${keys.map((k) => `<option${k === "citizens" ? " selected" : ""}>${esc(k)}</option>`).join("")}</select></label></div>
      <div id="chart"></div>
      <h3>Final metric values and definitions</h3>
      <table><tr><th>metric</th><th>value</th><th>unit</th><th>definition</th></tr>
      ${cm.definitions.map((d) => `<tr><td><code>${esc(d.id)}</code></td><td>${esc(cm.final.find((m) => m.metric === d.id)?.value)}</td><td>${esc(d.unit)}</td><td>${esc(d.definition)}</td></tr>`).join("")}</table>`;
    const render = () => {
      const k = $("#s-key").value;
      const pts = cm.series.map((p) => ({ x: p.tick, y: p.values[k] ?? 0 }));
      const W = 720, H = 260, P = 40;
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const x0 = Math.min(...xs), x1 = Math.max(...xs, x0 + 1), y0 = Math.min(0, ...ys), y1 = Math.max(...ys, y0 + 1);
      const sx = (x) => P + ((x - x0) / (x1 - x0)) * (W - 2 * P), sy = (y) => H - P - ((y - y0) / (y1 - y0)) * (H - 2 * P);
      const path = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x)},${sy(p.y)}`).join(" ");
      $("#chart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}">
        <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="#999"/><line x1="${P}" y1="${P}" x2="${P}" y2="${H - P}" stroke="#999"/>
        <text x="${W / 2}" y="${H - 8}" text-anchor="middle">tick</text><text x="${P - 6}" y="${sy(y1)}" text-anchor="end">${esc(y1)}</text><text x="${P - 6}" y="${sy(y0)}" text-anchor="end">${esc(y0)}</text>
        <path d="${path}" fill="none" stroke="#1f6f8b" stroke-width="2"/>
        ${pts.map((p) => `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="3" fill="#1f6f8b"><title>tick ${esc(p.x)}: ${esc(p.y)}</title></circle>`).join("")}
      </svg>`;
    };
    return { html, after: () => { $("#s-key").addEventListener("input", render); render(); } };
  },

  async study(ds) {
    const index = await fetchJson(`${ds.path}/index.json`);
    if (!index.study) return `<h2>Study</h2><p class="muted">This manifest declares no study.</p>`;
    const st = await fetchJson(`${ds.path}/study.json`);
    const hyps = Object.keys(Object.values(st.summary)[0]?.hypotheses ?? {});
    const outcome = (r) => hyps.map((h) => (r.findings.find((f) => f.hypothesisId === h)?.outcome ?? "n/a").replace("-with-hypothesis", "")).join(" / ");
    const groups = [["branches", "Branch sweep (one choice taken differently per timeline)"], ["doctrines", "Doctrine variants"], ["timelines", "Alternate timelines"]].filter(([g]) => st.summary[g]);
    const html = `
      <h2>Study</h2>
      <p class="muted">Replications of the base run under declared variations; each a deterministic run identified by its head hash. Base head <code>${esc(st.base.headHash.slice(0, 16))}…</code>${st.base.branchSeq === null ? "" : `, branch point after seq ${esc(st.base.branchSeq)}`}.</p>
      ${groups.map(([g, label]) => {
        const s = st.summary[g];
        const runs = st.runs.filter((r) => r.group === g);
        return `<h3>${esc(label)} <span class="tag">${esc(s.completed)} of ${esc(s.runs)} completed</span></h3>
        <table><tr><th>run</th><th>variation</th><th>events</th><th>head</th><th>${hyps.map(esc).join(" / ")}</th></tr>
        ${runs.map((r) => `<tr><td><code>${esc(r.id)}</code></td><td><code>${esc(JSON.stringify(r.variation))}</code></td><td>${esc(r.eventCount ?? "—")}</td><td>${r.headHash ? `<code title="${esc(r.headHash)}">${esc(r.headHash.slice(0, 12))}…</code>${r.headHash === st.base.headHash ? " <span class=\"tag\">= base</span>" : ""}` : "—"}</td><td>${r.status === "completed" ? esc(outcome(r)) : `<span class="tag no">infeasible</span> ${esc(r.reason)}`}</td></tr>`).join("")}</table>
        <ul>${hyps.map((h) => { const t = s.hypotheses[h]; return `<li><code>${esc(h)}</code>: consistent in ${esc(t.consistent)} of ${esc(t.n)} completed run(s)</li>`; }).join("")}</ul>
        <table><tr><th>metric</th><th>n</th><th>min</th><th>median</th><th>mean</th><th>max</th></tr>
        ${Object.entries(s.metrics).map(([id, v]) => `<tr><td><code>${esc(id)}</code></td><td>${esc(v.n)}</td><td>${esc(v.min)}</td><td>${esc(v.median)}</td><td>${esc(v.mean)}</td><td>${esc(v.max)}</td></tr>`).join("")}</table>`;
      }).join("")}
      <p class="muted">Summaries are min, median, mean and max over completed runs and nothing else. Interpretation is left to researchers.</p>`;
    return html;
  },

  async reports(ds) {
    const index = await fetchJson(`${ds.path}/index.json`);
    const docs = index.files.map((f) => f.path).filter((p) => p.endsWith(".md") || p.endsWith(".mmd") || p.endsWith(".yaml"));
    const html = `
      <h2>Reports and provenance</h2>
      <div class="filters"><label>Document <select id="r-doc">${docs.map((p) => `<option>${esc(p)}</option>`).join("")}</select></label>
      <a id="r-raw" href="#">raw</a></div>
      <div id="r-body" class="card"></div>`;
    const render = async () => {
      const p = $("#r-doc").value;
      $("#r-raw").href = base + ds.path + "/" + p;
      const text = await fetchText(`${ds.path}/${p}`);
      $("#r-body").innerHTML = p.endsWith(".md") ? markdown(text) : `<pre>${esc(text)}</pre>`;
    };
    return { html, after: () => { $("#r-doc").addEventListener("input", render); render(); } };
  },
};

// ---------- shell ----------
let catalog = null;

async function route() {
  const name = (location.hash.slice(1) || "overview").split("?")[0];
  const view = views[name] ?? views.overview;
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${name}`));
  const ds = catalog.datasets[Number($("#experiment").value) || 0];
  if (!ds) { $("#view").innerHTML = "<p>No datasets in catalog.</p>"; return; }
  $("#view").innerHTML = "<p>Loading…</p>";
  try {
    const result = await view(ds);
    const html = typeof result === "string" ? result : result.html;
    $("#view").innerHTML = html;
    if (typeof result === "object" && result.after) await result.after();
  } catch (err) {
    $("#view").innerHTML = `<p>Could not render this view: ${esc(err.message)}</p>`;
  }
}

async function start() {
  try {
    catalog = await locateData();
  } catch (err) {
    $("#view").innerHTML = `<p>${esc(err.message)}</p>`;
    return;
  }
  $("#experiment").innerHTML = catalog.datasets.map((d, i) => `<option value="${i}">${esc(d.title)} (${esc(d.id)}, ${esc(d.category)})</option>`).join("");
  $("#experiment").addEventListener("change", route);
  window.addEventListener("hashchange", route);
  await route();
}

start();
