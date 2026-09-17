// docs/spine/road.html — the road, drawn from the ledgers (steward-57).
//
// A view, never edited by hand: where it disagrees with KANBAN.md, KANBAN
// wins. Regenerated at every boundary session and every version stamp:
//
//   node scripts/road.mjs
//
// Reads KANBAN.md (board, versions, roadmap), docs/spine/assumptions.md (the
// bets), docs/spine/one-pager.md (the one number), the sibling data
// repository's watch state (liveness) and tokens.css (the palette).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rd = (f) => readFileSync(join(root, f), "utf8");
const kanban = rd("KANBAN.md");
const assumptions = rd("docs/spine/assumptions.md");
const today = new Date().toISOString().slice(0, 10);

// ---- parsing ---------------------------------------------------------------

const section = (text, from, to) => {
  const a = text.indexOf(`\n${from}`);
  if (a < 0) return "";
  const b = to ? text.indexOf(`\n${to}`, a + 1) : -1;
  return text.slice(a, b < 0 ? undefined : b);
};

// Top-level bullets of a section, each joined with its continuation lines.
const bullets = (text) => {
  const out = [];
  for (const line of text.split("\n")) {
    if (/^- /.test(line)) out.push(line.slice(2));
    else if (out.length && /^\s{2,}\S/.test(line)) out[out.length - 1] += " " + line.trim();
  }
  return out;
};

const plain = (s) =>
  s.replace(/\*\*/g, "").replace(/`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const DATE = /\d{4}-\d{2}-\d{2}/;

const sliceOf = (b) => {
  const m = b.match(/^\*\*(.+?)\*\*\s*(?:\((s[\w]+)\))?/);
  if (!m) return null;
  let title = m[1];
  let id = m[2] ?? null;
  const lead = title.match(/^(s[\w]+)\s+—\s+(.+)$/);
  if (lead) { id = lead[1]; title = lead[2]; }
  if (!id) return null;
  // The proof: the entry's prose with the bookkeeping (scenario paths, the
  // human's word, commit hashes, the state line) removed, first two sentences.
  const rest = plain(b.slice(m[0].length))
    .replace(/\((?:docs|spec|human)[^)]*\)/g, "")
    .replace(/docs\/spine\/\S+/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[·\s—-]+/, "")
    .replace(/^\([^)]*\)\s*·\s*/, "");
  const state = /real-green/.test(b) ? "real-green" : /mock-green/.test(b) ? "mock-green" : "done";
  const dated = b.match(/real-green\**\s*(\d{4}-\d{2}-\d{2})/) ?? b.match(DATE);
  let proof = rest;
  if (/^(?:site #\d+(?:, #\d+)* · )?(?:real|mock)-green/.test(proof)) {
    const cut = proof.search(/ — |: |\. |; /);
    proof = cut < 0 ? "" : proof.slice(cut);
  }
  proof = proof.replace(/^[\s.—·;:)]+/, "").replace(/\s+\./g, ".").split(/(?<=\.)\s/).slice(0, 2).join(" ");
  const locked = /on this device|personal data|feedback door|a mail|the record\b|never leave/i.test(b);
  return { id, title: plain(title), state, date: dated ? dated[1] ?? dated[0] : null, proof, locked };
};

const board = {
  done: bullets(section(kanban, "## done", "## versions")).map(sliceOf).filter(Boolean),
  realGreen: bullets(section(kanban, "## real-green", "## done")).map(sliceOf).filter(Boolean),
  mockGreen: bullets(section(kanban, "## mock-green", "## real-green")).map(sliceOf).filter(Boolean),
  active: bullets(section(kanban, "## active", "## mock-green")).map(sliceOf).filter(Boolean),
  backlog: bullets(section(kanban, "## backlog", "## active")).map(sliceOf).filter(Boolean),
};

const versions = bullets(section(kanban, "## versions"))
  .map((b) => {
    const m = b.match(/^\*\*(v[\d.]+)\*\*\s*—\s*(.*)$/s);
    if (!m) return null;
    const text = plain(m[2]);
    const date =
      (text.match(/(?:stamped|announced)\s+(\d{4}-\d{2}-\d{2})/) ?? [])[1] ??
      [...text.matchAll(/\((\d{4}-\d{2}-\d{2})\)/g)].pop()?.[1] ??
      (text.match(DATE) ?? [])[0] ?? null;
    const sentences = text.replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*$/, "").split(/(?<=\.)\s/);
    const can = sentences.slice(0, 2).join(" ");
    const not = sentences.slice(2).find((s) => /\b(not in it|without|not yet|does not|not scored|no longer|nothing|waits?|deferred)\b/i.test(s)) ?? "—";
    return { id: m[1], date, can, not, text };
  })
  .filter(Boolean)
  .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.id.localeCompare(b.id, undefined, { numeric: true }));

const roadmap = [];
{
  const text = section(kanban, "## roadmap", "## backlog");
  let cur = null;
  for (const line of text.split("\n")) {
    const h = line.match(/^### (.+)$/);
    if (h) { cur = { heading: plain(h[1]), items: [] }; roadmap.push(cur); continue; }
    if (!cur) continue;
    if (/^- /.test(line)) {
      const t = line.match(/^- \*\*(.+?)\*\*/);
      const landed = /landed/.test(line);
      cur.items.push({ title: t ? plain(t[1]) : plain(line.slice(2)).slice(0, 80), landed });
    } else if (/^\*\*(Fixes|Candidates)/.test(line)) {
      cur.items.push({ group: plain(line.replace(/\(.*$/, "")) });
    }
  }
}

const cutoff = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10);
const bets = bullets(assumptions)
  .map((b) => {
    const m = b.match(/^\*\*(A\d+)\s+—\s+(.+?)\*\*/);
    if (!m) return null;
    const status = (b.match(/`([^`]+)`/) ?? [])[1] ?? "untested";
    const dates = [...b.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((x) => x[0]).sort();
    const last = dates.pop() ?? null;
    return { id: m[1], title: plain(m[2]).replace(/\.$/, ""), status, last };
  })
  .filter((x) => x && x.last && x.last >= cutoff)
  .sort((a, b) => b.last.localeCompare(a.last));

// ---- numbers -----------------------------------------------------------------

const all = [...board.done, ...board.realGreen, ...board.mockGreen, ...board.active, ...board.backlog];
const realGreen = all.filter((s) => s.state === "real-green");
const current = versions[versions.length - 1];

const dated = board.done.filter((s) => s.date).map((s) => s.date).sort();
const fortnight = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
const recent = dated.filter((d) => d >= fortnight).length;
const perWeek = recent / 2;
const openHeading = roadmap.find((r) => /open/.test(r.heading));
const remaining = openHeading ? openHeading.items.filter((i) => i.title && !i.landed).length : 0;
const forecastDays = perWeek > 0 ? Math.ceil((remaining / perWeek) * 7) : null;
const forecast = forecastDays == null ? null : new Date(Date.now() + forecastDays * 864e5).toISOString().slice(0, 10);

let liveness = { target: "≤ 48 h", lastRun: null, unread: null, quotes: null, dataset: null };
{
  const dataRoot = join(root, "..", "permit-rulebook-data");
  if (existsSync(join(dataRoot, "watch/state.json"))) {
    const st = JSON.parse(readFileSync(join(dataRoot, "watch/state.json"), "utf8"));
    liveness.lastRun = st.last_run ?? null;
    liveness.unread = Array.isArray(st.unread) ? st.unread.length : null;
  }
  if (existsSync(join(dataRoot, "data/dataset.json"))) {
    const ds = JSON.parse(readFileSync(join(dataRoot, "data/dataset.json"), "utf8"));
    liveness.dataset = ds.dataset_version ?? null;
    liveness.quotes = JSON.stringify(ds).match(/"retrieved_at":/g)?.length ?? null;
  }
}

// ---- the spine: slices in delivery order, versions as milestones -------------

// Delivery order is the date; the ledger's column order (newest first, so
// reversed) breaks ties. A stamp follows the last slice of its own day.
const spine = [...board.done]
  .reverse()
  .map((s, i) => ({ ...s, i }))
  .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.i - b.i);
const items = [];
let vi = 0;
for (let k = 0; k < spine.length; k++) {
  const s = spine[k];
  items.push({ kind: "slice", ...s });
  const next = spine[k + 1];
  while (
    vi < versions.length && versions[vi].date && s.date &&
    versions[vi].date >= s.date && (!next?.date || versions[vi].date < next.date)
  ) items.push({ kind: "version", ...versions[vi++] });
}
while (vi < versions.length) items.push({ kind: "version", ...versions[vi++] });
for (const s of [...board.realGreen, ...board.mockGreen, ...board.active]) items.push({ kind: "slice", ...s });

// ---- render ------------------------------------------------------------------

const MARK = { "real-green": "●", "mock-green": "◐", done: "○", active: "◔" };
const sliceHtml = (s) => `
<li class="slice ${s.state}">
  <span class="mark" aria-hidden="true">${MARK[s.state] ?? "○"}</span>
  <div>
    <h3>${esc(s.title)}${s.locked ? ' <span class="lock" title="touches identity, money or personal data">🔒</span>' : ""}</h3>
    <p class="meta"><code>${esc(s.id)}</code> · ${s.state}${s.date ? ` · ${s.date}` : ""}</p>
    ${s.proof ? `<p class="proof">${esc(s.proof)}</p>` : ""}
  </div>
</li>`;
const versionHtml = (v) => `
<li class="milestone">
  <span class="stamp">${esc(v.id)}</span>
  <div><p class="meta">${v.date ?? "undated"}</p><p>${esc(v.can)}</p></div>
</li>`;

const html = `<title>Permit Rulebook Road</title>
<style>
:root{--bg:#f1eee4;--card:#fbf9f2;--ink:#2b2a22;--muted:#5a5747;--line:#d9d3c0;--stamp:#8c2b2b;--met:#2e5b3f;--met-soft:#e4efe7;--near:#8a5a19;--near-soft:#f4ecd8;--hold:#6a6759;--hold-soft:#edeadf;--band:#31519a;--band-soft:#e2e8f6;
--serif:Cambria,Georgia,serif;--sans:"Segoe UI",system-ui,sans-serif;--mono:Consolas,"Cascadia Mono",monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1d1c17;--card:#26251f;--ink:#ece8da;--muted:#b3ad98;--line:#3f3c31;--stamp:#d8776f;--met:#8ec9a3;--met-soft:#22352a;--near:#d9ac5f;--near-soft:#3a2f18;--hold:#a5a08c;--hold-soft:#2d2c25;--band:#93a9e6;--band-soft:#252c3f}}
:root[data-theme="dark"]{--bg:#1d1c17;--card:#26251f;--ink:#ece8da;--muted:#b3ad98;--line:#3f3c31;--stamp:#d8776f;--met:#8ec9a3;--met-soft:#22352a;--near:#d9ac5f;--near-soft:#3a2f18;--hold:#a5a08c;--hold-soft:#2d2c25;--band:#93a9e6;--band-soft:#252c3f}
body{background:var(--bg);color:var(--ink);font:15px/1.6 var(--sans);margin:0}
main{max-width:56rem;margin:0 auto;padding:2rem 1.2rem 4rem}
h1,h2,h3{font-family:var(--serif);font-weight:400;text-wrap:balance;margin:0}
h1{font-size:2.2rem;line-height:1.2}
h2{font-size:1.4rem;border-top:3px double var(--ink);padding-top:.6rem;margin-top:2.6rem}
h3{font-size:1.08rem;font-weight:700}
.eyebrow{font:700 .7rem var(--sans);letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
p{margin:.35rem 0;max-width:40rem}
code,.meta{font-family:var(--mono);font-size:.8rem}
.meta{color:var(--muted)}
.numbers{display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:.85rem;margin-top:1.4rem}
.numbers div{background:var(--card);border-top:3px solid var(--ink);padding:.8rem 1rem}
.numbers b{display:block;font:400 1.9rem/1.1 var(--serif);font-variant-numeric:tabular-nums}
.numbers small{color:var(--muted)}
.legend{display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;margin:.9rem 0 0;padding:0;list-style:none;color:var(--muted);font-size:.85rem}
.spine{list-style:none;margin:1rem 0 0;padding:0;border-left:7px solid var(--hold-soft)}
.spine li{display:grid;grid-template-columns:1.1rem 1fr;gap:.6rem;padding:.7rem 0 .7rem .5rem;position:relative}
.spine .mark{font-size:1.1rem;line-height:1.3;margin-left:-1.25rem;background:var(--bg);width:1.3rem;text-align:center}
.real-green .mark{color:var(--met)}.mock-green .mark{color:var(--near)}.done .mark,.active .mark{color:var(--hold)}
.proof{color:var(--muted);font-size:.92rem}
.lock{font-size:.8rem}
.milestone{background:var(--card);border-top:3px solid var(--ink);border-bottom:1px solid var(--line);margin:.6rem 0 .6rem -7px;padding-left:.9rem}
.stamp{align-self:start;justify-self:start;margin-left:-1.6rem;font:600 .8rem var(--mono);color:var(--stamp);border:2.5px solid var(--stamp);padding:.15rem .4rem;transform:rotate(-6deg);background:var(--bg)}
.wide{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:.9rem;margin-top:.8rem}
th{text-align:left;font:700 .7rem var(--sans);letter-spacing:.18em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line);padding:.4rem .5rem}
td{vertical-align:top;border-bottom:1px dotted var(--line);padding:.5rem}
td:first-child{font-family:var(--mono);white-space:nowrap}
.roadmap h3{margin-top:1.2rem}
.roadmap ul{margin:.3rem 0;padding-left:1.2rem}
.roadmap .group{font:700 .7rem var(--sans);letter-spacing:.18em;text-transform:uppercase;color:var(--muted);list-style:none;margin:.5rem 0 0 -1.2rem}
.landed{color:var(--met)}
.bets td:nth-child(3){font-family:var(--mono);font-size:.8rem}
a{color:var(--band)}
:focus-visible{outline:2px solid var(--band);outline-offset:2px}
</style>
<main>
<p class="eyebrow">Permit Rulebook · drawn from the ledgers on ${today}</p>
<h1>The road</h1>
<p>STATUS shows the position and KANBAN the board; this page shows the journey. Generated by <code>scripts/road.mjs</code>, never edited by hand — where it and <code>KANBAN.md</code> disagree, KANBAN wins.</p>

<div class="numbers">
  <div><small>current version</small><b>${esc(current?.id ?? "—")}</b><small>${current?.date ?? ""}</small></div>
  <div><small>slices real-green</small><b>${realGreen.length} <span style="font-size:1rem;color:var(--muted)">of ${all.length}</span></b><small>on the board</small></div>
  <div><small>dataset liveness</small><b>${liveness.unread === 0 ? "every source read" : liveness.unread == null ? "—" : `${liveness.unread} unread`}</b><small>target ${liveness.target} · watch ran ${liveness.lastRun ?? "—"} · dataset ${liveness.dataset ?? "—"}</small></div>
  <div><small>pace</small><b>${perWeek.toFixed(1)} <span style="font-size:1rem;color:var(--muted)">/ week</span></b><small>${recent} slices real-green in the last 14 days</small></div>
</div>

<ul class="legend">
  <li>● real-green — the scenario passed for real, on the human's word</li>
  <li>◐ mock-green — passed on mocks</li>
  <li>◔ active</li>
  <li>○ done before the marks existed</li>
  <li>🔒 touches identity, money or personal data (from the ledger's own words)</li>
</ul>

<h2>The spine</h2>
<p class="meta">every slice in delivery order; a version stamp sits between the slices it closed</p>
<ol class="spine">${items.map((i) => (i.kind === "version" ? versionHtml(i) : sliceHtml(i))).join("")}
</ol>

<h2>How a slice closes</h2>
<p>A scenario in the human's language is approved before any code. A builder makes it green in a worktree and never touches the ledgers. Two reviewers read the diff — one against the standards, one against the scenario — and the review is recorded with the commit it read. The session walks the preview; the human walks it. Then one word, <em>merge</em>: the merge is the deploy, the live read is the proof, and the slice is real-green. Fixes ride under the open version; the stamp comes when the last candidate lands.</p>

<h2>Versions</h2>
<div class="wide"><table>
<thead><tr><th>version</th><th>date</th><th>what it can do</th><th>what is not in it</th></tr></thead>
<tbody>${versions.map((v) => `<tr><td>${esc(v.id)}</td><td>${v.date ?? "—"}</td><td>${esc(v.can)}</td><td>${esc(v.not)}</td></tr>`).join("\n")}</tbody>
</table></div>

<h2>Pace and forecast</h2>
<p>${recent} slices reached real-green in the 14 days before ${today} — ${perWeek.toFixed(1)} a week (source: the dated <code>real-green</code> lines in <code>KANBAN.md</code>'s done column). ${openHeading ? `<strong>${esc(openHeading.heading)}</strong> lists ${remaining} items still to land (source: the roadmap heading in <code>KANBAN.md</code>)${forecast ? `; at this pace the last lands around <strong>${forecast}</strong>` : ""}. The stamp is Spine's when the last item is live; if that day is a scheduled reading, one isolated walk serves both.` : ""}</p>
<p class="meta">A pace from a fortnight of dense slice days overstates a steward month; read it as a ceiling.</p>

<h2>Roadmap by version</h2>
<div class="roadmap">${roadmap.map((r) => `
<h3>${esc(r.heading)}</h3>
<ul>${r.items.map((i) => (i.group ? `<li class="group">${esc(i.group)}</li>` : `<li${i.landed ? ' class="landed"' : ""}>${esc(i.title)}${i.landed ? " — landed" : ""}</li>`)).join("")}</ul>`).join("")}
</div>

<h2>Bets touched lately</h2>
<p class="meta">assumptions with a dated line in the last 45 days (source: <code>docs/spine/assumptions.md</code>)</p>
<div class="wide"><table class="bets">
<thead><tr><th>bet</th><th>claim</th><th>status</th><th>last touched</th></tr></thead>
<tbody>${bets.map((b) => `<tr><td>${esc(b.id)}</td><td>${esc(b.title)}</td><td>${esc(b.status)}</td><td>${b.last}</td></tr>`).join("\n")}</tbody>
</table></div>
</main>
`;

writeFileSync(join(root, "docs/spine/road.html"), html);
console.log(`road: ${current?.id} · ${realGreen.length}/${all.length} real-green · ${items.filter((i) => i.kind === "slice").length} slices, ${versions.length} stamps · ${bets.length} bets · pace ${perWeek.toFixed(1)}/wk`);
