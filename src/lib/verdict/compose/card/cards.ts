// @level presentation
import {
  closedBy, learnLinkOf, liveUnknowns, noticeSources, shortLabelOf, unlockMeansOf, unlockProfile, unlockTitleOf,
  type Dataset, type Notice, type Profile, type RouteResult,
} from "permit-rulebook-data";
import type { CardScreen } from "./blocks/card-screen.js";
import { provenanceHtml, sourceLinkHtml, srcLine } from "./blocks/provenance.js";
import { railHtml } from "./blocks/rail.js";
import { carveOutHtml, caveatHtml, precondHtml, readingHtml, scopedHtml } from "./blocks/route-statements.js";
import {
  CAME_FROM_LINE, FIND_OUT_YOURSELF, LOWER_THRESHOLD_HINT, POINTS_TABLE_HINT, RULES_MET, STATUS_LABEL, WOULD_BE_MET,
  WOULD_COME_WITHIN_REACH, orAbove, pointsMore, pointsOfNeeded, shortByPoints, withStepHtml,
} from "../../../copy/verdict.js";
import { countryOf } from "../../../countries.js";
// A symbol a stranger cannot read is explained the first time a screen uses
// it, on the screen's own memory: the card's citations, statements, readings
// and learn labels are glossed as the route page's are (#151, ruling 8). Each
// block takes the screen's memory; one drawn alone is a screen of its own.
import { type Glossary, glossSection, glossed } from "../../../gloss.js";
import { glossedLearnLinkText } from "../../../quote.js";
import { esc, escAttr, failDetailHtml, whyHtml } from "../../../reason.js";
import { url } from "../../../site.js";
import { routePath } from "../../../slug.js";
import { moneyShortfallOf } from "../money-shortfall.js";
import type { Step } from "../steps.js";

/**
 * The blocks of a card that state what the dataset itself says: what else is
 * required, what the source qualifies, which threshold the person was measured
 * against, and the quotes behind all of it.
 *
 * They live here for the reason `reason.ts` does: what the page renders has to
 * be readable by a test. The orientation year modelled "you have no job offer
 * yet" as a rule and failed people the Dutch immigration service does not fail
 * (2026-09-07); the rail labelled a route met through the €3,122 path with
 * €4,357 and drew the reader's own band below that line, so one card carried a
 * verdict and a picture of the same person failing (2026-09-07). Neither is
 * caught by reading the markup in the page — only by reading the markup.
 */

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
export function notYetRowHtml(screen: VerdictScreen, r: RouteResult): string {
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

/** A step's title, as its card, the steps group and the headline's Nearest
 * say it: the row's own, "… or above" where higher rungs folded into it. */
export function composeStepTitle(screen: VerdictScreen, step: Step): string {
  const title = unlockTitleOf(screen.ds, step.unlock, screen.answers);
  return step.folded.length ? orAbove(title) : title;
}

/** A step, and the routes it opens on this section. */
export function stepCardHtml(screen: VerdictScreen, step: Step, routes: RouteResult[]): string {
  const means = unlockMeansOf(screen.ds, step.unlock, screen.answers);
  const taken = unlockProfile(step.unlock, screen.answers);
  return `
        <article class="unlock">
          <h3>${withStepHtml(esc(composeStepTitle(screen, step)))}</h3>
          ${means ? `<p class="unlock-means">${esc(means)}</p>` : ""}
          <ul>${routes.map((r) => unlockedRouteHtml(screen, r, taken)).join("")}
          </ul>
        </article>`;
}

/**
 * A route the authority closes to this reader's passport.
 *
 * It is not a verdict the rules computed and it is not a shortfall, so it gets
 * neither a card nor a "not yet" row: "not yet" invites a reader back with a
 * better salary, and this permit will never be theirs however the rest of the
 * interview goes. What the row owes them is the two things the product exists
 * for — what the authority decided, and the sentence it decided it in.
 *
 * The words are the dataset's. A closure is the one criterion whose reason
 * cannot be composed from the answers it names, so it carries its own sentence
 * and this prints it (s8).
 */
export function closedRowHtml(r: RouteResult, seen: Glossary = new Set()): string {
  const closures = closedBy(r);
  if (!closures.length) return "";
  return `
        <article class="closed">
          <h3><span class="country">${esc(r.country)}</span> ${esc(r.route.name)}</h3>
          ${closures.map((cr) => {
    const c = cr.criterion;
    if (c.op !== "not-in") return "";
    return `<p class="why">${esc(glossed(c.text, seen))}</p>${srcLine(c.source, seen)}`;
  }).join("")}
          <div class="foot">${sourceLinkHtml(r.route.info_url)}</div>
        </article>`;
}

/**
 * A notice, on the results screen.
 *
 * It is drawn here for the reason every other block is: a test reads the
 * markup, and a notice has more to get wrong than a title and a body. A
 * notice may stand on several authorities —
 * the Algerian talent question reports two of them disagreeing and a third
 * page saying what the reader gets instead — so every side is printed, each
 * quote framed with its own language, and the link at the foot is the page the
 * notice sends the reader to rather than whichever source it leads with (s8).
 */
export function noticeHtml(n: Notice, seen: Glossary = new Set()): string {
  const title = esc(glossed(n.title, seen));
  const body = esc(glossed(n.body, seen));
  const sources = noticeSources(n).map((value) => srcLine(value, seen)).join("");
  const next = n.learn
    ? `<a class="next" href="${escAttr(n.learn.url)}" target="_blank" rel="noopener">${
      esc(glossedLearnLinkText(n.learn, seen))}</a>`
    : sourceLinkHtml(n.source.source_url);
  return `
        <article class="notice ${escAttr(n.kind)}">
          <h3>${title}</h3>
          <p class="why">${body}</p>
          <div class="foot">
            <div class="srcs">${sources}</div>
            ${next}
          </div>
        </article>`;
}

/**
 * The points tally, on every card that scores one (s23, F4).
 *
 * The open Opportunity Card printed "6 points — 6 needed · English +1 …" and
 * the not-yet one printed nothing: the reader nearest to a verdict could not
 * see how near (v1.1 gate critique, F4). The engine attaches the tally to a
 * not-yet result as readily as to a met one — the points path stays open
 * while its unknowns are — so the line is a function of the result, rendered
 * here once, and the two cards cannot differ on it.
 */
function pointsLineHtml(ds: Dataset, r: RouteResult): string {
  const p = r.points;
  if (!p) return "";
  const items = p.items.length
    ? " · " + p.items.map((i) => `${esc(shortLabelOf(ds, i.field))} +${i.points}`).join(" · ")
    : "";
  // The met colour only where the points are met: on a not-yet card the
  // tally is a count, and the verdict colour would say otherwise.
  return `<div class="ptsline ${p.scored >= p.required ? "met" : "short"}"><b>${
    esc(pointsOfNeeded(p.scored, p.required))}</b>${items}</div>`;
}

/**
 * The way to look an unknown up, on the card it still binds — the dataset's
 * own `learn` link, never hardcoded (s3).
 *
 * Only where the unknown still binds: on a hard-failed route finding out
 * changes nothing, and the link sends the reader down a path that cannot open
 * (critique #4). The box ends on the link, with no full stop after it: the
 * link is a tap-height box a line cannot break inside, so on a phone a stop
 * after it wraps onto a line of its own (v1.1 gate critique, P5), as the
 * route page's own box has it.
 *
 * The label is the text of the link: a link says what the reader does there.
 * It is glossed like the rest of the card's words, on the screen's memory
 * (#151, ruling 8); the dataset's contract keeps citations out of it, whose
 * explainer would make a sentence underlined end to end (s28). Where the page
 * is a consolidated text, the glossed label is followed by what the page is
 * (#158). Any route the label names is said in full (#159).
 */
function learnBoxHtml(screen: CardScreen, r: RouteResult): string {
  const { ds, answers, glossary: seen = new Set() } = screen;
  const links = liveUnknowns(r, answers)
    .map((f) => learnLinkOf(ds, f))
    .filter((l): l is { label: string; url: string } => !!l);
  if (!links.length) return "";
  return `<div class="learn">${esc(FIND_OUT_YOURSELF)} ${links
    .map((l) => `<a href="${escAttr(l.url)}" target="_blank" rel="noopener">${
      esc(glossedLearnLinkText(l, seen))}</a>`)
    .join(" · ")}</div>`;
}
