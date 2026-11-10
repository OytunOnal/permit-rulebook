import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset, Profile } from "permit-rulebook-data";
import { nearestLine } from "../src/lib/copy/verdict.js";
import { ABBREVIATIONS } from "../src/lib/gloss.js";
import { esc } from "../src/lib/reason.js";
import {
  verdictHtml, verdictOf, type CountrySection, type DrawnRoute, type StepCard, type Verdict, type VerdictGroup,
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

/** The routes a group draws, cards and rows, in its order, folded rows
 * included; the steps block and the arranged line draw none. */
export function drawnRoutesIn(group: VerdictGroup): DrawnRoute[] {
  if (group.kind === "steps" || group.kind === "arranged") return [];
  if (group.kind !== "not-yet") return group.routes;
  return group.items.flatMap((item) => ("kind" in item ? item.routes : [item]));
}

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
  for (const group of groupsIn(verdict)) {
    const drawnRoute = drawnRoutesIn(group).find((c) => c.route === route);
    if (drawnRoute) return { kind: group.kind, html: drawnRoute.html };
  }
  return undefined;
}

/** The markup of the card or row a route is drawn with on a verdict; a route
 * the verdict lists nowhere fails the case that asked for it. */
export function drawnRouteOn(verdict: Verdict, route: string): string {
  const at = placed(verdict, route);
  if (!at) throw new Error(`${route} is on no group of this verdict`);
  return at.html;
}

/** Every route a verdict draws, card or row, in order, with its route's id. */
export const everyDrawnRouteIn = (verdict: Verdict): DrawnRoute[] => groupsIn(verdict).flatMap(drawnRoutesIn);

/** The steps a verdict offers, in the order drawn, every section's in turn. */
export const stepsIn = (verdict: Verdict): StepCard[] =>
  groupsIn(verdict).flatMap((g) => (g.kind === "steps" ? g.steps : []));

/** The job-search sentences under a verdict's steps groups, joined. */
export const hintsIn = (verdict: Verdict): string =>
  groupsIn(verdict).map((g) => (g.kind === "steps" ? g.hint : "")).join("");

/** A country's section on the several-country layout, by its name. */
export function sectionNamed(verdict: Verdict, name: string): CountrySection {
  if (verdict.layout.kind !== "countries") throw new Error("this verdict draws no country sections");
  const section = verdict.layout.sections.find((s) => s.name === name);
  if (!section) throw new Error(`no section named ${name}`);
  return section;
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

function pinnedGroupOf(group: VerdictGroup): PinnedGroup {
  switch (group.kind) {
    case "steps": return { kind: group.kind, steps: group.steps.map((s) => s.title), jobOfferLine: group.jobOfferLine !== null };
    case "arranged": return { kind: group.kind, arranged: group.answers.map((a) => a.routes) };
    case "not-yet": return {
      kind: group.kind, count: group.count,
      items: group.items.map((i) => ("kind" in i
        ? { fold: i.kind, open: i.kind === "needs-path-answers" && i.open, routes: i.routes.map((r) => r.route) }
        : i.route)),
    };
    default: return { kind: group.kind, routes: group.routes.map((r) => r.route) };
  }
}

/** The headline's kind and what its second sentence names: the route within
 * reach it measures, or the step it calls nearest. */
function pinnedHeadlineOf(verdict: Verdict, strip: Record<string, number>): LayoutPin["headline"] {
  const m = verdict.action.masthead;
  const none = { route: null, step: null };
  if (strip.open! + strip.withinReach! > 0) {
    const near = groupsIn(verdict).find((g) => g.kind === "within-reach");
    return { kind: "open", route: near ? drawnRoutesIn(near)[0]!.route : null, step: null };
  }
  if (m.sublineHtml !== undefined) return { kind: "written-state", ...none };
  if (strip.unsettled) return { kind: "unsettled", ...none };
  const nearest = stepsIn(verdict).find((s) => m.subline.includes(nearestLine(s.title)));
  if (nearest) return { kind: "steps", route: null, step: nearest.title };
  return { kind: "nothing-open", ...none };
}

/** What the layout of a comparison decides, as data: the strip, the
 * headline, and each section's place, tally and groups. */
export function layoutPinOf(verdict: Verdict): LayoutPin {
  const { layout } = verdict;
  if (layout.kind === "notice") throw new Error("a notice screen has no layout to pin");
  const strip = { ...layout.strip };
  const headline = pinnedHeadlineOf(verdict, strip);
  if (layout.kind === "one-country") return { kind: layout.kind, strip, headline, groups: layout.groups.map(pinnedGroupOf) };
  return {
    kind: layout.kind, strip, headline,
    lead: headline.kind === "written-state" ? layout.sections[0]!.name : null,
    sections: layout.sections.map((s) => ({
      country: s.name, open: s.open, tally: { ...s.tally, closedTo: s.tally.closedTo !== null },
      groups: s.groups.map(pinnedGroupOf),
    })),
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
