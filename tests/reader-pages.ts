import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import {
  DESTINATION_FIELD, SITUATION_FIELD, fieldOptions, remainingQuestions,
  type Dataset, type Notice, type Profile, type Question,
} from "permit-rulebook-data";
import { glossed } from "../src/lib/gloss.js";
import { questionCardHtml } from "../src/lib/question.js";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";
import { WidthFailure, type PageOnSite } from "../scripts/browser/browser.mjs";

/**
 * Every page the build draws from the shipped dataset, as a reader meets it:
 * the walk the decisions of #151 are asserted over (seam 2). The static pages
 * are read from `dist/` as they ship; the question cards are drawn by the one
 * renderer the build and the module share; the results and the arrival line
 * are drawn by the module in a browser over `dist/`.
 */

const ds = rawDataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/** One page or screen of the walk, and where it was read. */
export interface ReaderPage {
  where: string;
  html: string;
}

/** Every HTML page the build wrote: the home page, each country page, each
 * route page, `/data/` and the rest. Throws where there is no build. */
export function builtPages(): ReaderPage[] {
  if (!existsSync(dist)) throw new Error("no dist/ — run npm run build first");
  const pages: ReaderPage[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 6) return;
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path, depth + 1);
      else if (name.endsWith(".html"))
        pages.push({ where: `/${relative(dist, path).split("\\").join("/")}`, html: readFileSync(path, "utf8") });
    }
  };
  walk(dist, 0);
  return pages;
}

/** The destination answer that asks for every country at once. */
export const EVERY_DESTINATION = "all";

/** The field the interview asks the reader's passport on. */
const PASSPORT_FIELD = "citizenship";

/** The passport a walk takes unless it is given another: a real one that no
 * Notice names, so its results are the routes' alone. */
export const DEFAULT_PASSPORT = "IN";

/** The passport a reader gives that meets `named`: that passport, or, where
 * `named` is a class of passports, the first passport in it. */
function passportMeeting(named: string): string {
  const options = fieldOptions(ds, PASSPORT_FIELD);
  const option = options.find((o) => o.value === named) ?? options.find((o) => o.implies?.includes(named));
  if (!option) throw new Error(`precondition: a passport meets "${named}", which a Notice names`);
  return option.value;
}

/** A passport for each passport or class a Notice's condition names, read
 * from the dataset, each once. */
export function noticePassports(): string[] {
  const named = (ds.notices ?? [])
    .filter((notice) => notice.when.field === PASSPORT_FIELD)
    .flatMap((notice) => (notice.when.value === undefined ? notice.when.values ?? [] : [notice.when.value]));
  return [...new Set(named.map(passportMeeting))];
}

/** The answer a walk gives a question: `passport` for the passport, and
 * otherwise the first option that is neither "I don't know" nor the fallback. */
const walkAnswerWith = (passport: string) => (question: Question): string => {
  if (question.field === PASSPORT_FIELD) return passport;
  return (question.options.find((o) => !o.is_unknown && !o.is_fallback) ?? question.options[0]!).value;
};

/** One reader's whole interview, in the order it is asked. */
export interface Walk {
  answers: Profile;
  order: string[];
}

/**
 * The interview from `start` to its end: each question it still asks, in the
 * order it asks them, answered by `answerOf`. Hands back every answer, and the
 * fields answered after `start` in order. Throws where the interview does not
 * end, so a walk never stops short of the verdict unnoticed.
 */
export function walkFrom(start: Profile, answerOf: (question: Question) => string): Walk {
  const answers: Profile = { ...start };
  const order: string[] = [];
  for (let i = 0; i < 40; i++) {
    const next = remainingQuestions(ds, answers)[0];
    if (!next) return { answers, order };
    answers[next.field] = answerOf(next);
    order.push(next.field);
  }
  throw new Error(`precondition: the interview ends for ${JSON.stringify(start)}`);
}

/** A whole interview for every destination answer under every situation a
 * reader can hold, taken with `passport`: each question card and each results
 * screen the dataset can draw for them. */
export function walks(passport = DEFAULT_PASSPORT): Walk[] {
  const out: Walk[] = [];
  const situations = fieldOptions(ds, SITUATION_FIELD).filter((o) => !o.is_unknown);
  for (const destination of fieldOptions(ds, DESTINATION_FIELD))
    for (const situation of situations) {
      const start: Profile = { [DESTINATION_FIELD]: destination.value, [SITUATION_FIELD]: situation.value };
      const rest = walkFrom(start, walkAnswerWith(passport));
      out.push({ answers: rest.answers, order: [DESTINATION_FIELD, SITUATION_FIELD, ...rest.order] });
    }
  return out;
}

/** A question card, with its question's field and the answers given before it. */
export interface QuestionCard extends ReaderPage {
  field: string;
  before: Profile;
}

/** Every question card each walk meets, drawn on the answers given before it. */
export function questionCards(): QuestionCard[] {
  const cards: QuestionCard[] = [];
  for (const { answers, order } of walks())
    order.forEach((field, i) => {
      const before: Profile = Object.fromEntries(order.slice(0, i).map((f) => [f, answers[f]!]));
      const remaining = remainingQuestions(ds, before);
      const question = remaining.find((q) => q.field === field);
      if (!question) return;
      cards.push({
        field, before,
        where: `question ${field} after ${JSON.stringify(before)}`,
        html: questionCardHtml({
          dataset: ds, question, answers: before, asked: order.slice(0, i), editing: null, total: remaining.length,
        }),
      });
    });
  return cards;
}

/** A card's foot link as it lays out: its card's heading, its label, how many
 * lines its text takes, the space in its box above its text's first line and
 * below its text's last, its box's width, its text's width, and the width of a
 * lone ↗ in its font. */
export interface FootLink {
  card: string;
  label: string;
  lines: number;
  spaceAbove: number;
  spaceBelow: number;
  width: number;
  textWidth: number;
  loneArrowWidth: number;
}

/** A screen the module drew: its masthead and box, the heading of each Notice
 * on it, its foot links, and the harness's width failure on opening it, or
 * null. A screen that failed it holds nothing else. */
export interface DrawnScreen extends ReaderPage {
  noticeHeadings: string[];
  footLinks: FootLink[];
  failure: string | null;
}

/** The width of a lone ↗ set in `link`'s font, laid out on the page apart from
 * any link. */
const LONE_ARROW_WIDTH = `((link) => {
  const arrow = document.createElement("span");
  arrow.textContent = "\\u2197";
  arrow.style.cssText = "position:absolute;white-space:nowrap";
  arrow.style.font = getComputedStyle(link).font;
  document.body.append(arrow);
  const width = arrow.getBoundingClientRect().width;
  arrow.remove();
  return width;
})`;

/** What the module drew, read from the running page: the masthead and the box
 * under it, each Notice's heading, and each foot link's layout. */
const DRAWN = `JSON.stringify({
  html: [".masthead-with-stamps", "#main"].map((s) => { const el = document.querySelector(s); return el ? el.outerHTML : ""; }).join("\\n"),
  noticeHeadings: [...document.querySelectorAll("#main article.notice h3")].map((h) => h.textContent.trim()),
  footLinks: [...document.querySelectorAll("#main .foot > a.next")].map((link) => {
    const text = document.createRange();
    text.selectNodeContents(link);
    const box = link.getBoundingClientRect();
    const span = text.getBoundingClientRect();
    const heading = link.closest("article")?.querySelector("h3");
    return {
      card: heading ? heading.textContent.trim() : "",
      label: link.textContent.trim(),
      lines: new Set([...text.getClientRects()].map((r) => Math.round(r.top))).size,
      spaceAbove: span.top - box.top,
      spaceBelow: box.bottom - span.bottom,
      width: box.width,
      textWidth: span.width,
      loneArrowWidth: ${LONE_ARROW_WIDTH}(link),
    };
  }),
})`;

const seed = (walk: Walk) =>
  `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(serialize(walk.answers, walk.order, true))})`;

/** The screen the module draws at `path` for `record`. The harness's width
 * failure on opening it is kept on the screen rather than thrown, so a case
 * names every screen laid out at another width, not the first; nothing more is
 * read from that screen. Any other failure is thrown as it is. */
async function screenDrawnAt(site: PageOnSite, path: string, record: Walk | null): Promise<Omit<DrawnScreen, "where">> {
  const { page, url } = site;
  await page.goto(url("/404.html"));
  await page.evaluate(record ? seed(record) : "localStorage.clear()");
  try {
    await page.goto(url(path));
  } catch (e) {
    if (e instanceof WidthFailure) return { html: "", noticeHeadings: [], footLinks: [], failure: e.message };
    throw e;
  }
  return { ...(JSON.parse(await page.evaluate(DRAWN)) as Omit<DrawnScreen, "where" | "failure">), failure: null };
}

/** Where the results at the end of `walk` were read, as a drawn screen names it. */
export function resultsWhere({ answers }: Walk): string {
  const passport = answers[PASSPORT_FIELD] ?? "never asked";
  return `results for ${answers[DESTINATION_FIELD]}/${answers[SITUATION_FIELD]} with passport ${passport}`;
}

/** The results — masthead and cards — the module draws at the end of each of `walksTaken`. */
export async function drawnResults(site: PageOnSite, walksTaken: Walk[]): Promise<DrawnScreen[]> {
  const results: DrawnScreen[] = [];
  for (const walk of walksTaken) results.push({ where: resultsWhere(walk), ...(await screenDrawnAt(site, "/", walk)) });
  return results;
}

/**
 * The screens the module draws in the browser: the results — masthead and
 * cards — at the end of every walk, taken once with each of `passports`, and
 * the arrival line from each country page and each country's first route
 * page, for a reader with no record and for one whose record is another
 * country's.
 */
export async function drawnScreens(site: PageOnSite, passports = [DEFAULT_PASSPORT]): Promise<DrawnScreen[]> {
  const screens = await drawnResults(site, passports.flatMap((passport) => walks(passport)));
  const all = walks();
  for (const country of ds.countries) {
    const code = country.code.toLowerCase();
    const elsewhere = all.find((w) => w.answers[DESTINATION_FIELD] !== code && w.answers[DESTINATION_FIELD] !== EVERY_DESTINATION)!;
    for (const record of [null, elsewhere]) {
      const recorded = record ? "with another country's record" : "with no record";
      screens.push({ where: `/?country=${code} ${recorded}`, ...(await screenDrawnAt(site, `/?country=${code}`, record)) });
      const route = country.routes[0]!.id;
      screens.push({ where: `/?route=${route} ${recorded}`, ...(await screenDrawnAt(site, `/?route=${route}`, record)) });
    }
  }
  return screens;
}

/** Each screen of `screens` the harness's width check failed on opening, with its failure. */
export const failuresOf = (screens: DrawnScreen[]): string[] =>
  screens.flatMap((s) => (s.failure === null ? [] : [`${s.where}: ${s.failure}`]));

/** Whether `heading` is `notice`'s title as a card draws it: bare, or glossed
 * where the screen glosses it first. */
const isHeadingOf = (notice: Notice, heading: string): boolean =>
  heading === notice.title || heading === glossed(notice.title, new Set());

/** The id of each Notice in the dataset that no screen of `screens` draws. */
export const noticesDrawnOnNone = (screens: DrawnScreen[]): string[] =>
  (ds.notices ?? [])
    .filter((notice) => !screens.some((s) => s.noticeHeadings.some((heading) => isHeadingOf(notice, heading))))
    .map((notice) => notice.id);

/** A foot link with where it was read: the screen it is on. */
export interface FootLinkOnScreen extends FootLink {
  where: string;
}

/** Every foot link of `screens`, with the screen it is on; only those on
 * `notice`'s card where a notice is given. */
export const footLinksOf = (screens: DrawnScreen[], notice?: Notice): FootLinkOnScreen[] =>
  screens.flatMap((s) => s.footLinks
    .filter((link) => notice === undefined || isHeadingOf(notice, link.card))
    .map((link) => ({ ...link, where: s.where })));

/** Whether a foot link's ↗ lays out on its last word's line: the link's box
 * centres what it holds, so a ↗ on a line of its own leaves more space under
 * the text than over it. */
export const isArrowOnLastWordLine = (link: FootLink): boolean => Math.abs(link.spaceAbove - link.spaceBelow) < 1;

/** Whether a one-line foot link's box is its text's width and a lone ↗'s,
 * with no space between them, within half a pixel. */
export const isAsWideAsTextAndArrow = (link: FootLink): boolean =>
  Math.abs(link.width - (link.textWidth + link.loneArrowWidth)) < 0.5;

const decode = (text: string): string => text
  .replace(/&nbsp;|&#160;/g, " ")
  .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&amp;/g, "&");

const squeeze = (text: string): string => text.split(/\s+/).join(" ").trim();

/** A fragment of markup as the text a reader reads in it. */
export function plainTextOf(fragment: string): string {
  return squeeze(decode(fragment.replace(/<[^>]+>/g, " ")));
}

/** Our own words on a page: without the markup a reader never reads as text,
 * and without the authority's quotes, which are its words and never ours. */
const ourWordsOf = (html: string): string =>
  html.replace(/<(script|style|svg|noscript|q|blockquote)\b[\s\S]*?<\/\1>/gi, " ");

/** Every heading of a page — its title and each h1 to h6 — as text. */
export function headingsOf(html: string): string[] {
  return [...ourWordsOf(html).matchAll(/<(title|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => squeeze(decode(m[2]!.replace(/<[^>]+>/g, ""))))
    .filter((h) => h !== "");
}

/** The tags that start a new run of text: a sentence never runs across one. */
const BLOCK = /<\/?(?:p|div|li|ul|ol|h[1-6]|title|td|th|tr|dt|dd|dl|summary|details|section|article|header|footer|nav|main|aside|figure|figcaption|blockquote|br|hr|label|button|option|table|form|fieldset|legend)\b[^>]*>/gi;

/** What a search result or a link preview reads about a page. */
const DESCRIPTION = /<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content="([^"]*)"/gi;

/**
 * Every sentence of ours on a page as a reader reads it: the text of each block, cut
 * after each full stop, question mark or exclamation mark, keeping only the
 * pieces that end on one — a label or a heading is not a sentence. The page's
 * descriptions count, since a search result prints them as sentences.
 */
export function sentencesOf(html: string): string[] {
  const descriptions = [...html.matchAll(DESCRIPTION)].map((m) => m[1]!);
  const blocks = ourWordsOf(html).replace(BLOCK, "\n").replace(/<[^>]+>/g, "").split("\n");
  return [...descriptions, ...blocks]
    .map((block) => squeeze(decode(block)))
    .flatMap((block) => block.split(/(?<=[.!?][”"’)]?)\s+(?=\S)/))
    .filter((s) => /[.!?][”"’)]?$/.test(s));
}
