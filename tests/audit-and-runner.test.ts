import { describe, expect, it } from "vitest";
import { basename } from "node:path";
import { jobNamesOf, jobOf, pagesYaml as pages, readText, workflowPaths } from "./workflow-text.js";

/**
 * The toolchain the deploy runs on (#24).
 *
 * The dependencies are audited on every run (#47), dev ones included: the test
 * runner and the build run in the deploy's own jobs. A red audit shows on the
 * run and stops nothing: the deploy publishes the day's values whatever an
 * advisory in a tool says. And the runner image is named, never `-latest`: the
 * image changes only when the workflow does, and the browser cases drive the
 * image's own Chrome.
 */

/** The one job that runs `npm audit`, by its name; a job that only says the words is not it. */
function auditJob(): { name: string; body: string } {
  const names = jobNamesOf(pages).filter((name) => /^\s*run:\s*npm audit\b/m.test(jobOf(pages, name)));
  expect(names, "no job, or more than one, runs npm audit").toHaveLength(1);
  return { name: names[0]!, body: jobOf(pages, names[0]!) };
}

describe("the dependencies are audited on every run (#47)", () => {
  it("over every dependency, dev ones included, red at high and above", () => {
    const { body } = auditJob();
    expect(body).toMatch(/npm audit\b.*--audit-level=high\b/);
    expect(body).not.toMatch(/--omit|--production|--only/);
  });

  it("in a job the deploy never waits on, whose red shows on the run", () => {
    const { name, body } = auditJob();
    for (const job of jobNamesOf(pages)) {
      const needs = /^\s{4}needs:\s*(.+)$/m.exec(jobOf(pages, job))?.[1] ?? "";
      expect(needs, `${job} waits on the audit`).not.toMatch(new RegExp(`\\b${name}\\b`));
    }
    // A job allowed to fail would turn green over a known advisory.
    expect(body).not.toContain("continue-on-error");
  });

  it("asks for nothing but to read the repository", () => {
    const { body } = auditJob();
    expect(body).toMatch(/^\s{4}permissions:\n\s{6}contents: read$/m);
    expect(body).not.toMatch(/: write/);
  });
});

describe("the runner image is named, never -latest", () => {
  it("every job of every workflow runs on a pinned image", () => {
    let runsOnLines = 0;
    for (const path of workflowPaths)
      for (const [, image] of readText(path).matchAll(/^\s*runs-on:\s*(\S+)/gm)) {
        runsOnLines += 1;
        expect(image, `${basename(path)} runs on an image that moves under it`).not.toMatch(/-latest$/);
      }
    expect(runsOnLines, "no runs-on: line found — this case would pass vacuously").toBeGreaterThan(0);
  });
});
