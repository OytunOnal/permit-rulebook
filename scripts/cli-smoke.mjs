// @level presentation
/**
 * The smoke command's arguments and report: `--dev` or `--dist` as the
 * surfaces `smoke` in `smoke.mjs` walks, and the page loads it returns as
 * lines and an exit code. Every word of the report is here: each page's name
 * and each reason's sentence, from the names `smoke-reasons.mjs` declares.
 * It reads, runs and prints nothing; `main-smoke.mjs` prints what it returns.
 */
import { PAGE_LOAD_KINDS, SMOKE_REASONS } from "./smoke-reasons.mjs";

/**
 * The options a run's arguments ask `smoke` for: `--dev` or `--dist` alone,
 * or none, which leaves the job its default surfaces.
 */
export function smokeOptionsOf(args) {
  if (args.includes("--dev")) return { surfaces: ["dev"] };
  if (args.includes("--dist")) return { surfaces: ["dist"] };
  return {};
}

/** Each reason's sentence, made from the values its failure carries. */
const SENTENCES = new Map([
  [SMOKE_REASONS.noQuestion, () => "no question is on the screen"],
  [SMOKE_REASONS.noAnswers, () => "the question has no answers to pick from"],
  [SMOKE_REASONS.noDeclarationPanel, () => "the declaration panel is missing"],
  [SMOKE_REASONS.stampNotRulesReadDate, ({ stamp }) => `the stamp reads "${stamp}", not the rules-read date`],
  [SMOKE_REASONS.stampNotADate, ({ stamp }) => `the rules-read stamp is "${stamp}"`],
  [SMOKE_REASONS.tooFewRuleCards, ({ rules }) => `only ${rules} rule cards rendered`],
  [SMOKE_REASONS.callToActionOutsideInterview,
    ({ cta, interview }) => `the call to action is "${cta}", not a link into the interview at ${interview}`],
  [SMOKE_REASONS.headerLacks, ({ label }) => `the header does not offer ${label}`],
  [SMOKE_REASONS.headerMarksAnotherCountry, ({ here }) => `the header marks "${here}", not the country you are on`],
  [SMOKE_REASONS.tooFewRouteCards, ({ cards }) => `only ${cards} route cards rendered`],
  [SMOKE_REASONS.firstRouteUnnamed, () => "the first route has no name"],
  [SMOKE_REASONS.headingNotTheData, ({ heading }) => `the heading is "${heading}"`],
  [SMOKE_REASONS.tooFewFacts, ({ facts }) => `only ${facts} facts about the dataset`],
  [SMOKE_REASONS.datasetNotOffered, () => "the whole dataset is not offered"],
  [SMOKE_REASONS.headerMarksAnotherPage, ({ marked }) => `the header marks "${marked.join(", ")}", not The data`],
  [SMOKE_REASONS.pageUnreadable, ({ message }) => `the page could not even be read — ${message}`],
  [SMOKE_REASONS.pageThrew, ({ message }) => `the page threw — ${message}`],
  [SMOKE_REASONS.errorsPastCap, ({ count }) => `and ${count} more errors past the walk's cap, not placed on any page`],
]);

/** What the report calls each check's page, by the check's path. */
const CHECK_PAGE_NAMES = new Map([
  ["/", "the interview"],
  ["/germany/eu-blue-card-general/", "a route page"],
  ["/germany/", "a country page"],
  ["/data/", "the data page"],
]);

/** What the report calls a page load that is no check's page, by its kind. */
const KIND_NAMES = new Map([
  [PAGE_LOAD_KINDS.unplaced, "an address none of smoke's checks opens"],
  [PAGE_LOAD_KINDS.pastTheCap, "errors past the walk's cap"],
]);

/** The sentence the report prints for `failure`; a reason with no words here stops the run naming it. */
function sentenceOf(failure) {
  const sentence = SENTENCES.get(failure.reason);
  if (sentence === undefined) throw new Error(`add words for the reason "${failure.reason}" to SENTENCES in cli-smoke.mjs`);
  return sentence(failure);
}

/** What the report calls `pageLoad`'s page; a kind or a check's path with no name here stops the run naming it. */
function pageNameOf({ kind, path }) {
  const name = kind === PAGE_LOAD_KINDS.check ? CHECK_PAGE_NAMES.get(path) : KIND_NAMES.get(kind);
  if (name === undefined) throw new Error(`add a name for the ${kind} page load at ${path} to cli-smoke.mjs`);
  return name;
}

/** What a run prints for one page load: a FAIL line with its failures under it, or one ok line. */
function reportLinesOf(pageLoad) {
  const { surface, path, value, failures } = pageLoad;
  const name = pageNameOf(pageLoad);
  if (!failures.length) return [`ok   [${surface}] ${path} (${name}) — ${JSON.stringify(value)}, 0 console errors`];
  return [`FAIL [${surface}] ${path} (${name})`, ...failures.map((failure) => `     ${sentenceOf(failure)}`)];
}

/** What the command prints to stdout, and the code it exits with: 0 when no page load broke, 1 when one did. */
export function smokeReportOf(results) {
  const failed = results.filter((r) => r.failures.length).length;
  return {
    out: [...results.flatMap(reportLinesOf), `\n${results.length} page loads in a real browser — ${failed} broken`],
    exitCode: failed === 0 ? 0 : 1,
  };
}
