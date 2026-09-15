/**
 * One measurement, and the gate on a roadmap candidate.
 *
 * Four sources refuse this project's fetcher, each in its own way: Legifrance
 * answers 403, EUR-Lex answers 202 with an empty body, the IND hands back a
 * page of navigation with no rules in it, and Spain's UGE pages answer a
 * developer machine but not GitHub's runner. All four open in a real browser
 * on a laptop. The candidate on the roadmap is a `browser` watch strategy, and
 * it has been gated since 2026-09-10 on one thing nobody had measured:
 * **whether headless Chrome from the CI runner is let through where `fetch` is
 * refused** — a wall that passes a headed browser on a home connection may
 * still refuse a datacentre IP, and if it does, the strategy buys nothing.
 *
 * This script is the measurement and nothing else. It writes no file, changes
 * no source, and is meant to be deleted with the decision it informs.
 *
 * Run: node scripts/bot-wall.mjs [--data <dir>]
 */
import { withBrowser } from "./browser.mjs";
import { readFileSync } from "node:fs";
import { argv, env } from "node:process";

/** Where the ruleset sits, so the URLs come from the watchlist and not from memory. */
const dataDir = (() => {
  const at = argv.indexOf("--data");
  return at >= 0 ? argv[at + 1] : env.DATA_DIR ?? "../permit-rulebook-data";
})();

const watchlist = JSON.parse(readFileSync(`${dataDir}/watch/watchlist.json`, "utf8"));
const urlOf = (id) => {
  const entry = watchlist.entries.find((e) => e.id === id);
  if (!entry) throw new Error(`no watch entry ${id} — the watchlist moved under this script`);
  return entry.url;
};

/**
 * The walls, and the sentence each one is supposed to be hiding.
 *
 * The needle is a fragment this project already quotes from that page, or —
 * where the page is a PDF, which Chrome renders in a viewer rather than as
 * text — `null`, meaning the status is all this measurement can honestly read.
 */
const WALLS = [
  { id: "legifrance-ce-algerian-titles", needle: "Il suit de là", why: "403 to fetch (2026-09-10)" },
  { id: "eur-lex-blue-card-directive", needle: "third-country nationals", why: "202 with an empty body (2026-09-10)" },
  { id: "nl-ind-highly-skilled-migrant", needle: "recognised sponsor", why: "200 carrying only navigation (2026-09-15)" },
  { id: "es-uge-index", needle: "umbral", why: "unreachable from the runner, fine from a laptop (2026-09-11..15)" },
  { id: "es-uge-umbral-pdf", needle: null, why: "unreachable from the runner; a PDF, so status only" },
];

const rows = [];
await withBrowser(async (page) => {
  for (const wall of WALLS) {
    const url = urlOf(wall.id);
    let landed = "—";
    let title = "";
    let chars = 0;
    let found = "—";
    let note = "";
    try {
      // A wall can take its time deciding to refuse: give the page longer than
      // the interview needs, and read whatever arrived.
      await page.goto(url, 4000);
      // The status code is not read here. `browser.mjs` records requests, not
      // responses, and changing a driver three test files depend on for one
      // throwaway measurement is the wrong trade. What a refusal looks like is
      // legible anyway: the title says "403 Forbidden" or carries a challenge,
      // or the address moved somewhere this script did not ask for.
      landed = (await page.evaluate("location.href")) ?? "";
      title = ((await page.evaluate("document.title")) ?? "").slice(0, 60);
      const text = (await page.evaluate("document.body ? document.body.innerText : ''")) ?? "";
      chars = text.length;
      if (wall.needle !== null) found = text.includes(wall.needle) ? "yes" : "NO";
      const problems = page.problems();
      if (problems.length) note = problems[0].slice(0, 70);
    } catch (e) {
      note = `threw: ${String(e).slice(0, 70)}`;
    }
    rows.push({ id: wall.id, url, landed, title, chars, needle: wall.needle ?? "(pdf)", found, why: wall.why, note });
  }
}, { viewport: { width: 1280, height: 900 }, mobile: false });

const line = (r) => `| ${r.id} | ${r.title || "(no title)"} | ${r.chars} | ${r.found} | ${r.note || ""} |`;
const table = [
  "| source | page title | innerText chars | sentence found | note |",
  "|---|---|---|---|---|",
  ...rows.map(line),
].join("\n");

console.log(table);
console.log("");
for (const r of rows) console.log(`${r.id}: ${r.why} · needle ${JSON.stringify(r.needle)} · ${r.url}`);

// The verdict this run exists to give, stated rather than left to a reader of
// the table: the strategy is worth building only if a wall that refuses fetch
// hands a headless browser the sentence.
const readable = rows.filter((r) => r.found === "yes");
console.log("");
console.log(readable.length
  ? `A headless browser read ${readable.length} of ${rows.length} walls: ${readable.map((r) => r.id).join(", ")}.`
  : "A headless browser read none of the walls — the strategy buys nothing from this runner.");

if (env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(env.GITHUB_STEP_SUMMARY,
    `## Bot walls, read by headless Chrome from this runner\n\n${table}\n\n`
    + (readable.length
      ? `**${readable.length} of ${rows.length}** handed the browser the sentence they refuse \`fetch\`.\n`
      : `**None** of the walls opened. The browser strategy buys nothing from this runner.\n`));
}
