import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { deriveBands, fieldOptions, fillRouteSlots, type Dataset, type Profile } from "permit-rulebook-data";
import { glossed } from "../src/lib/gloss.js";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";
import type { Sent } from "./wire.js";

/**
 * The interview walked in headless Chrome over the built page: what the
 * browser suites that answer it question by question share, so a walk is
 * written once and every suite walks it the same way.
 */
const ds = rawDataset as unknown as Dataset;

/** The built site the walks are served from. */
const dist = fileURLToPath(new URL("../dist", import.meta.url));

const { chromePath } = await import("../scripts/browser/browser.mjs");
const { serve, withBrowser } = await import("../scripts/browser/browser.mjs");

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

/** The page `scripts/browser/browser.mjs` hands a walk. */
export interface BrowserPage {
  /** Navigates and returns once the new document has drawn. */
  goto(url: string): Promise<void>;
  /** Navigates and returns at once, for a read before the page's script runs. */
  navigate(url: string): Promise<void>;
  evaluate(expression: string): Promise<string>;
  /** Reads `condition` in the page until it holds, and returns its value. */
  waitUntil(condition: string, what: string): Promise<unknown>;
  /** Returns once nothing animates, scrolls or loads. */
  waitUntilAtRest(): Promise<void>;
  /** After a gesture that loads a document: once a document other than the one left has drawn. */
  waitUntilNewDocumentDrawn(): Promise<void>;
  emulateMedia(features: { name: string; value: string }[]): Promise<void>;
  /** A click at a point, returned once the page has reported its first input or another document stands. */
  clickAt(x: number, y: number): Promise<void>;
  /** Enter pressed and released, returned as `clickAt` is. */
  pressEnter(): Promise<void>;
  type(text: string): Promise<void>;
  back(): Promise<void>;
  forward(): Promise<void>;
  /** What this tab has thrown or logged as an error since its last navigation. */
  problems(): string[];
  /** Every request the page made, when the browser was asked to watch. */
  requests(): Sent[];
  forgetRequests(): void;
  /** A second tab on the same browser: the same origin's storage, a history of its own. */
  openTab(): Promise<BrowserPage>;
  front(): Promise<void>;
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

/** The beat in milliseconds, as the built stylesheet carries it, in either
 * unit (`tokens.css` says why). */
export const BEAT_MS = `(() => {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--motion-beat").trim();
  return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
})()`;

/**
 * Returns once the beat of the card on the screen is over, by the page's own
 * clock: the moment this read sees the card, plus the page's beat. A card
 * shows only once it is drawn, and its beat begins as it is drawn. A page
 * without the beat's token fails here rather than waiting nothing.
 */
export async function waitUntilPastTheBeat(page: Pick<BrowserPage, "evaluate" | "waitUntil">): Promise<void> {
  const seenAt = Number(await page.evaluate("performance.now()"));
  const beatMs = Number(await page.evaluate(BEAT_MS));
  if (!(beatMs > 0)) throw new Error("the page declares no --motion-beat");
  await page.waitUntil(`performance.now() >= ${seenAt + beatMs}`, "the page's clock never passed the beat");
}

/** The page as a gesture and an answer drive it. */
type GesturedPage = Pick<BrowserPage, "evaluate" | "waitUntil" | "waitUntilAtRest">;

/** Opens `url` and returns once the page has drawn and come to rest. */
export async function openAtRest(page: Pick<BrowserPage, "goto" | "waitUntilAtRest">, url: string): Promise<void> {
  await page.goto(url);
  await page.waitUntilAtRest();
}

/** Evaluates `expression`, a gesture that stays on the page, and returns its value once the page is at rest. */
export async function evaluateAtRest(page: GesturedPage, expression: string): Promise<string> {
  const value = await page.evaluate(expression);
  await page.waitUntilAtRest();
  return value;
}

/** An answer, tapped once the card's beat is over, returned once the page is at rest. */
export async function answerWith(page: GesturedPage, expression: string): Promise<string> {
  await waitUntilPastTheBeat(page);
  return evaluateAtRest(page, expression);
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

/** The screen as a reader tells one from the next: which screen, and its question. */
export const SCREEN_SHOWN = `${STATE} + " " + ${QLABEL}`;

/**
 * Runs `pickExpression` once, which says "opt" or "row" for what it tapped or
 * why it tapped nothing: "moved" when the screen moved on, or why it did not.
 * A pick that takes moves the screen in the same task, so a screen still where
 * it was is a refused pick.
 */
const pickOnceAndSayWhetherMoved = (pickExpression: string) => `(() => {
  const before = ${SCREEN_SHOWN};
  const how = ${pickExpression};
  if (how !== "opt" && how !== "row") return how;
  return ${SCREEN_SHOWN} !== before ? "moved" : "the tap was refused after the beat";
})()`;

/** Answers the question on the screen by `pickExpression` once its beat is
 * over, and returns once the screen has moved on and the page is at rest. A
 * refused answer throws, named by `what`. */
export async function answerOnce(page: GesturedPage, pickExpression: string, what: string): Promise<void> {
  await waitUntilPastTheBeat(page);
  const how = await page.evaluate(pickOnceAndSayWhetherMoved(pickExpression));
  if (how !== "moved") throw new Error(`${what}: ${how}`);
  await page.waitUntilAtRest();
}

/** Answers the question on the screen with `value` once its beat is over,
 * and returns once the screen has moved on and the page is at rest. */
export async function answer(page: GesturedPage, field: string, value: string): Promise<void> {
  const name = fieldOptions(ds, field).find((o) => o.value === value)?.label ?? value;
  await answerOnce(page, pick(value, name), `${field} = ${value}`);
}

/** "Turkey" typed into the passport search, as its `input` event commits it, and the first row it draws picked. */
export const PICK_TURKEY = '(() => { const i = document.querySelector("#cfilter"); i.value = "Turkey"; i.dispatchEvent(new Event("input", { bubbles: true })); document.querySelector(".clist [role=option]").click(); })()';

/** The field of the question on the screen, from its label as the card draws
 * it: the first words on the card, glossed on the card's own memory (#156),
 * with any route it names said in full (#159). */
export async function fieldOnScreen(page: BrowserPage): Promise<string> {
  const label = await page.evaluate(QLABEL);
  const field = ds.fields.find((f) => glossed(fillRouteSlots(f.label, ds), new Set()) === label)?.id;
  if (!field) throw new Error(`no field for the question "${label}"`);
  return field;
}

/** The script that puts a record of `answers` on the device, asked in the
 * order `history` gives (the answers' own order by default), as the page
 * writes one. */
export const recordSeedScript = (answers: Profile, history: string[] = Object.keys(answers)): string =>
  `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(serialize(answers, history))})`;

/** The interview's first screen, with nothing on the record. */
export async function openCold({ page, url }: PageOnSite): Promise<void> {
  await page.goto(url("/404.html"));
  await page.evaluate("localStorage.clear()");
  await page.goto(url("/"));
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

/** A real tap at the centre of the element, scrolled into view first: the
 * platform's own input, which CLS does not count a shift after. */
export async function tapOn(page: BrowserPage, selector: string): Promise<void> {
  const at = JSON.parse(await page.evaluate(`JSON.stringify((() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  })())`)) as { x: number; y: number } | null;
  if (!at) throw new Error(`nothing on the page matches ${selector}`);
  await page.clickAt(at.x, at.y);
}
