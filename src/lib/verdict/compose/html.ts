// @level presentation
import { joinOr, type Dataset, type Profile, type RouteResult } from "permit-rulebook-data";
import {
  CLOSED_HEADING, NOT_YET_HEADING, OPEN_HEADING, SEEK_HINT, STEPS_HEADING, STEPS_HEADING_TAIL, STEPS_HERE_HEADING, SUMMARY_LABEL,
  UNSETTLED_HEADING, UNSETTLED_SECTION_LINE, WITHIN_REACH_HEADING, arrangedLine, notOpenToPassportCount, notYetCount,
  notYetWithUnknowns, openCount, resultFeedbackLine, routesInCountryWhereYouToldUs,
  routesInCountryYouAreNotLookingAt, routesNeed, routesNeedSeeStepsAbove, unlockingSteps, unsettledCount,
  withinReachCount, writeJobOfferLine,
} from "../../copy/verdict.js";
import { FEEDBACK } from "../../copy/frame.js";
import { FEEDBACK_PATH } from "../../identity.js";
import { esc, escAttr } from "../../reason.js";
import { url } from "../../site.js";
import { isExploring } from "./steps.js";
import type { CountrySection, Fold, RouteCard, Strip, Tally, VerdictGroup } from "./types.js";

/** A group's heading words and the class its colour is read from. */
const HEAD: Record<"open" | "unsettled" | "within-reach" | "not-yet" | "closed", { title: string; cls: string }> = {
  "open": { title: OPEN_HEADING, cls: "" },
  "unsettled": { title: UNSETTLED_HEADING, cls: "unsettled" },
  "within-reach": { title: WITHIN_REACH_HEADING, cls: "near" },
  "not-yet": { title: NOT_YET_HEADING, cls: "hold" },
  "closed": { title: CLOSED_HEADING, cls: "closed" },
};

/** A group under its heading. A heading, not a styled div: a reader using
 * headings to move could find no section while the results had none above
 * H3 (critique F16). */
const headedGroupHtml = (head: { title: string; cls: string }, inner: string, count: number): string =>
  `<h2 class="ghead ${head.cls}"><b>${esc(head.title)}</b> (${count})</h2><div class="stack">${inner}</div>`;

const cardsHtml = (cards: RouteCard[]): string => cards.map((c) => c.html).join("");

function needsPathAnswersSummary(fold: Extract<Fold, { kind: "needs-path-answers" }>): string {
  const pathAnswers = joinOr(fold.pathAnswers);
  return fold.pointsUp ? routesNeedSeeStepsAbove(fold.cards.length, pathAnswers) : routesNeed(fold.cards.length, pathAnswers);
}

function foldHtml(fold: Fold): string {
  if (fold.kind === "needs-path-answers")
    return `<details class="hold-group"${fold.open ? " open" : ""}>
          <summary>${esc(needsPathAnswersSummary(fold))}</summary>
          <div class="hold-group-body">${cardsHtml(fold.cards)}</div>
        </details>`;
  const summary = fold.told
    ? routesInCountryWhereYouToldUs(fold.cards.length, fold.country, fold.told)
    : routesInCountryYouAreNotLookingAt(fold.cards.length, fold.country);
  return `<details class="hold-group">
            <summary>${esc(summary)}</summary>
            <div class="hold-group-body">${cardsHtml(fold.cards)}</div>
          </details>`;
}

/**
 * The job-search sentence under the steps, for the reader it is true of
 * (s23, F1a): an explorer with an open job-search permit above.
 */
export function seekHintHtml(ds: Dataset, results: RouteResult[], answers: Profile): string {
  if (!isExploring(ds, answers)) return "";
  if (!results.some((r) => r.route.kind === "seek" && r.status !== "hold")) return "";
  return `<p class="unlock-hint">${esc(SEEK_HINT)}</p>`;
}

/** One group's markup; `stepsHeading` is the steps group's heading, which
 * the layout words. */
function groupHtml(group: VerdictGroup, stepsHeading: string): string {
  switch (group.kind) {
    case "steps": {
      const jobOfferLineHtml = group.jobOfferLine ? `<p class="job-offer-line">${esc(writeJobOfferLine(group.jobOfferLine))}</p>` : "";
      return stepsHeading + jobOfferLineHtml + group.steps.map((s) => s.html).join("") + group.hint;
    }
    case "arranged":
      // A paragraph of its own, not a step card, under no heading.
      return `<p class="arranged-line">${esc(arrangedLine(group))}</p>`;
    case "not-yet":
      return headedGroupHtml(HEAD["not-yet"], group.items.map((i) => ("kind" in i ? foldHtml(i) : i.html)).join(""), group.count);
    case "unsettled":
      // The line names no country and no passport: the notice above does.
      return headedGroupHtml(HEAD.unsettled, `<p class="why">${esc(UNSETTLED_SECTION_LINE)}</p>${cardsHtml(group.cards)}`, group.cards.length);
    default:
      return headedGroupHtml(HEAD[group.kind], cardsHtml(group.cards), group.cards.length);
  }
}

const groupsHtml = (groups: VerdictGroup[], stepsHeading: string): string =>
  groups.map((g) => groupHtml(g, stepsHeading)).join("");

export function stripHtml(s: Strip): string {
  const hold = s.openUnknowns ? notYetWithUnknowns(s.notYet, s.openUnknowns) : notYetCount(s.notYet);
  return `<div class="strip" aria-label="${escAttr(SUMMARY_LABEL)}">
          <span class="s-met">${esc(openCount(s.open))}</span>
          <span class="s-near">${esc(withinReachCount(s.withinReach))}</span>
          ${s.unsettled ? `<span class="s-unsettled">${esc(unsettledCount(s.unsettled))}</span>` : ""}
          ${s.closed ? `<span class="s-closed">${esc(notOpenToPassportCount(s.closed))}</span>` : ""}
          <span class="s-hold">${esc(hold)}</span>
        </div>`;
}

/** A country's not-yet count, or the s19 sentence that stands in its place
 * (s21). */
function notYetPart(t: Tally): string {
  if (t.closedTo) return t.closedTo.html;
  if (!t.notYet) return "";
  return esc(t.openUnknowns ? notYetWithUnknowns(t.notYet, t.openUnknowns) : notYetCount(t.notYet));
}

function tallyHtml(t: Tally): string {
  return [
    t.open ? esc(openCount(t.open)) : "",
    t.unsettled ? esc(unsettledCount(t.unsettled)) : "",
    t.withinReach ? esc(withinReachCount(t.withinReach)) : "",
    notYetPart(t),
    t.closed ? esc(notOpenToPassportCount(t.closed)) : "",
    t.steps ? `<i>${esc(unlockingSteps(t.steps))}</i>` : "",
  ].filter(Boolean).join(" · ");
}

const STEPS_HERE = `<h2 class="ghead unlockh"><b>${esc(STEPS_HERE_HEADING)}</b></h2>`;

export function countrySectionHtml(c: CountrySection): string {
  const said = c.tally.closedTo !== null;
  return `<details class="country-sec"${c.open ? " open" : ""}>
            <summary${said ? ` class="said"` : ""}><span class="cname">${esc(c.name)}</span> <span class="tally${said ? " said" : ""}">${tallyHtml(c.tally)}</span></summary>
            <div class="cbody">${groupsHtml(c.groups, STEPS_HERE)}</div>
          </details>`;
}

const STEPS_FLAT = `<h2 class="ghead unlockh"><b>${esc(STEPS_HEADING)}</b> — ${esc(STEPS_HEADING_TAIL)}</h2>`;

/** The flat layout's groups, under one steps heading of its own. */
export const flatGroupsHtml = (groups: VerdictGroup[]): string => groupsHtml(groups, STEPS_FLAT);

/**
 * The offer, at the end of the body: after the last section and before the
 * footer — quieter than a card, louder than the footer, never between the
 * reader and what they came for (the human's walk, 2026-09-16). A link to
 * `/feedback/` carrying nothing at all: not the record, not the query
 * string, not the screen. It is drawn with the sections, which are the
 * results screen's own, so it never reaches a question screen.
 */
export const feedbackLineHtml = (): string =>
  `<p class="say">${resultFeedbackLine(`<a href="${escAttr(url(FEEDBACK_PATH))}">${esc(FEEDBACK)}</a>`)}</p>`;
