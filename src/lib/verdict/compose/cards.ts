// @level presentation
import {
  liveUnknowns, shortLabelOf, unlockMeansOf, unlockProfile, type Profile, type RouteResult,
} from "permit-rulebook-data";
import {
  carveOutHtml, caveatHtml, learnBoxHtml, moneyShortfallOf, pointsLineHtml, precondHtml, provenanceHtml, railHtml,
  readingHtml, scopedHtml, sourceLinkHtml, type CardScreen,
} from "./card-blocks.js";
import {
  CAME_FROM_LINE, LOWER_THRESHOLD_HINT, POINTS_TABLE_HINT, RULES_MET, STATUS_LABEL, WOULD_BE_MET,
  WOULD_COME_WITHIN_REACH, pointsMore, shortByPoints, withStepHtml,
} from "../../copy.js";
import { countryOf } from "../../countries.js";
import { type Glossary, glossSection, glossed } from "../../gloss.js";
import { esc, escAttr, failDetailHtml, whyHtml } from "../../reason.js";
import { url } from "../../site.js";
import { routePath } from "../../slug.js";
import type { Step } from "./steps.js";

/**
 * What every card of one verdict is drawn on: the dataset, the answers, the
 * route the reader came from, and the screen's one memory of which
 * abbreviations it has explained — a card drawn first explains, the ones
 * after it do not.
 */
export interface VerdictScreen extends CardScreen {
  glossary: Glossary;
  cameFrom: string | null;
}

/** How a full card is drawn, each value named for what it draws. */
export interface CardLook {
  /** The country's chip above the title, or none: a country's own section
   * names its country once, on its summary row. */
  chip: "country" | "none";
  /** The badge: the route's own status, or "Rules met" under "unsettled for
   * your passport", where an open question hangs over a met route. */
  badge: "status" | "rules-met";
}

const routeName = (screen: VerdictScreen, r: RouteResult): string => glossSection(r.route.name, screen.glossary);

/** Whether an unknown on this route is one the reader can still act on. */
export const hasLiveUnknown = (screen: VerdictScreen, r: RouteResult): boolean =>
  liveUnknowns(r, screen.answers).length > 0;

/**
 * The route the reader arrived from, marked and findable: the mark is on the
 * card itself, so whichever group it lands in it is the same card the reader
 * was reading a moment ago (isolated v1-gate critique, 2026-09-08, B2).
 */
const cameFromMark = (screen: VerdictScreen, r: RouteResult): string =>
  r.route.id === screen.cameFrom ? ` data-came-from="${escAttr(r.route.id)}"` : "";

/** The line inside the marked card, in the reader's own trail of thought. */
const cameFromNote = (screen: VerdictScreen, r: RouteResult): string =>
  r.route.id === screen.cameFrom ? `<p class="from-here">${esc(CAME_FROM_LINE)}</p>` : "";

/**
 * What the interview asks of this route, in the plain words the route page
 * shows, and the door to the page itself: the same declared fact in both
 * places (route-page critique B3).
 */
function scopeFor(screen: VerdictScreen, r: RouteResult): string {
  return scopedHtml(r.route, screen.answers, url(routePath(countryOf(screen.ds, r.country), r.route)));
}

/**
 * What a route within reach on money is short of: "Short by up to …" on a
 * bounded gap, or, on a band open at the bottom, the line it asks and the
 * reader's answer. Where the gap is a salary, the hint that a lower threshold
 * may already apply follows either.
 */
function gapNoteHtml(screen: VerdictScreen, r: RouteResult): string {
  const money = r.status === "near" ? moneyShortfallOf(screen.ds, r, screen.answers) : undefined;
  if (!money) return "";
  const field = esc(shortLabelOf(screen.ds, money.field).toLowerCase());
  const hint = money.field === "salary_eur_year" ? ` ${esc(LOWER_THRESHOLD_HINT)}` : "";
  return `<div class="gapnote">${money.noteHtml(field)}${hint}</div>`;
}

/** The same, for a route within reach on points. */
function pointsNoteHtml(r: RouteResult): string {
  if (r.status !== "near" || !r.gap_points) return "";
  return `<div class="gapnote"><b>${esc(shortByPoints(r.gap_points))}</b> ${esc(POINTS_TABLE_HINT)}</div>`;
}

/**
 * A route that is open, within reach or unsettled, as a whole card. Its first
 * line is the country's chip and the badge, or the badge alone, above the
 * title: one home for the badge at every width and every title length (#95).
 */
export function fullCardHtml(screen: VerdictScreen, r: RouteResult, look: CardLook): string {
  const { ds } = screen;
  const rulesMet = look.badge === "rules-met";
  return `
        <article class="route"${cameFromMark(screen, r)}>
          <div class="top">${look.chip === "country" ? `<span class="country">${esc(countryOf(ds, r.country).name)}</span>` : ""}
            <span class="st ${rulesMet ? "unsettled" : r.status}">${esc(rulesMet ? RULES_MET : STATUS_LABEL[r.status])}</span>
          </div>
          <h3>${esc(routeName(screen, r))}</h3>
          ${cameFromNote(screen, r)}
          <p class="why">${whyHtml(ds, r, screen.answers)}</p>
          ${scopeFor(screen, r)}
          ${precondHtml(screen, r.route)}
          ${carveOutHtml(screen, r.route)}
          ${caveatHtml(screen, r.route)}
          ${readingHtml(r.route, screen.glossary)}
          ${pointsLineHtml(ds, r)}
          ${r.status !== "hold" ? railHtml(ds, r, screen.answers) : ""}
          ${gapNoteHtml(screen, r)}
          ${pointsNoteHtml(r)}
          ${learnBoxHtml(screen, r)}
          <div class="foot">${provenanceHtml(screen, r)}${sourceLinkHtml(r.route.info_url)}</div>
        </article>`;
}

/**
 * A not-yet route, as a row that unfolds. It opens by itself only where an
 * unknown still binds — a row opened on a dead route promises an answer that
 * cannot change it (critique #4) — or where it is the route the reader came
 * from.
 */
export function holdRowHtml(screen: VerdictScreen, r: RouteResult): string {
  const { ds, answers, glossary } = screen;
  const short = whyHtml(ds, r, answers).split(". ")[0].replace(/\.$/, "");
  const open = hasLiveUnknown(screen, r) || r.route.id === screen.cameFrom;
  return `
        <details class="route-hold"${cameFromMark(screen, r)}${open ? " open" : ""}>
          <summary><span class="country">${esc(r.country)}</span><span class="hold-name">${esc(routeName(screen, r))}</span><span class="hold-why">${short}</span></summary>
          <div class="hold-body">
            ${cameFromNote(screen, r)}
            ${r.route.summary ? `<p class="why">${esc(glossed(r.route.summary, glossary))}</p>` : ""}
            ${scopeFor(screen, r)}
            ${precondHtml(screen, r.route)}
            ${carveOutHtml(screen, r.route)}
            ${caveatHtml(screen, r.route)}
            ${readingHtml(r.route, glossary)}
            ${pointsLineHtml(ds, r)}
            ${failDetailHtml(ds, r, answers)}
            ${learnBoxHtml(screen, r)}
            <div class="foot">${provenanceHtml(screen, r)}${sourceLinkHtml(r.route.info_url)}</div>
          </div>
        </details>`;
}

/** How far a step would bring a route that it brings within reach, measured
 * on the answers as they would stand with the step taken. */
function reachAmount(screen: VerdictScreen, r: RouteResult, taken: Profile): string {
  const money = moneyShortfallOf(screen.ds, r, taken);
  if (money) return ` (${esc(money.reach)})`;
  if (r.gap_points) return ` (${esc(pointsMore(r.gap_points))})`;
  return "";
}

/** One route a step opens, and how. */
function unlockedRouteHtml(screen: VerdictScreen, r: RouteResult, taken: Profile): string {
  const how = r.status === "met"
    ? `<b>${esc(WOULD_BE_MET)}</b>`
    : `<i>${esc(WOULD_COME_WITHIN_REACH)}${reachAmount(screen, r, taken)}</i>`;
  return `<li>${esc(routeName(screen, r))} — ${how}</li>`;
}

/** A step, and the routes it opens on this section. */
export function unlockCardHtml(screen: VerdictScreen, step: Step, routes: RouteResult[]): string {
  const means = unlockMeansOf(screen.ds, step.unlock, screen.answers);
  const taken = unlockProfile(step.unlock, screen.answers);
  return `
        <article class="unlock">
          <h3>${withStepHtml(esc(step.title))}</h3>
          ${means ? `<p class="unlock-means">${esc(means)}</p>` : ""}
          <ul>${routes.map((r) => unlockedRouteHtml(screen, r, taken)).join("")}
          </ul>
        </article>`;
}
