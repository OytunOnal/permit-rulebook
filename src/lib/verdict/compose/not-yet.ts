// @level presentation
import { declaredPlace, joinOr, type Dataset } from "permit-rulebook-data";
import {
  routesInCountryWhereYouToldUs, routesInCountryYouAreNotLookingAt, routesNeed, routesNeedSeeStepsAbove,
} from "../../copy/verdict.js";
import { countryOf } from "../../countries.js";
import { esc } from "../../reason.js";
import { phraseOfAnswerRef } from "./answer-phrase.js";
import type { VerdictScreen } from "./card/cards.js";
import { drawnRouteHtml, type DrawnCards } from "./drawn-cards.js";
import type { AnswerRef, Fold } from "./verdict-layout.js";

/** The path answers a fold's rows ask for, named by the dataset, each name
 * once. Fixed copy ("a job offer, transfer or hosting agreement") told a user
 * who had declared a transfer that they needed one (review). */
const pathAnswersNamed = (ds: Dataset, answers: AnswerRef[]): string[] =>
  [...new Set(answers.map((a) => phraseOfAnswerRef(ds, a)))];

function needsPathAnswersSummary(ds: Dataset, fold: Extract<Fold, { kind: "needs-path-answers" }>): string {
  const pathAnswers = joinOr(pathAnswersNamed(ds, fold.pathAnswers));
  return fold.pointsUp ? routesNeedSeeStepsAbove(fold.routes.length, pathAnswers) : routesNeed(fold.routes.length, pathAnswers);
}

/** The rows placed in another country, said by the country's name and, where
 * the reader declared one, the place they told us. */
function elsewhereSummary(screen: VerdictScreen, fold: Extract<Fold, { kind: "elsewhere" }>): string {
  const told = declaredPlace(screen.ds, screen.answers) ?? null;
  const country = countryOf(screen.ds, fold.country).name;
  return told
    ? routesInCountryWhereYouToldUs(fold.routes.length, country, told)
    : routesInCountryYouAreNotLookingAt(fold.routes.length, country);
}

const drawnRoutesHtml = (cards: DrawnCards, routes: string[]): string =>
  routes.map((id) => drawnRouteHtml(cards, id)).join("");

function foldHtml(screen: VerdictScreen, fold: Fold, cards: DrawnCards): string {
  if (fold.kind === "needs-path-answers")
    return `<details class="hold-group"${fold.open ? " open" : ""}>
          <summary>${esc(needsPathAnswersSummary(screen.ds, fold))}</summary>
          <div class="hold-group-body">${drawnRoutesHtml(cards, fold.routes)}</div>
        </details>`;
  return `<details class="hold-group">
            <summary>${esc(elsewhereSummary(screen, fold))}</summary>
            <div class="hold-group-body">${drawnRoutesHtml(cards, fold.routes)}</div>
          </details>`;
}

/** The not-yet group's rows and folds, in the order the layout lists them:
 * each row its own drawn card, each fold under its summary line. */
export const notYetItemsHtml = (screen: VerdictScreen, items: (string | Fold)[], cards: DrawnCards): string =>
  items.map((item) => (typeof item === "string" ? drawnRouteHtml(cards, item) : foldHtml(screen, item, cards))).join("");
