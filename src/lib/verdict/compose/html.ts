// @level presentation
import { SITUATION_FIELD, findJobOfferAnswer, phraseOf, subjectOf, type Dataset } from "permit-rulebook-data";
import {
  CLOSED_HEADING, NOT_YET_HEADING, OPEN_HEADING, SEEK_HINT, SHORT_ON_A_FIGURE_HEADING, STEPS_HEADING, STEPS_HEADING_TAIL,
  STEPS_HERE_HEADING, SUMMARY_LABEL, UNSETTLED_HEADING, UNSETTLED_SECTION_LINE, arrangedLine,
  moreWithDifferentSituationCount, moreWithJobOfferCount, notOpenToPassportCount, notYetCount, notYetWithUnknowns,
  openCount, resultFeedbackLine, shortOnAFigureCount, unlockingSteps, unsettledCount, writeJobOfferLine,
} from "../../copy/verdict.js";
import { FEEDBACK } from "../../copy/frame.js";
import { countryOf } from "../../countries.js";
import { esc, escAttr } from "../../reason.js";
import { FEEDBACK_PATH, url } from "../../site.js";
import { phraseOfAnswer, phraseOfAnswerRef } from "./answer-phrase.js";
import type { VerdictScreen } from "./card/cards.js";
import { drawnRoutesHtml, drawnStepCard, type DrawnCards } from "./drawn-cards.js";
import { notYetItemsHtml } from "./not-yet.js";
import { unscoredTally } from "./unscored.js";
import type {
  ArrangedLine, CountrySection, JobOfferLine, Strip, Tally, VerdictGroup, VerdictLayout,
} from "./verdict-layout.js";

/** What the body is drawn from: the screen it words things on, and the cards
 * already drawn, by id. */
interface BodyDrawing {
  screen: VerdictScreen;
  cards: DrawnCards;
}

/** A group's heading words and the class its colour is read from. */
const HEAD: Record<"open" | "unsettled" | "within-reach" | "not-yet" | "closed", { title: string; cls: string }> = {
  "open": { title: OPEN_HEADING, cls: "" },
  "unsettled": { title: UNSETTLED_HEADING, cls: "unsettled" },
  "within-reach": { title: SHORT_ON_A_FIGURE_HEADING, cls: "near" },
  "not-yet": { title: NOT_YET_HEADING, cls: "hold" },
  "closed": { title: CLOSED_HEADING, cls: "closed" },
};

/** A group under its heading. A heading, not a styled div: a reader using
 * headings to move could find no section while the results had none above
 * H3 (critique F16). */
const headedGroupHtml = (head: { title: string; cls: string }, inner: string, count: number): string =>
  `<h2 class="ghead ${head.cls}"><b>${esc(head.title)}</b> (${count})</h2><div class="stack">${inner}</div>`;

/** A field as running text names it: its `subject`. A field with none is
 * refused rather than named by its id. */
function nameFieldBySubject(ds: Dataset, field: string): string {
  if (ds.fields.find((f) => f.id === field)?.subject === undefined)
    throw new Error(`"${field}" has no subject for the job offer line to name it by`);
  return subjectOf(ds, field);
}

/**
 * One country's job offer line, in the dataset's words: the job offer by its
 * phrase, the country by its in-sentence phrase, and the questions the freed
 * routes would ask next by their subjects.
 */
const jobOfferLineHtml = (ds: Dataset, line: JobOfferLine): string =>
  `<p class="job-offer-line">${esc(writeJobOfferLine({
    jobOffer: phraseOfAnswer(findJobOfferAnswer(ds)), country: phraseOf(line.country), routes: line.routes,
    fields: line.fields.map((f) => nameFieldBySubject(ds, f)),
  }))}</p>`;

/** One country's arranged line, in the dataset's words: each answer by its
 * phrase, the country by its in-sentence phrase. A paragraph of its own, not
 * a step card, under no heading. */
function arrangedLineHtml(ds: Dataset, line: ArrangedLine): string {
  const answers = line.answers.map((answer) => ({ answer: phraseOfAnswerRef(ds, answer), routes: answer.routes }));
  return `<p class="arranged-line">${esc(arrangedLine({ country: phraseOf(line.country), answers }))}</p>`;
}

/** The job-search sentence under the steps, where the layout stands it (s23, F1a). */
const SEEK_HINT_HTML = `<p class="unlock-hint">${esc(SEEK_HINT)}</p>`;

/** One group's markup; `stepsHeading` is the steps group's heading, which
 * the layout words. */
function groupHtml(drawing: BodyDrawing, group: VerdictGroup, stepsHeading: string): string {
  const { screen, cards } = drawing;
  switch (group.kind) {
    case "steps": {
      const line = group.jobOfferLine ? jobOfferLineHtml(screen.ds, group.jobOfferLine) : "";
      const steps = group.steps.map((s) => drawnStepCard(cards, s.id).html).join("");
      return stepsHeading + line + steps + (group.hint ? SEEK_HINT_HTML : "");
    }
    case "arranged":
      return arrangedLineHtml(screen.ds, group);
    case "not-yet":
      return headedGroupHtml(HEAD["not-yet"], notYetItemsHtml(screen, group.items, cards), group.count);
    case "unsettled":
      // The line names no country and no passport: the notice above does.
      return headedGroupHtml(HEAD.unsettled, `<p class="why">${esc(UNSETTLED_SECTION_LINE)}</p>${drawnRoutesHtml(cards, group.routes)}`, group.routes.length);
    default:
      return headedGroupHtml(HEAD[group.kind], drawnRoutesHtml(cards, group.routes), group.routes.length);
  }
}

const groupsHtml = (drawing: BodyDrawing, groups: VerdictGroup[], stepsHeading: string): string =>
  groups.map((g) => groupHtml(drawing, g, stepsHeading)).join("");

function stripHtml(s: Strip): string {
  const hold = s.openUnknowns ? notYetWithUnknowns(s.notYet, s.openUnknowns) : notYetCount(s.notYet);
  return `<div class="strip" aria-label="${escAttr(SUMMARY_LABEL)}">
          <span class="s-met">${esc(openCount(s.open))}</span>
          <span class="s-near">${esc(shortOnAFigureCount(s.withinReach))}</span>
          ${s.unsettled ? `<span class="s-unsettled">${esc(unsettledCount(s.unsettled))}</span>` : ""}
          ${s.closed ? `<span class="s-closed">${esc(notOpenToPassportCount(s.closed))}</span>` : ""}
          <span class="s-hold">${esc(hold)}</span>
        </div>`;
}

/** The s19 sentence that stands in a country's not-yet count, where the
 * layout says its scored routes do not take the reader's situation (s21). */
function closedToHtml(screen: VerdictScreen, code: string): string {
  const said = unscoredTally(screen.ds, countryOf(screen.ds, code), screen.answers[SITUATION_FIELD]);
  if (!said) throw new Error(`the layout says ${code} does not take the situation, and its mark says nothing`);
  return said.html;
}

/** A country's not-yet count, or the s19 sentence that stands in its place
 * (s21). */
function notYetPart(screen: VerdictScreen, section: CountrySection): string {
  const { tally } = section;
  if (tally.situationNotTaken) return closedToHtml(screen, section.country);
  if (!tally.notYet) return "";
  return esc(tally.openUnknowns ? notYetWithUnknowns(tally.notYet, tally.openUnknowns) : notYetCount(tally.notYet));
}

function tallyHtml(screen: VerdictScreen, section: CountrySection): string {
  const tally: Tally = section.tally;
  return [
    tally.open ? esc(openCount(tally.open)) : "",
    tally.unsettled ? esc(unsettledCount(tally.unsettled)) : "",
    tally.withinReach ? esc(shortOnAFigureCount(tally.withinReach)) : "",
    notYetPart(screen, section),
    tally.closed ? esc(notOpenToPassportCount(tally.closed)) : "",
    tally.steps ? `<i>${esc(unlockingSteps(tally.steps))}</i>` : "",
    tally.checkedWithJobOffer ? `<i>${esc(moreWithJobOfferCount(tally.checkedWithJobOffer))}</i>` : "",
    tally.openedByArrangedAnswers ? `<i>${esc(moreWithDifferentSituationCount(tally.openedByArrangedAnswers))}</i>` : "",
  ].filter(Boolean).join(" · ");
}

const STEPS_HERE = `<h2 class="ghead unlockh"><b>${esc(STEPS_HERE_HEADING)}</b></h2>`;

function countrySectionHtml(drawing: BodyDrawing, section: CountrySection): string {
  const said = section.tally.situationNotTaken;
  const name = countryOf(drawing.screen.ds, section.country).name;
  return `<details class="country-sec"${section.open ? " open" : ""}>
            <summary${said ? ` class="said"` : ""}><span class="cname">${esc(name)}</span> <span class="tally${said ? " said" : ""}">${tallyHtml(drawing.screen, section)}</span></summary>
            <div class="cbody">${groupsHtml(drawing, section.groups, STEPS_HERE)}</div>
          </details>`;
}

const STEPS_FLAT = `<h2 class="ghead unlockh"><b>${esc(STEPS_HEADING)}</b> — ${esc(STEPS_HEADING_TAIL)}</h2>`;

/**
 * The offer, at the end of the body: after the last section and before the
 * footer — quieter than a card, louder than the footer, never between the
 * reader and what they came for (the human's walk, 2026-09-16). A link to
 * `/feedback/` carrying nothing at all: not the record, not the query
 * string, not the screen. It is drawn with the sections, which are the
 * results screen's own, so it never reaches a question screen.
 */
const feedbackLineHtml = (): string =>
  `<p class="say">${resultFeedbackLine(`<a href="${escAttr(url(FEEDBACK_PATH))}">${esc(FEEDBACK)}</a>`)}</p>`;

/** The body under the notices, drawn from the layout and the cards drawn for
 * it: the strip, the flat groups or a section per country, and the offer;
 * nothing on the notice screen. */
export function bodyHtml(screen: VerdictScreen, layout: VerdictLayout, cards: DrawnCards): string {
  const drawing: BodyDrawing = { screen, cards };
  switch (layout.kind) {
    case "notice":
      return "";
    case "one-country":
      return stripHtml(layout.strip) + groupsHtml(drawing, layout.groups, STEPS_FLAT) + feedbackLineHtml();
    case "countries":
      return stripHtml(layout.strip) + layout.sections.map((s) => countrySectionHtml(drawing, s)).join("") + feedbackLineHtml();
  }
}
