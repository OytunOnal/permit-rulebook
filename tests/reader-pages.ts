import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import {
  DESTINATION_FIELD, SITUATION_FIELD, fieldOptions, remainingQuestions, type Dataset, type Profile, type Question,
} from "permit-rulebook-data";
import { questionCardHtml } from "../src/lib/question.js";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";
import type { PageOnSite } from "./browser-walk.js";

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

/** The answer a walk gives a question: a real passport, and otherwise the
 * first option that is neither "I don't know" nor the fallback. */
function answerFor(field: string, values: { value: string; is_unknown?: boolean; is_fallback?: boolean }[]): string {
  if (field === "citizenship") return "IN";
  return (values.find((o) => !o.is_unknown && !o.is_fallback) ?? values[0]!).value;
}

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
 * reader can hold: each question card and each results screen the dataset
 * can draw for them. */
export function walks(): Walk[] {
  const out: Walk[] = [];
  const situations = fieldOptions(ds, SITUATION_FIELD).filter((o) => !o.is_unknown);
  for (const destination of fieldOptions(ds, DESTINATION_FIELD))
    for (const situation of situations) {
      const start: Profile = { [DESTINATION_FIELD]: destination.value, [SITUATION_FIELD]: situation.value };
      const rest = walkFrom(start, (q) => answerFor(q.field, q.options));
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

/** What the module drew: the masthead and the box under it. */
const DRAWN = 'JSON.stringify({ html: [".masthead-with-stamps", "#main"]'
  + '.map((s) => { const el = document.querySelector(s); return el ? el.outerHTML : ""; }).join("\\n") })';

const seed = (walk: Walk) =>
  `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(serialize(walk.answers, walk.order, true))})`;

async function screenHtmlOf(site: PageOnSite, path: string, record: Walk | null): Promise<string> {
  const { page, url } = site;
  await page.goto(url("/404.html"));
  await page.evaluate(record ? seed(record) : "localStorage.clear()");
  await page.goto(url(path));
  return (JSON.parse(await page.evaluate(DRAWN)) as { html: string }).html;
}

/** The results — masthead and cards — the module draws at the end of every walk. */
async function drawnResults(site: PageOnSite): Promise<ReaderPage[]> {
  const results: ReaderPage[] = [];
  for (const walk of walks())
    results.push({ where: `results for ${JSON.stringify(walk.answers)}`, html: await screenHtmlOf(site, "/", walk) });
  return results;
}

/**
 * The screens the module draws in the browser: the results — masthead and
 * cards — at the end of every walk, and the arrival line from each country
 * page and each country's first route page, for a reader with no record and
 * for one whose record is another country's.
 */
export async function drawnScreens(site: PageOnSite): Promise<ReaderPage[]> {
  const screens: ReaderPage[] = await drawnResults(site);
  const all = walks();
  for (const country of ds.countries) {
    const code = country.code.toLowerCase();
    const elsewhere = all.find((w) => w.answers[DESTINATION_FIELD] !== code && w.answers[DESTINATION_FIELD] !== "all")!;
    for (const record of [null, elsewhere]) {
      const recorded = record ? "with another country's record" : "with no record";
      screens.push({ where: `/?country=${code} ${recorded}`, html: await screenHtmlOf(site, `/?country=${code}`, record) });
      const route = country.routes[0]!.id;
      screens.push({ where: `/?route=${route} ${recorded}`, html: await screenHtmlOf(site, `/?route=${route}`, record) });
    }
  }
  return screens;
}

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
