import { describe, expect, it } from "vitest";
import { DEPLOY_FINDING_WORDS, deployFindingOf } from "../scripts/deploy-finding.mjs";

/**
 * The deploy's finding (#117, decision 13; site seam 7): what a scheduled or
 * dispatched run tells `deploy run failed`, from its four jobs' results.
 */

const RUN_URL = "https://github.com/OytunOnal/permit-rulebook/actions/runs/123";

/** The report's input: each job's result, as the workflow hands it over. */
const resultsOf = (results: Record<string, string>): string => JSON.stringify(results);

const ALL_PASSED = { build: "success", deploy: "success", pin: "success", audit: "success" };

/** The red finding's body, or a failure saying the finding was not red. */
function redBodyOf(results: string): string {
  const finding = deployFindingOf(results, RUN_URL);
  expect(finding.kind, "the finding is not red").toBe("red");
  return finding.kind === "red" ? finding.body : "";
}

/** The jobs the body's own line names, as `name (result)` after its declared lead. */
function jobsNamedIn(body: string): string[] {
  const line = body.split("\n").find((l) => l.startsWith(DEPLOY_FINDING_WORDS.jobsNotPassed));
  expect(line, "the body has no line naming the jobs").toBeDefined();
  return line!.slice(DEPLOY_FINDING_WORDS.jobsNotPassed.length).split(", ").map((named) => named.split(" (")[0]!);
}

describe("a green deploy closes the issue", () => {
  it("green when the four jobs passed, its closing line linking the run", () => {
    const finding = deployFindingOf(resultsOf(ALL_PASSED), RUN_URL);
    expect(finding.kind).toBe("green");
    expect(finding.kind === "green" && finding.closing).toContain(RUN_URL);
  });

  // `pin` is skipped whenever the run built the data commit the lock already names.
  it("green when pin was skipped by design", () => {
    expect(deployFindingOf(resultsOf({ ...ALL_PASSED, pin: "skipped" }), RUN_URL).kind).toBe("green");
  });
});

describe("a red deploy names what went red", () => {
  it.each(["build", "deploy", "pin", "audit"])("red when %s failed, naming it alone, the run linked", (job) => {
    const body = redBodyOf(resultsOf({ ...ALL_PASSED, [job]: "failure" }));
    expect(jobsNamedIn(body)).toEqual([job]);
    expect(body).toContain(RUN_URL);
  });

  it("red when a job was cancelled", () => {
    expect(jobsNamedIn(redBodyOf(resultsOf({ ...ALL_PASSED, audit: "cancelled" })))).toEqual(["audit"]);
  });

  // A failed build skips the deploy and the pin behind it: the deploy did not
  // run, which the issue says; the pin's skip is its own design.
  it("names every job that did not pass, a deploy skipped behind a red build among them", () => {
    const body = redBodyOf(resultsOf({ build: "failure", deploy: "skipped", pin: "skipped", audit: "failure" }));
    expect(jobsNamedIn(body)).toEqual(["build", "deploy", "audit"]);
  });
});

/**
 * The results cross from the workflow into this module, so they are read
 * before they are believed: what cannot be read is never green (#117,
 * decision 13; Security).
 */
describe("results the report cannot read give red, never green", () => {
  it.each([
    ["not JSON", "{build: success"],
    ["JSON that is not an object", "[\"success\"]"],
    ["null", "null"],
    ["a job missing", resultsOf({ deploy: "success", pin: "success", audit: "success" })],
    ["an unknown result", resultsOf({ ...ALL_PASSED, deploy: "neutral" })],
    ["a result that is not text", JSON.stringify({ ...ALL_PASSED, audit: 0 })],
    ["text far longer than four results", resultsOf({ ...ALL_PASSED, padding: "x".repeat(10_000) })],
  ])("%s", (_case, results) => {
    const body = redBodyOf(results);
    expect(body.split("\n").some((line) => line.startsWith(DEPLOY_FINDING_WORDS.unread)), "the body does not say the results were unread")
      .toBe(true);
    expect(body).toContain(RUN_URL);
  });
});

describe("a run the report cannot link gives red, never a green that links nothing", () => {
  it("an empty run address, though the four jobs passed", () => {
    const finding = deployFindingOf(resultsOf(ALL_PASSED), "");
    expect(finding.kind, "the finding is not red").toBe("red");
    const body = finding.kind === "red" ? finding.body : "";
    expect(body.split("\n").some((line) => line.startsWith(DEPLOY_FINDING_WORDS.unread)), "the body does not say what was unread")
      .toBe(true);
  });
});

describe("a red deploy says whether today's page was published, by the deploy job's result", () => {
  /** Which of the two declared lines the body says; both or neither fails. */
  function publishedLineOf(body: string): "published" | "notPublished" {
    const lines = body.split("\n");
    const says = (["published", "notPublished"] as const).filter((key) => lines.includes(DEPLOY_FINDING_WORDS[key]));
    expect(says, "the body says neither or both of the published lines").toHaveLength(1);
    return says[0]!;
  }

  it("published when the deploy job passed and another went red", () => {
    expect(publishedLineOf(redBodyOf(resultsOf({ ...ALL_PASSED, audit: "failure" })))).toBe("published");
    expect(publishedLineOf(redBodyOf(resultsOf({ ...ALL_PASSED, pin: "failure" })))).toBe("published");
  });

  it.each(["failure", "cancelled", "skipped"])("not published when the deploy job ended %s", (result) => {
    expect(publishedLineOf(redBodyOf(resultsOf({ ...ALL_PASSED, deploy: result })))).toBe("notPublished");
  });
});
