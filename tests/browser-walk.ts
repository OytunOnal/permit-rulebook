import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { deriveBands, fieldOptions, type Dataset, type Profile } from "permit-rulebook-data";

/**
 * The interview walked in headless Chrome over the built page: what the
 * browser suites that answer it question by question share, so a walk is
 * written once and every suite walks it the same way.
 */
const ds = rawDataset as unknown as Dataset;

/** The built site the walks are served from. */
const dist = fileURLToPath(new URL("../dist", import.meta.url));

const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

/** Why the browser cannot walk here: no Chrome, or no build. Null when it can. */
export function skipReason(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}

/** Says, loudly, that a suite's walk did not run, so a skipped suite is not
 * read as a passing one. */
export function warnNotWalked(what: string, reason: string): void {
  process.stderr.write([
    "",
    `  !! ${what}, NOT WALKED IN A BROWSER: ${reason}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));
}

/** The page `scripts/browser.mjs` hands a walk. */
export interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  emulateMedia(features: { name: string; value: string }[]): Promise<void>;
  clickAt(x: number, y: number): Promise<void>;
  pressEnter(): Promise<void>;
  type(text: string): Promise<void>;
  back(): Promise<void>;
  problems(): string[];
}

/** A browser page and the address of the site it is on, which every walk
 * takes together. */
export interface PageOnSite { page: BrowserPage; url: (path: string) => string }

interface Screen { viewport: { width: number; height: number }; mobile: boolean }

/** Serves the built site, opens a browser on `screen`, and hands `run` the
 * page on the site; the browser and the server close after it. */
export async function withSite<T>(run: (site: PageOnSite) => Promise<T>, screen: Screen): Promise<T> {
  const server = await serve(dist);
  try {
    return await withBrowser((page: BrowserPage) => run({ page, url: server.url }), screen);
  } finally {
    server.close();
  }
}

/** The desktop, where the declared panel stands open beside the question. */
export const DESK = { viewport: { width: 1280, height: 900 }, mobile: false };
/** A phone. */
export const PHONE = { viewport: { width: 390, height: 844 }, mobile: true };

export const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The beat in milliseconds, as the built stylesheet carries it, in either
 * unit (`tokens.css` says why). */
const BEAT_MS = `(() => {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--motion-beat").trim();
  return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
})()`;

/** The beat's length in milliseconds. A page without the token fails here
 * rather than waiting nothing. */
export async function beatMsOf(page: BrowserPage): Promise<number> {
  const ms = Number(await page.evaluate(BEAT_MS));
  if (!(ms > 0)) throw new Error("the page declares no --motion-beat");
  return ms;
}

/** Past the beat, with room for a frame or two. */
export async function waitOutTheBeat(page: BrowserPage): Promise<void> {
  await settle((await beatMsOf(page)) + 150);
}

/** The label of the question on the screen, or "" where none is. */
export const QLABEL = '(() => { const h = document.querySelector("#main .qcard .qlabel"); return h ? h.textContent.trim() : ""; })()';
/** Which screen the interview is on. */
const STATE = 'document.getElementById("app").dataset.state';

/** A band in the middle of a money field's ladder, for a reader who knows. */
export const middleBandOf = (field: string): string => {
  const bands = deriveBands(ds, field);
  return bands[Math.floor(bands.length / 2)]!.id;
};
/** A money field's top band. */
export const topBandOf = (field: string): string => {
  const bands = deriveBands(ds, field);
  return bands[bands.length - 1]!.id;
};

/** Picks `value` on the question on the screen: its button, or — on the
 * search — the row the option's own name finds. */
const pick = (value: string, searchFor: string) => `(() => {
  const opt = document.querySelector(${JSON.stringify(`#main .qcard .opt[data-value='${value}']`)});
  if (opt) { opt.click(); return "opt"; }
  const input = document.querySelector("#cfilter");
  if (!input) return "no option";
  input.value = ${JSON.stringify(searchFor)};
  input.dispatchEvent(new Event("input", { bubbles: true }));
  const row = document.querySelector(${JSON.stringify(`#clist .copt[data-value='${value}']`)});
  if (!row) return "no row";
  row.click();
  return "row";
})()`;

/** Answers the question on the screen with `value`, then waits out the beat
 * of the card it draws. */
export async function answer(page: BrowserPage, field: string, value: string): Promise<void> {
  const name = fieldOptions(ds, field).find((o) => o.value === value)?.label ?? value;
  const how = await page.evaluate(pick(value, name));
  if (how !== "opt" && how !== "row") throw new Error(`${field} = ${value}: ${how}`);
  await waitOutTheBeat(page);
}

/** The field of the question on the screen, from its label. */
async function fieldOnScreen(page: BrowserPage): Promise<string> {
  const label = await page.evaluate(QLABEL);
  const field = ds.fields.find((f) => f.label === label)?.id;
  if (!field) throw new Error(`no field for the question "${label}"`);
  return field;
}

/** The interview's first screen, with nothing on the record. */
export async function openCold({ page, url }: PageOnSite): Promise<void> {
  await page.goto(url("/404.html"), 300);
  await page.evaluate("localStorage.clear()");
  await page.goto(url("/"), 1200);
}

/**
 * From a cold start, answers whatever question is on the screen from the
 * reader's profile until `target` is on the screen, and stops there,
 * unanswered. Hands back the fields answered, in order.
 */
export async function walkTo(site: PageOnSite, reader: Profile, target: string): Promise<string[]> {
  const { page } = site;
  await openCold(site);
  const asked: string[] = [];
  for (let i = 0; i < 30; i++) {
    if ((await page.evaluate(STATE)) === "results") throw new Error(`the verdict came before ${target}; asked ${asked.join(", ")}`);
    const field = await fieldOnScreen(page);
    if (field === target) return asked;
    const value = reader[field];
    if (value === undefined) throw new Error(`the reader has no answer for ${field}`);
    await answer(page, field, value);
    asked.push(field);
  }
  throw new Error(`${target} was never asked; asked ${asked.join(", ")}`);
}

/** A layout-shift observer, counting what CLS counts, from the page's load. */
export const WATCH_SHIFTS = `(() => {
  window.__cls = 0;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
  }).observe({ type: "layout-shift", buffered: true });
  return "watching";
})()`;
