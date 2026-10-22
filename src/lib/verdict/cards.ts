// @level presentation
import {
  formatEURPer, liveUnknowns, shortLabelOf, unlockMeansOf, type RouteResult,
} from "permit-rulebook-data";
import {
  carveOutHtml, caveatHtml, learnBoxHtml, measuredCriterionOf, pointsLineHtml, precondHtml, provenanceHtml, railHtml,
  readingHtml, scopedHtml, sourceLinkHtml, type CardScreen,
} from "../card.js";
import {
  CAME_FROM_LINE, LOWER_THRESHOLD_HINT, POINTS_TABLE_HINT, RULES_MET, STATUS_LABEL, WOULD_BE_MET,
  WOULD_COME_WITHIN_REACH, onField, pointsMore, shortByPoints, shortByUpTo, withStepHtml,
} from "../copy.js";
import { countryOf } from "../countries.js";
import { type Glossary, glossSection, glossed } from "../gloss.js";
import { esc, escAttr, failDetailHtml, whyHtml } from "../reason.js";
import { url } from "../site.js";
import { routePath } from "../slug.js";
import type { Step } from "../steps.js";

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

/** How a full card is drawn: with its country's name or without (a country's
 * own section), and under "unsettled for your passport" or not. */
export interface CardLook {
  showCountry: boolean;
  unsettled: boolean;
}

const routeName = (screen: VerdictScreen, r: RouteResult): string => glossSection(r.route.name, screen.glossary);

/** Whether an unknown on this route is one the reader can still act on. */
export const hasLiveUnknown = (screen: VerdictScreen, r: RouteResult): boolean =>
  liveUnknowns(r, screen.answers).length > 0;

/** The money field a route's bounded gap is measured on — its period is
 * what makes "€1,585" readable as monthly or annual (critique #7). */
const gapFieldOf = (screen: VerdictScreen, r: RouteResult): string =>
  measuredCriterionOf(screen.ds, r, screen.answers)?.field ?? "";

/** One gap, one format, everywhere it is printed (card, headline, unlock). */
export function gapAmount(screen: VerdictScreen, r: RouteResult): string {
  const period = screen.ds.fields.find((f) => f.id === gapFieldOf(screen, r))?.period;
  return formatEURPer(Math.round(r.gap_max!), period);
}

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

/** "Short by up to …" on a route within reach on a bounded gap, with the
 * hint that a lower threshold may already apply where the gap is a salary. */
function gapNoteHtml(screen: VerdictScreen, r: RouteResult): string {
  if (r.status !== "near" || !r.gap_max) return "";
  const field = gapFieldOf(screen, r);
  const on = field ? ` ${esc(onField(shortLabelOf(screen.ds, field).toLowerCase()))}` : "";
  const hint = field === "salary_eur_year" ? ` ${esc(LOWER_THRESHOLD_HINT)}` : "";
  return `<div class="gapnote"><b>${esc(shortByUpTo(gapAmount(screen, r)))}</b>${on}.${hint}</div>`;
}

/** The same, for a route within reach on points. */
function pointsNoteHtml(r: RouteResult): string {
  if (r.status !== "near" || !r.gap_points) return "";
  return `<div class="gapnote"><b>${esc(shortByPoints(r.gap_points))}</b> ${esc(POINTS_TABLE_HINT)}</div>`;
}

/** A route that is open, within reach or unsettled, as a whole card. */
export function fullCard(screen: VerdictScreen, r: RouteResult, look: CardLook): string {
  const { ds } = screen;
  const badge = look.unsettled ? RULES_MET : STATUS_LABEL[r.status];
  return `
        <article class="route"${cameFromMark(screen, r)}>
          <div class="top">
            <div>${look.showCountry ? `<span class="country">${esc(countryOf(ds, r.country).name)}</span>` : ""}
              <h3>${esc(routeName(screen, r))}</h3></div>
            <span class="st ${look.unsettled ? "unsettled" : r.status}">${esc(badge)}</span>
          </div>
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
export function holdRow(screen: VerdictScreen, r: RouteResult): string {
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

/** How far a step would bring a route that it brings within reach. */
function reachAmount(screen: VerdictScreen, r: RouteResult): string {
  if (r.gap_max) return ` (${gapAmount(screen, r)})`;
  if (r.gap_points) return ` (${esc(pointsMore(r.gap_points))})`;
  return "";
}

/** One route a step opens, and how. */
function unlockedRouteHtml(screen: VerdictScreen, r: RouteResult): string {
  const how = r.status === "met"
    ? `<b>${esc(WOULD_BE_MET)}</b>`
    : `<i>${esc(WOULD_COME_WITHIN_REACH)}${reachAmount(screen, r)}</i>`;
  return `<li>${esc(routeName(screen, r))} — ${how}</li>`;
}

/** A step, and the routes it opens on this section. */
export function unlockCard(screen: VerdictScreen, step: Step, routes: RouteResult[]): string {
  const means = unlockMeansOf(screen.ds, step.unlock, screen.answers);
  return `
        <article class="unlock">
          <h3>${withStepHtml(esc(step.title))}</h3>
          ${means ? `<p class="unlock-means">${esc(means)}</p>` : ""}
          <ul>${routes.map((r) => unlockedRouteHtml(screen, r)).join("")}
          </ul>
        </article>`;
}
