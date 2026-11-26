import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { deriveBands, fillRouteSlots, type Dataset, type Profile } from "permit-rulebook-data";
import { glossed } from "../src/lib/gloss.js";
import { chromePath, walkSite, type BrowserPage, type PageOnSite, type Screen } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page/interview-page.mjs";
import { whyNoBuild } from "./why-no-build.js";

/**
 * The interview walked in headless Chrome over the built page: what the
 * browser suites that answer it question by question share, so a walk is
 * written once and every suite walks it the same way.
 */
const ds = rawDataset as unknown as Dataset;

/** The built site the walks are served from. */
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/** Why Chrome cannot open a page here, or null when it can. */
export function whyNoChrome(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  return null;
}

/** Why the browser cannot walk here: no Chrome, or no build. Null when it can. */
export function skipReason(): string | null {
  return whyNoChrome() ?? whyNoBuild("dist/");
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

/** Walks the built site on `screen`, handing `run` the page on the site, and
 * returns what `run` returned. The walk fails on an error thrown or logged on
 * any page it opened, in any tab, naming that page's address and the error,
 * so a browser case writes no check of its own for it. */
export async function withSite<T>(run: (site: PageOnSite) => Promise<T>, screen: Screen): Promise<T> {
  const { returned } = await walkSite({ site: { folder: dist }, screen }, run);
  return returned;
}

/** In the page: the beat in milliseconds, as the built stylesheet carries it,
 * in either unit (`tokens.css` says why). */
function readBeatMs(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--motion-beat").trim();
  return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
}

/** The beat in milliseconds, read in the page: the expression a case evaluates or writes into its own probe. */
export const BEAT_MS = `(${readBeatMs})()`;

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

/** In the page: opens the ledger and taps the ✎ of `field`'s row, found by its field, never by its words; with
 * `scrollToRow`, scrolls the row to the middle of the viewport first. */
function tapPencilInPage(field: string, { scrollToRow }: { scrollToRow: boolean }): void {
  (document.getElementById("decl") as HTMLDetailsElement).open = true;
  const row = document.querySelector<HTMLElement>(`#decl-list [data-field="${field}"]`)!;
  if (scrollToRow) row.scrollIntoView({ block: "center" });
  row.click();
}

/** Taps the ledger's ✎ on `field`'s row, the ledger opened first, the way a reader reaches it, and returns at once;
 * with the option `scrollToRow`, the row is scrolled to the middle of the viewport before the tap. */
export async function tapPencil(page: Pick<BrowserPage, "evaluate">, field: string, { scrollToRow = false } = {}): Promise<void> {
  await page.evaluate(`(${tapPencilInPage})(${JSON.stringify(field)}, ${JSON.stringify({ scrollToRow })})`);
}

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

/** The page as an answer drives it: a gesture's page, the address it opens, and the reader's own gestures
 * `InterviewPage` may make on it. */
type AnsweringPage = GesturedPage & Pick<BrowserPage, "goto" | "tapOn" | "type" | "pressEnter">;

/** Answers the question on the screen with `value` once its beat is over,
 * and returns once the screen has moved on and the page is at rest. */
export async function answer(page: AnsweringPage, field: string, value: string): Promise<void> {
  await new InterviewPage({ page }).answer(field, value);
}

/** The field of the question on the screen, from its label as the card draws
 * it: the first words on the card, glossed on the card's own memory (#156),
 * with any route it names said in full (#159). */
export async function fieldOnScreen(page: BrowserPage): Promise<string> {
  const label = (await new InterviewPage({ page }).readScreen()).question;
  const field = ds.fields.find((f) => glossed(fillRouteSlots(f.label, ds), new Set()) === label)?.id;
  if (!field) throw new Error(`no field for the question "${label}"`);
  return field;
}

/** The interview's first screen, with nothing on the record. */
export async function openCold(site: PageOnSite): Promise<void> {
  await new InterviewPage(site).open();
}

/**
 * From a cold start, answers whatever question is on the screen from the
 * reader's profile until `target` is on the screen, and stops there,
 * unanswered. Hands back the fields answered, in order.
 */
export async function walkTo(site: PageOnSite, reader: Profile, target: string): Promise<string[]> {
  const { page } = site;
  const interview = new InterviewPage(site);
  await interview.open();
  const asked: string[] = [];
  for (let i = 0; i < 30; i++) {
    if ((await interview.readScreen()).screen === "results") throw new Error(`the verdict came before ${target}; asked ${asked.join(", ")}`);
    const field = await fieldOnScreen(page);
    if (field === target) return asked;
    const value = reader[field];
    if (value === undefined) throw new Error(`the reader has no answer for ${field}`);
    await answer(page, field, value);
    asked.push(field);
  }
  throw new Error(`${target} was never asked; asked ${asked.join(", ")}`);
}
