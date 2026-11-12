import { describe, expect, it } from "vitest";
import { basename } from "node:path";
import {
  checkoutRefOf, concurrencyOf, jobConditionOf, jobNamesOf, jobOf, jobPermissionsOf, pagesYaml as pages, readText,
  stepConditionOf, stepsOf, triggerPathsOf, workflowPaths,
} from "./workflow-text.js";

/**
 * A pull request runs the deploy's own checks on GitHub, on its own head, and
 * its page shows the result before anyone is asked to merge it (#343). One
 * workflow holds both, so the checks a pull request runs and the checks a
 * deploy runs cannot drift apart; what only a deploy may do (publish, pin the
 * lock, announce to IndexNow, read the live site, file an issue) skips a pull
 * request. A workflow is a file no test can run, so it is read as text.
 */

/** A condition's parts joined by `&&` outside any parentheses, each trimmed. */
function conjunctsOf(condition: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let at = 0; at < condition.length; at += 1) {
    if (condition[at] === "(") depth += 1;
    if (condition[at] === ")") depth -= 1;
    if (depth === 0 && condition.startsWith("&&", at)) {
      parts.push(condition.slice(start, at));
      start = at + 2;
    }
  }
  return [...parts, condition.slice(start)].map((part) => part.trim());
}

/** A condition part naming the events it runs on: `github.event_name == '…'` alone, or several joined by `||` in parentheses. */
const PART_NAMING_EVENTS = /^\(?github\.event_name == '[a-z_]+'(?: \|\| github\.event_name == '[a-z_]+')*\)?$/;

/** Whether a condition part names the events it runs on, and a pull request is not among them. */
const namesOnlyOtherEvents = (part: string): boolean => PART_NAMING_EVENTS.test(part) && !part.includes("'pull_request'");

/** Whether a condition is false on every pull request: one of its `&&` parts refuses the event, or names only others. */
const shutsOutPullRequest = (condition: string): boolean =>
  conjunctsOf(condition).some((part) => part === "github.event_name != 'pull_request'" || namesOnlyOtherEvents(part));

const buildJob = jobOf(pages, "build");

describe("a pull request is checked on its own head, through a trigger of its own", () => {
  it("the pull_request trigger carries the push trigger's paths, in the same order", () => {
    const pushPaths = triggerPathsOf(pages, "push");
    expect(pushPaths, "the push trigger lists no paths, so this case would pass vacuously").not.toEqual([]);
    expect(triggerPathsOf(pages, "pull_request"), "a pull request is checked on other paths than a push to master rebuilds")
      .toEqual(pushPaths);
  });

  // `pull_request_target` runs with the base repository's write token and
  // secrets, and a pull request's code is a stranger's.
  it("no workflow names pull_request_target", () => {
    expect(workflowPaths.length, "no workflows to check").toBeGreaterThan(0);
    for (const path of workflowPaths) expect(readText(path), basename(path)).not.toContain("pull_request_target");
  });

  // GitHub's default on a pull request is a merge commit nobody reviewed and
  // the merge guard does not read. On every other event the expression is
  // empty, which checks out that event's own commit.
  it("on a pull request the build checks out the pull request's head", () => {
    const siteCheckout = stepsOf(buildJob).find((step) => /^ {10}path: site$/m.test(step) && step.includes("uses: actions/checkout@"));
    expect(siteCheckout, "the build checks out no site").toBeDefined();
    expect(checkoutRefOf(siteCheckout!)).toBe("${{ github.event.pull_request.head.sha }}");
  });

  // The build runs a stranger's pull request's code, so no checkout leaves
  // the run's token in a repository's git config for that code to read.
  it("the build's two checkouts, the site and the data, leave no token on disk", () => {
    const checkouts = stepsOf(buildJob).filter((step) => step.includes("uses: actions/checkout@"));
    expect(checkouts, "the build no longer checks out the site and the data, so this case would not read them").toHaveLength(2);
    for (const checkout of checkouts) expect(checkout).toMatch(/^ {10}persist-credentials: false$/m);
  });
});

describe("a pull request deploys, pins, announces and files nothing", () => {
  it("deploy, pin, indexnow and report cannot run on a pull request", () => {
    for (const name of ["deploy", "pin", "indexnow", "report"]) {
      const job = jobOf(pages, name);
      expect(job, `pages.yml has no ${name} job`).not.toBe("");
      expect(shutsOutPullRequest(jobConditionOf(job)), `${name} runs on a pull request: if: ${jobConditionOf(job)}`).toBe(true);
    }
  });

  it("the build's addresses, carry and upload steps skip a pull request", () => {
    const steps = stepsOf(buildJob);
    const deployOnlySteps = {
      addresses: steps.find((step) => /^ {8}id: urls$/m.test(step)),
      carry: steps.find((step) => /^ {8}run: node scripts\/carry-assets\.mjs$/m.test(step)),
      upload: steps.find((step) => step.startsWith("uses: actions/upload-pages-artifact@")),
    };
    for (const [what, step] of Object.entries(deployOnlySteps)) {
      expect(step, `the build has no ${what} step`).toBeDefined();
      expect(shutsOutPullRequest(stepConditionOf(step!)), `the ${what} step runs on a pull request`).toBe(true);
    }
  });
});

describe("a pull request runs the build and the audit, and both only read", () => {
  it("audit carries no condition that skips a pull request", () => {
    const audit = jobOf(pages, "audit");
    expect(audit, "pages.yml has no audit job").not.toBe("");
    expect(jobConditionOf(audit)).toBe("");
    const steps = stepsOf(audit);
    expect(steps, "the audit job has no steps this case can read").not.toEqual([]);
    expect(steps.map(stepConditionOf).filter((condition) => condition !== "")).toEqual([]);
  });

  // Both of a pull request's checks speak of the one commit reviewed, and
  // neither leaves the run's token on disk for a stranger's code to read.
  it("audit checks out the pull request's head and leaves no token on disk", () => {
    const checkouts = stepsOf(jobOf(pages, "audit")).filter((step) => step.includes("uses: actions/checkout@"));
    expect(checkouts, "the audit no longer checks out the site alone, so this case would not read it").toHaveLength(1);
    expect(checkoutRefOf(checkouts[0]!)).toBe("${{ github.event.pull_request.head.sha }}");
    expect(checkouts[0]).toMatch(/^ {10}persist-credentials: false$/m);
  });

  // A stranger's pull request runs its own code in these jobs.
  it("the jobs a pull request runs are the build and the audit, and neither raises its permissions past reading", () => {
    const pullRequestJobs = jobNamesOf(pages).filter((name) => !shutsOutPullRequest(jobConditionOf(jobOf(pages, name))));
    expect(pullRequestJobs.sort()).toEqual(["audit", "build"]);
    for (const name of pullRequestJobs) {
      const granted = jobPermissionsOf(jobOf(pages, name));
      expect(granted, `${name} states no permissions block`).not.toEqual([]);
      expect(granted.filter((scope) => !scope.endsWith(": read")), `${name} runs on a pull request with more than reading`)
        .toEqual([]);
    }
  });
});

describe("a pull request waits in a queue of its own", () => {
  // The exact strings: any other form could put a deploy in a pull request's
  // group, where a newer push would cancel it, or let a pull request's run
  // displace a deploy waiting in `pages`.
  it("each pull request's runs share a group of their own, cancelling the older; every other event keeps pages, never cancelled", () => {
    const { group, cancelInProgress } = concurrencyOf(pages);
    expect(group).toBe("github.event_name == 'pull_request' && format('pull-request-{0}', github.event.pull_request.number) || 'pages'");
    expect(cancelInProgress).toBe("github.event_name == 'pull_request'");
  });
});
