import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset, Profile } from "permit-rulebook-data";
import { ABBREVIATIONS } from "../src/lib/gloss.js";
import { esc } from "../src/lib/reason.js";
import { plainTextOf } from "./reader-pages.js";
import {
  verdictHtml, verdictOf, type CountrySection, type HeadlineLayout, type StepCard, type Verdict, type VerdictGroup,
} from "../src/lib/verdict/verdict.js";

const ds = dataset as unknown as Dataset;

/**
 * The verdict a reader with these answers is shown on a dataset — the shipped
 * one, or one a test writes — read through the module's entry the way the
 * page reads it, from a route page when `cameFrom` names one.
 */
export const verdictOn = (data: Dataset, answers: Profile, cameFrom: string | null = null): Verdict =>
  verdictOf(data, answers, { cameFrom, answered: Object.keys(answers).length });

/** The verdict on the shipped dataset, with no route page behind it. */
export const verdictFor = (answers: Profile): Verdict => verdictOn(ds, answers);

/** A route as a verdict draws it: its id, and its card's or row's markup. */
export interface DrawnRoute {
  route: string;
  html: string;
}

/** The routes a group lists, by id, in its order, folded rows included; the
 * steps block and the arranged line list none. */
export function routeIdsIn(group: VerdictGroup): string[] {
  if (group.kind === "steps" || group.kind === "arranged") return [];
  if (group.kind !== "not-yet") return group.routes;
  return group.items.flatMap((item) => (typeof item === "string" ? [item] : item.routes));
}

/** The markup a verdict draws a route with, by the route's id; a route it
 * draws none for fails the case that asked for it. */
function routeHtmlOn(verdict: Verdict, route: string): string {
  const html = verdict.routes[route];
  if (html === undefined) throw new Error(`${route} has no card on this verdict`);
  return html;
}

/** The routes a group lists, each with the markup the verdict draws it with. */
export const drawnRoutesIn = (verdict: Verdict, group: VerdictGroup): DrawnRoute[] =>
  routeIdsIn(group).map((route) => ({ route, html: routeHtmlOn(verdict, route) }));

/** Every group of a verdict, in the order drawn: the flat layout's, or each
 * country section's in turn. */
export function groupsIn(verdict: Verdict): VerdictGroup[] {
  if (verdict.layout.kind === "one-country") return verdict.layout.groups;
  if (verdict.layout.kind === "countries") return verdict.layout.sections.flatMap((s) => s.groups);
  return [];
}

/** Where a route is listed on a verdict — the kind of group, and its card's
 * or row's markup — or undefined where the verdict lists it nowhere. */
export function placed(verdict: Verdict, route: string): { kind: VerdictGroup["kind"]; html: string } | undefined {
  const group = groupsIn(verdict).find((g) => routeIdsIn(g).includes(route));
  return group ? { kind: group.kind, html: routeHtmlOn(verdict, route) } : undefined;
}

/** The markup of the card or row a route is drawn with on a verdict; a route
 * the verdict lists nowhere fails the case that asked for it. */
export function drawnRouteOn(verdict: Verdict, route: string): string {
  const at = placed(verdict, route);
  if (!at) throw new Error(`${route} is on no group of this verdict`);
  return at.html;
}

/** Every route a verdict draws, card or row, in order, with its route's id. */
export const everyDrawnRouteIn = (verdict: Verdict): DrawnRoute[] =>
  groupsIn(verdict).flatMap((g) => drawnRoutesIn(verdict, g));

/** The card a verdict draws a step with, by the id the layout gives it. */
function stepCardOn(verdict: Verdict, id: string): StepCard {
  const card = verdict.steps[id];
  if (!card) throw new Error(`the step ${id} has no card on this verdict`);
  return card;
}

/** The steps a verdict offers, in the order drawn, every section's in turn. */
export const stepsIn = (verdict: Verdict): StepCard[] =>
  groupsIn(verdict).flatMap((g) => (g.kind === "steps" ? g.steps.map((s) => stepCardOn(verdict, s.id)) : []));

/** The job-search sentences the verdict draws under its steps, joined. */
export const hintsIn = (verdict: Verdict): string =>
  [...verdict.body.matchAll(/<p class="unlock-hint">[\s\S]*?<\/p>/g)].map((m) => m[0]).join("");

/** A country's name, by its code; a code the shipped dataset lacks fails the case. */
export function countryNamed(code: string): string {
  const country = ds.countries.find((c) => c.code === code);
  if (!country) throw new Error(`no country ${code} in the dataset`);
  return country.name;
}

/** A country's code, by its name; a name the shipped dataset lacks fails the case. */
export function codeOfCountry(name: string): string {
  const country = ds.countries.find((c) => c.name === name);
  if (!country) throw new Error(`no country named ${name} in the dataset`);
  return country.code;
}

/** A country's section on the several-country layout, by its name. */
export function sectionNamed(verdict: Verdict, name: string): CountrySection {
  if (verdict.layout.kind !== "countries") throw new Error("this verdict draws no country sections");
  const section = verdict.layout.sections.find((s) => s.country === codeOfCountry(name));
  if (!section) throw new Error(`no section named ${name}`);
  return section;
}

/** The words a country's summary row prints after its name, as markup: its
 * counts, or the s19 sentence that stands in its not-yet count. */
export function summaryRowOf(verdict: Verdict, name: string): string {
  const row = new RegExp(`<span class="cname">${esc(name)}</span> <span class="tally[^"]*">([\\s\\S]*?)</span></summary>`)
    .exec(verdict.body);
  if (!row) throw new Error(`no summary row for ${name} on this verdict`);
  return row[1]!;
}

/** The headings of a verdict's route groups, as text, in the order drawn. */
export const groupHeadingsIn = (verdict: Verdict): string[] =>
  [...verdict.body.matchAll(/<h2 class="ghead[^"]*"><b>([\s\S]*?)<\/b>/g)].map((m) => plainTextOf(m[1]!));

/** The strip under the notices, as text. */
export function stripTextOf(verdict: Verdict): string {
  const strip = /<div class="strip"[^>]*>([\s\S]*?)<\/div>/.exec(verdict.body);
  if (!strip) throw new Error("this verdict draws no strip");
  return plainTextOf(strip[1]!);
}

/** The badge a full card wears, as text; a card with none fails the case. */
export function badgeOf(card: string): string {
  const badge = /<span class="st [^"]*">([\s\S]*?)<\/span>/.exec(card);
  if (!badge) throw new Error("this card wears no badge");
  return plainTextOf(badge[1]!);
}

/** The line a not-yet row shows folded, as text. */
export function foldedLineOf(row: string): string {
  const line = /<span class="hold-why">([\s\S]*?)<\/span><\/summary>/.exec(row);
  if (!line) throw new Error("this row has no folded line");
  return plainTextOf(line[1]!);
}

/** The s19 sentence a country's line carries: as text, and as the markup drawn. */
export interface SaidLine {
  text: string;
  html: string;
}

/** The s19 sentence on a country's line, where the layout says the line
 * carries one, read from the summary row the verdict draws; or null. */
export function saidLineOf(verdict: Verdict, section: CountrySection): SaidLine | null {
  if (!section.tally.situationNotTaken) return null;
  const html = summaryRowOf(verdict, countryNamed(section.country));
  return { text: plainTextOf(html), html };
}

/** A not-yet item as a pin reads it: a route's id, or a fold with its rows. */
type PinnedItem = string | { fold: string; open: boolean; routes: string[] };

/** A group as a pin reads it: its kind, and what it holds, by id. */
interface PinnedGroup {
  kind: string;
  routes?: string[];
  steps?: string[];
  jobOfferLine?: boolean;
  arranged?: number[];
  count?: number;
  items?: PinnedItem[];
}

/** What the layout decides, read off a verdict, with no words but a step's title. */
export interface LayoutPin {
  kind: string;
  strip: Record<string, number>;
  headline: { kind: string; route: string | null; step: string | null };
  lead?: string | null;
  groups?: PinnedGroup[];
  sections?: { country: string; open: boolean; tally: Record<string, number | boolean>; groups: PinnedGroup[] }[];
}

function pinnedGroupOf(verdict: Verdict, group: VerdictGroup): PinnedGroup {
  switch (group.kind) {
    case "steps": return {
      kind: group.kind, steps: group.steps.map((s) => stepCardOn(verdict, s.id).title), jobOfferLine: group.jobOfferLine !== null,
    };
    case "arranged": return { kind: group.kind, arranged: group.answers.map((a) => a.routes) };
    case "not-yet": return {
      kind: group.kind, count: group.count,
      items: group.items.map((i) => (typeof i === "string"
        ? i
        : { fold: i.kind, open: i.kind === "needs-path-answers" && i.open, routes: i.routes })),
    };
    default: return { kind: group.kind, routes: group.routes };
  }
}

/** The title of the step a key names, as the verdict draws its card. */
function stepTitleKeyed(verdict: Verdict, key: string): string {
  const place = groupsIn(verdict).flatMap((g) => (g.kind === "steps" ? g.steps : [])).find((s) => s.step === key);
  if (!place) throw new Error(`no step keyed ${key} on this verdict`);
  return stepCardOn(verdict, place.id).title;
}

/** The headline's kind and what its second sentence names: the route within
 * reach it measures, or the step it calls nearest. */
function pinnedHeadlineOf(verdict: Verdict, headline: HeadlineLayout): LayoutPin["headline"] {
  if (headline.kind === "open" || headline.kind === "unsettled") return { kind: headline.kind, route: headline.nearest, step: null };
  if (headline.kind === "steps") return { kind: headline.kind, route: null, step: stepTitleKeyed(verdict, headline.nearest) };
  return { kind: headline.kind, route: null, step: null };
}

/** What the layout of a comparison decides, as data: the strip, the
 * headline, and each section's place, tally and groups. */
export function layoutPinOf(verdict: Verdict): LayoutPin {
  const { layout } = verdict;
  if (layout.kind === "notice") throw new Error("a notice screen has no layout to pin");
  const strip = { ...layout.strip };
  const headline = pinnedHeadlineOf(verdict, layout.headline);
  const groupsOf = (groups: VerdictGroup[]) => groups.map((g) => pinnedGroupOf(verdict, g));
  if (layout.kind === "one-country") return { kind: layout.kind, strip, headline, groups: groupsOf(layout.groups) };
  return {
    kind: layout.kind, strip, headline,
    lead: layout.lead === null ? null : countryNamed(layout.lead),
    sections: layout.sections.map((s) => (
      { country: countryNamed(s.country), open: s.open, tally: { ...s.tally }, groups: groupsOf(s.groups) }
    )),
  };
}

/**
 * The blocks of a card drawn as a `<div>` whose class attribute is exactly
 * one of `classes`, each whole, in the order the card draws them, joined —
 * the markup the card piece of that name printed.
 */
export function blocksIn(html: string, ...classes: string[]): string {
  const out: string[] = [];
  const opening = /<div class="([^"]*)"/g;
  for (let m = opening.exec(html); m; m = opening.exec(html)) {
    if (!classes.includes(m[1]!)) continue;
    let depth = 0;
    const tag = /<div\b|<\/div>/g;
    tag.lastIndex = m.index;
    for (let t = tag.exec(html); t; t = tag.exec(html)) {
      depth += t[0] === "</div>" ? -1 : 1;
      if (depth === 0) { out.push(html.slice(m.index, tag.lastIndex)); opening.lastIndex = tag.lastIndex; break; }
    }
  }
  return out.join("");
}

/**
 * The script that reads, on a results screen, whether the page painted this
 * verdict as `verdictOf` and `verdictHtml` composed it: the headline, the
 * subline, and the body under the arrival line. Each composed piece is parsed
 * into an empty copy of the box it is painted in, as the page's own `draw`
 * compares, so both sides read as the browser writes them. Its value is JSON,
 * `{ headline, subline, body }`, each true where the page shows what was
 * composed.
 */
export function paintedAsComposedScript(verdict: Verdict): string {
  const m = verdict.action.masthead;
  const subline = m.sublineHtml === undefined
    ? `subline.textContent === ${JSON.stringify(m.subline)}`
    : `subline.innerHTML === parsed(subline, ${JSON.stringify(m.sublineHtml)})`;
  return `JSON.stringify((() => {
    const parsed = (el, html) => { const spare = el.cloneNode(false); spare.innerHTML = html; return spare.innerHTML; };
    const headline = document.getElementById("headline");
    const subline = document.getElementById("subline");
    const main = document.getElementById("main");
    return {
      headline: headline.innerHTML === parsed(headline, ${JSON.stringify(m.headline)}),
      subline: ${subline},
      body: main.innerHTML.endsWith(parsed(main, ${JSON.stringify(verdictHtml(verdict))})),
    };
  })())`;
}

/** What `paintedAsComposedScript` reads on a page that painted the verdict
 * it was given. */
export const PAINTED_AS_COMPOSED = { headline: true, subline: true, body: true };

/**
 * Markup with the abbreviations' explainers taken out. A verdict explains an
 * abbreviation on its first use on the screen, so whether a card's sentence
 * carries the explainer depends on the cards drawn before it; a case about
 * which sentences a card states reads them without it.
 */
export function withoutGlosses(html: string): string {
  let out = html;
  for (const [token, words] of ABBREVIATIONS)
    for (const said of [words, esc(words)])
      out = out.split(` (${said})`).join("").split(`; ${token} = ${said}`).join("");
  return out;
}
