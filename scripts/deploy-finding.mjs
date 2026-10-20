// @level domain
/**
 * What a scheduled or dispatched deploy found, in `deploy run failed`'s terms
 * (#117, decision 13). The words are the deploy's own, so they live in the
 * site; the data package's kept-issue CLI carries them to the tracker.
 *
 * @typedef {import("permit-rulebook-data/kept-issue").RunFinding} RunFinding
 */

/** The jobs whose red counts, in the order the body names them. IndexNow never reddens the run. */
const DEPLOY_JOBS = ["build", "deploy", "pin", "audit"];

/** `pin` is skipped whenever the run built the data commit the lock already names. */
const SKIPPED_BY_DESIGN = ["pin"];

/** Every result GitHub gives a job; anything else is results not read. */
const GITHUB_JOB_RESULT_WORDS = ["success", "failure", "cancelled", "skipped"];

/** Four job names and their results are well under this; longer text is not theirs. */
const JOB_RESULTS_LIMIT = 1024;

/** The issue's words. `jobsNotPassed` leads the one line that names the jobs. */
export const DEPLOY_FINDING_WORDS = {
  red: "A scheduled or dispatched deploy, which nobody watches, did not finish green.",
  jobsNotPassed: "Jobs that did not pass: ",
  published: "Today's page was published.",
  notPublished: "Today's page was not published.",
  unreadResults: "The report could not read the jobs' results, so it cannot say the deploy is green: ",
  /** Why the results could not be read, each ending the `unreadResults` line. */
  unreadReasons: {
    tooLong: `the text is longer than ${JOB_RESULTS_LIMIT} characters`,
    notJson: "the text is not JSON",
    notAnObject: "the text is not an object",
    /** @param {string} job */
    noKnownResult: (job) => `the job ${job} has no known result`,
  },
  closing: "Closed by a green scheduled or dispatched deploy.",
  run: "Run: ",
};

/**
 * The deploy's finding for its four jobs' results: green only when each passed
 * or was skipped by design; red naming the others, saying whether today's page
 * was published, and red too when the results cannot be read.
 *
 * @param {string} jobResults JSON: each job's name to its result
 * @param {string} runUrl the run the finding links
 * @returns {RunFinding}
 */
export function deployFindingOf(jobResults, runUrl) {
  const runLine = `${DEPLOY_FINDING_WORDS.run}${runUrl}`;
  const reading = readJobResults(jobResults);
  if (reading.kind === "unread") {
    return { kind: "red", body: [DEPLOY_FINDING_WORDS.red, `${DEPLOY_FINDING_WORDS.unreadResults}${reading.reason}.`, runLine].join("\n") };
  }
  const { results } = reading;
  const jobsThatDidNotPass = DEPLOY_JOBS.filter((job) => !hasPassed(job, results[job]));
  if (jobsThatDidNotPass.length === 0) return { kind: "green", closing: `${DEPLOY_FINDING_WORDS.closing} ${runLine}` };
  const jobsAndResultsText = jobsThatDidNotPass.map((job) => `${job} (${results[job]})`).join(", ");
  const publishedLine = results.deploy === "success" ? DEPLOY_FINDING_WORDS.published : DEPLOY_FINDING_WORDS.notPublished;
  const body = [DEPLOY_FINDING_WORDS.red, `${DEPLOY_FINDING_WORDS.jobsNotPassed}${jobsAndResultsText}`, publishedLine, runLine];
  return { kind: "red", body: body.join("\n") };
}

/**
 * @param {string} job
 * @param {string} result
 */
const hasPassed = (job, result) => result === "success" || (result === "skipped" && SKIPPED_BY_DESIGN.includes(job));

/**
 * Whether parsed JSON is an object of named values: not null, not an array.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
const isJsonObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Each deploy job's result, or why the text does not hold them.
 *
 * @param {string} text
 * @returns {{ kind: "read", results: Record<string, string> } | { kind: "unread", reason: string }}
 */
function readJobResults(text) {
  const reasons = DEPLOY_FINDING_WORDS.unreadReasons;
  if (text.length > JOB_RESULTS_LIMIT) return { kind: "unread", reason: reasons.tooLong };
  let results;
  try {
    results = JSON.parse(text);
  } catch {
    return { kind: "unread", reason: reasons.notJson };
  }
  if (!isJsonObject(results)) return { kind: "unread", reason: reasons.notAnObject };
  const jobWithNoKnownResult = DEPLOY_JOBS.find((job) => !GITHUB_JOB_RESULT_WORDS.includes(results[job]));
  if (jobWithNoKnownResult) return { kind: "unread", reason: reasons.noKnownResult(jobWithNoKnownResult) };
  return { kind: "read", results };
}
