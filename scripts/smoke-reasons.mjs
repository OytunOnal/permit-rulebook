// @level domain
/**
 * The names smoke's report is made of, declared once: every reason a page
 * load fails with or smoke refuses to walk with, and every kind of page load. `smoke.mjs` judges with them
 * and `cli-smoke.mjs` words them; neither imports the other.
 *
 * A failure is `{ reason, ...the values its words need }`; the values a
 * reason carries are named beside it, and a reason with none carries none.
 */

/** Every reason a page load fails with, one list for the job that judges and the CLI that words. */
export const SMOKE_REASONS = Object.freeze({
  noQuestion: "no-question",
  noAnswers: "no-answers",
  noDeclarationPanel: "no-declaration-panel",
  /** `{ stamp }`, what the interview's stamp reads. */
  stampNotRulesReadDate: "stamp-not-rules-read-date",
  /** `{ stamp }`, the rules-read stamp's date as the page gives it. */
  stampNotADate: "stamp-not-a-date",
  /** `{ rules }`, how many rule cards rendered. */
  tooFewRuleCards: "too-few-rule-cards",
  /** `{ cta, interview }`, the call to action's link and the interview's address it should lead into. */
  callToActionOutsideInterview: "call-to-action-outside-interview",
  /** `{ label }`, the header's missing link. */
  headerLacks: "header-lacks",
  /** `{ here }`, the country the header marks. */
  headerMarksAnotherCountry: "header-marks-another-country",
  /** `{ cards }`, how many route cards rendered. */
  tooFewRouteCards: "too-few-route-cards",
  firstRouteUnnamed: "first-route-unnamed",
  /** `{ heading }`, the page's heading. */
  headingNotTheData: "heading-not-the-data",
  /** `{ facts }`, how many facts about the dataset rendered. */
  tooFewFacts: "too-few-facts",
  datasetNotOffered: "dataset-not-offered",
  /** `{ marked }`, every header link marked as the current page. */
  headerMarksAnotherPage: "header-marks-another-page",
  /** `{ message }`, why the probe could not read the page. */
  pageUnreadable: "page-unreadable",
  /** `{ message }`, what the page threw or logged. */
  pageThrew: "page-threw",
  /** `{ count }`, how many errors came after the walk had kept its cap. */
  errorsPastCap: "errors-past-cap",
  /** `{ buildDirectory }`, the build directory that is not there to walk: a `SmokeRefusal`'s reason, not a page load's. */
  noBuild: "no-build",
});

/**
 * Smoke's refusal to walk: `reason` is one of `SMOKE_REASONS`, beside it the
 * values its words need, as a failure carries them. Its message is the reason
 * alone; the words are the CLI's.
 */
export class SmokeRefusal extends Error {
  constructor(reason, values) {
    super(reason);
    this.name = "SmokeRefusal";
    Object.assign(this, values, { reason });
  }
}

/**
 * What a page load is: a check's page, whose path names the check; errors at
 * an address none of the checks opened; or the errors past the walk's cap,
 * which keep no address.
 */
export const PAGE_LOAD_KINDS = Object.freeze({
  check: "check",
  unplaced: "unplaced",
  pastTheCap: "past-the-cap",
});
