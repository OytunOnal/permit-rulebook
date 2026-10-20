import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dataDir, readLock } from "../scripts/data-pin.mjs";
import { readAssetNames } from "../scripts/carry-assets/asset-names.mjs";
import { jobNamesOf, jobOf, pagesYaml as pages, readText, workflowPaths } from "./workflow-text.js";

/**
 * The pipeline's own security and the data it builds against (Spine
 * steward-40, and the rollback that could not roll back, 2026-09-08).
 *
 * A workflow that says `actions/checkout@v4` runs whatever that tag points at
 * today; a workflow with repository-wide write runs every step with it. And a
 * site whose sibling floats cannot rebuild its own past: re-running the last
 * green deploy tested old site code against new data and failed.
 */

const root = fileURLToPath(new URL("..", import.meta.url));

describe("every action is pinned to a commit, and every job asks for the least it needs", () => {
  it("no `uses:` names a tag or a branch — all of them name a 40-hex commit", () => {
    expect(workflowPaths.length, "no workflows to check").toBeGreaterThan(0);
    for (const file of workflowPaths)
      for (const line of readText(file).split("\n")) {
        const used = /uses:\s*(\S+)/.exec(line);
        if (!used) continue;
        const [, ref] = used;
        expect(ref, `${file}: ${line.trim()}`).toMatch(/^[^@]+@[0-9a-f]{40}$/);
        // And the version it was resolved from, so a person can read it.
        expect(line, `${file}: ${line.trim()} has no version comment`).toMatch(/#\s*v[0-9]+\.[0-9]+\.[0-9]+/);
      }
  });

  it("the workflow's floor is contents: read, and only the jobs that need more raise it", () => {
    for (const file of workflowPaths) {
      const yaml = readText(file);
      const top = yaml.slice(0, yaml.indexOf("jobs:"));
      expect(top, `${file}: no top-level permissions block`).toMatch(/^permissions:\s*$/m);
      expect(top, `${file}: the floor is not contents: read`).toMatch(/^permissions:\s*\n\s+contents: read\s*$/m);
      // Nothing above the jobs may hand out a write scope.
      expect(top, `${file}: a write scope above the jobs`).not.toMatch(/^\s+(pages|id-token|issues): write/m);
      // Every job states its own permissions rather than inheriting silently.
      // Jobs only: the keys under `on:` are triggers, not jobs.
      for (const job of jobNamesOf(yaml))
        expect(jobOf(yaml, job), `${file}: job "${job}" states no permissions`).toMatch(/^\s{4}permissions:/m);
    }
  });

  it("no secret is written into a workflow in plain text", () => {
    for (const file of workflowPaths) {
      const yaml = readText(file);
      // A secret reaches a workflow through `secrets.` and nowhere else.
      for (const line of yaml.split("\n")) {
        if (/^\s*#/.test(line)) continue;
        // A permission scope is not a secret: `id-token: write` names a
        // capability, not a value.
        if (/^\s+(pages|id-token|contents|issues|actions|packages):\s/.test(line)) continue;
        const assigned = /(?:TOKEN|SECRET|KEY|PASSWORD)\s*:\s*"?([^"\s]+)/i.exec(line);
        if (!assigned) continue;
        // A token reaches a workflow from the secret store or from the run's
        // own automatic token, and from nowhere else — never as a literal.
        expect(line, `${file}: ${line.trim()}`).toMatch(/\$\{\{\s*(secrets|github)\./);
      }
      // And no 40-hex string outside a `uses:` pin, no PAT prefixes.
      expect(yaml, `${file}: a GitHub token prefix`).not.toMatch(/gh[pousr]_[A-Za-z0-9]{16,}/);
    }
  });
});

/** Which data commit the site is built against, and whether it is real. */
/** A newline, spelled so no editor can eat it. */
const LF = String.fromCharCode(10);

describe("the data commit is pinned, and the pin is a commit that exists", () => {
  const lock = readLock();
  const data = dataDir();
  /** git, with its own failure turned into something a reader can act on. */
  const git = (...args: string[]): { ok: boolean; out: string } => {
    try {
      return { ok: true, out: execFileSync("git", ["-C", data, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim() };
    } catch (e) {
      return { ok: false, out: (e as { stderr?: Buffer }).stderr?.toString().trim() ?? String(e) };
    }
  };

  it("data.lock names a 40-hex sha and the dataset version it carried", () => {
    expect(lock.sha, "data.lock has no sha").toMatch(/^[0-9a-f]{40}$/);
    expect(lock.datasetVersion, "data.lock has no dataset version").toMatch(/^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$/);
  });

  it("the commit exists in the data repository beside this one", () => {
    const type = git("cat-file", "-t", lock.sha);
    expect(
      type.ok && type.out === "commit",
      `data.lock names ${lock.sha}, which is not a commit in ${data} — pull the data repository, or run npm run data:pin`,
    ).toBe(true);
  });

  it("the sibling on this machine is not behind the lock", () => {
    const head = git("rev-parse", "HEAD");
    expect(head.ok, `cannot read the data repository's HEAD in ${data}: ${head.out}`).toBe(true);
    if (head.out === lock.sha) return;
    // Ahead is fine — a developer moves the data first and pins it after. Behind
    // is not: this build would be testing code against data it has never seen.
    // `--is-ancestor` answers with its exit code, so a false answer must read as
    // the sentence below and never as a raw throw (Standards review).
    const merged = git("merge-base", "--is-ancestor", lock.sha, head.out).ok;
    expect(
      merged,
      `data.lock names ${lock.sha}, which the sibling's HEAD ${head.out} does not contain — pull the data repository, or run npm run data:pin`,
    ).toBe(true);
  });

  it("the workflow builds a push against the lock, and the daily runs against the newest", () => {
    expect(pages).toContain("locked=$(sed -n 's/^sha=//p' data.lock)");
    expect(pages).toContain("ref: ${{ steps.data.outputs.ref }}");
    // The payload is a stranger's string: it arrives through the environment,
    // never interpolated into the script body, and is checked for 40 hex
    // characters before anything is checked out (Security review, 2026-09-08).
    expect(pages).toContain("PAYLOAD_SHA: ${{ github.event.client_payload.sha }}");
    expect(pages).toContain('repository_dispatch:yes) ref="$PAYLOAD_SHA"');
    expect(pages).not.toContain('ref="${{ github.event.client_payload.sha }}"');
    expect(pages).toContain("refusing to check anything out");
  });

  /**
   * A rerun keeps the event name of the run it repeats. A re-run schedule would
   * therefore build against today's data and pin it — the float this lock
   * exists to end, on the trigger that fires every day (Spec review,
   * 2026-09-08).
   */
  it("only a first attempt of the two newest-data triggers may advance the lock", () => {
    // The build's choice of ref reads the attempt.
    expect(pages).toContain("RUN_ATTEMPT: ${{ github.run_attempt }}");
    expect(pages).toContain('first_attempt=$([ "$RUN_ATTEMPT" = "1" ] && echo yes || echo no)');
    expect(pages).toContain('case "$EVENT_NAME:$first_attempt" in');
    expect(pages).toContain("schedule:yes)");
    // And so does the job that writes it back.
    const job = (name: string) => pages.slice(pages.indexOf(`${LF}  ${name}:`));
    const pin = job("pin").slice(0, job("pin").indexOf(`${LF}  deploy:`));
    expect(pin, "no job writes the lock back").not.toBe("");
    expect(pin).toContain("github.run_attempt == 1");
    expect(pin).toContain("github.event_name == 'schedule' || github.event_name == 'repository_dispatch'");
    expect(pin).toContain("needs.build.outputs.built != needs.build.outputs.locked");
    // It is the only job with a write token, and the build has none.
    expect(pin).toContain("permissions:");
    expect(pin).toContain("contents: write");
    const build = job("build").slice(0, job("build").indexOf(`${LF}  pin:`));
    expect(build, "the build job can write to the repository").not.toMatch(/contents: write/);
  });
});

/**
 * s33 — the step that carries the previous generation's assets forward. Why it
 * exists is written in `scripts/carry-assets/carry.mjs`'s own header; what is
 * pinned here is what the step has to cover and where it sits in the job.
 *
 * That it cannot fail the deploy is proved by running it, in
 * `tests/carry-assets/` — a workflow file cannot show that, and neither can
 * reading the script's source.
 */
describe("a cached page still finds its assets", () => {
  const dist = join(root, "dist");
  const missing = existsSync(dist) ? null : "no dist/ — run npm run build first";

  it("never lets a pipeline skip the built site", () => {
    if (missing) expect(process.env.CI, `CI cannot skip: ${missing}`).toBeFalsy();
    else expect(missing).toBeNull();
  });

  /**
   * The carrier reads ONE live page, so the whole exposure has to be one page.
   * The day a second page gains a bundle of its own this case goes red, and the
   * step has to widen to read that page too — which is the point of pinning it
   * rather than assuming it (s33, point 4).
   */
  it.skipIf(missing)("exactly one built page references /_astro/", () => {
    const htmlPages: string[] = [];
    (function walk(here: string): void {
      for (const entry of readdirSync(here, { withFileTypes: true })) {
        const full = join(here, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".html") && readText(full).includes("/_astro/"))
          htmlPages.push(relative(dist, full).split(sep).join("/"));
      }
    })(dist);
    expect(htmlPages.sort()).toEqual(["index.html"]);
  });

  /**
   * The other half of the same assumption, and the one nothing was watching.
   *
   * The carrier reads references out of HTML with a pattern, not with a
   * browser, and `scripts/carry-assets/asset-names.mjs`'s "What shapes this
   * reads" writes down why: honouring what a browser resolves means
   * `<base href>`, character references, `srcset` and CSS `url()`, and half a
   * browser reads strings no reader asks for while still missing the ones it
   * cannot parse. So the pattern reads what Astro emits — measured, round 7,
   * it is blind to `/_ASTRO/x.css`, `/_astro%2Fx.css`, a bare relative
   * `_astro/x.css`, `/_astro\x.css` and a reference with a tab in it, and
   * three of those five a browser resolves to one of this deploy's real
   * assets.
   *
   * What that costs the day Astro emits one of them is the step reading fewer
   * names than the page holds and saying NOTHING about it — no request, no
   * problem line, no annotation, which is the silent window s33 exists to
   * close. A comment cannot notice that; this can. Every file the build put in
   * `_astro/` is a file the page references, so the reader finding all of them
   * is the check, and it goes red on the shape as well as on the count.
   */
  it.skipIf(missing)("the carrier's reader finds every asset this build published", () => {
    const { names, refused, unserved } = readAssetNames(
      readText(join(dist, "index.html")),
      "https://permitrulebook.com/",
    );
    expect(names.sort(), "a built asset the carrier's reader cannot see in the page that names it")
      .toEqual(readdirSync(join(dist, "_astro")).sort());
    // And our own page holds nothing this step would decline, in either sense.
    expect(refused).toEqual([]);
    expect(unserved).toEqual([]);
  });

  /**
   * All three of point 4's clauses, as one verbatim block.
   *
   * This used to read the step through a hand-written YAML parser, which is a
   * second thing to be wrong: it only ever saw keys at exactly eight spaces,
   * so a nested `env:` under this step — `SITE_URL: https://evil.example/` —
   * passed every assertion while the step fetched a foreign host, and its `|`
   * branch was unreachable, so five of this job's fifteen steps parsed as
   * `{"run":"|"}` (Standards and Security review, round 3). Pinning the block
   * as text deletes the parser, its dead branch and its blind spot together.
   *
   * Over-pinning a deploy step is the trade this case wants. Every clause of
   * point 4 falls out of the one string, including the two that a reading of
   * the step's keys could not carry: that the step's exit code is the
   * carrier's own — one command, no `&&`, no `||`, no second line, no
   * `continue-on-error`, nothing appended (appending
   * `&& test -f dist/_astro/index.css` took the deploy down while every other
   * test stayed green — Spec review, 2026-09-23) — and that it is the last
   * thing before the artifact is sealed, because the block ends where the
   * upload begins. An edit to this step then goes through a deliberate edit
   * here, which is the point of a step nobody may quietly change.
   *
   * The `run:` takes NO arguments, and that clause is load-bearing: the script
   * reads any `--name value` as a flag, so a repository variable spliced into
   * this command line is a way to turn the mechanism off while every deploy
   * stays green. Why that is so is `scripts/carry-assets.mjs`'s header, "Where
   * the address comes from"; what this case does about it is pin the empty
   * command line and the environment value beside the rest of the block.
   */
  it("the build job runs it, verbatim, as the last step before the upload", () => {
    // The build job's own text: the carrier has to be in THIS job, where
    // `dist/` is on disk and the artifact is made. Both ends are asserted
    // before the slice, because `slice(i, -1)` is a legal call that spans to
    // the end of the file: renaming the `pin:` job used to make the end index
    // `-1`, and this case went on passing while it no longer checked the one
    // thing its name claims (Standards review, round 4 — the one mutation of
    // thirteen that stayed green).
    const from = pages.indexOf(`${LF}  build:${LF}`);
    const to = pages.indexOf(`${LF}  pin:${LF}`);
    expect(from, "the build job is not where it was").toBeGreaterThanOrEqual(0);
    expect(to, "the pin job is not where it was, so this case can no longer tell which job the carrier is in")
      .toBeGreaterThan(from);
    const build = pages.slice(from, to);
    // Why it sits here rather than anywhere else is the comment beside it in
    // `pages.yml`, which owns that reason.
    expect(
      build,
      "the carrier step in pages.yml is not the block this case pins. Every clause of point 4 is in that"
      + " one string, so a diff of a 200-character literal is the wrong place to read this: compare the step"
      + " in pages.yml with the literal below, line by line. Its name, its working directory, the origin"
      + " arriving as an environment value rather than as argv, a `run:` of one command with nothing"
      + " appended, and the upload immediately after it are each load-bearing — and each is a deliberate"
      + " edit here when the step is meant to change.",
    ).toContain(
      `      - name: Carry the live site's assets forward, so a cached page still finds them${LF}`
      + `        working-directory: site${LF}`
      + `        env:${LF}`
      + `          CARRY_ORIGIN: \${{ env.SITE_URL }}${LF}`
      + `        run: node scripts/carry-assets.mjs${LF}`
      + LF
      + "      - uses: actions/upload-pages-artifact@",
    );
  });
});

/**
 * `deploy run failed` (#117, decisions 3 to 5 and 13; site seam 8). A red
 * scheduled or dispatched deploy has nobody at the other end, so the `report`
 * job keeps one issue for it; a push and a hand dispatch have a person
 * watching, and keep nothing. What the run found is `deployFindingOf`'s
 * (`tests/deploy-finding.test.ts`); which runs keep the issue, and with what
 * token, lives only here in the YAML, so it is pinned here.
 */
describe("a red deploy nobody watches keeps deploy run failed", () => {
  const report = jobOf(pages, "report");
  /** A key's value on its own line in a job, at the job's own indent. */
  const jobKey = (job: string, key: string): string => new RegExp(`^ {4}${key}:\\s*(.+)$`, "m").exec(job)?.[1]?.trim() ?? "";

  it("report needs build, deploy, pin and audit", () => {
    expect(report, "pages.yml has no report job").not.toBe("");
    const needs = /^\[(.*)\]$/.exec(jobKey(report, "needs"))?.[1]?.split(",").map((job) => job.trim()) ?? [];
    expect(needs.sort()).toEqual(["audit", "build", "deploy", "pin"]);
  });

  it("report runs whatever their result, on a scheduled or dispatched run's first attempt only", () => {
    // `always()`: a red or cancelled job is what the report is there to say.
    // The exact string, since any other way to name an event could widen the
    // set past those two. A re-run builds against data.lock's old data and
    // has a person watching, so only a first attempt keeps the issue, as
    // `pin` and `indexnow` ask.
    expect(jobKey(report, "if")).toBe(
      "${{ always() && github.run_attempt == 1 && (github.event_name == 'schedule' || github.event_name == 'repository_dispatch') }}",
    );
  });

  it("report is the only job with issues: write", () => {
    const writers = workflowPaths.flatMap((file) => {
      const yaml = readText(file);
      return jobNamesOf(yaml).filter((job) => /^\s+issues:\s*write\s*$/m.test(jobOf(yaml, job))).map((job) => `${basename(file)}: ${job}`);
    });
    expect(writers).toEqual(["pages.yml: report"]);
    // And it writes nowhere else.
    expect(report.match(/^\s+[a-z-]+:\s*write\s*$/gm)?.map((line) => line.trim())).toEqual(["issues: write"]);
  });

  /**
   * The data commit `data.lock` names has built and deployed once, so a
   * broken data master, or a dispatch naming no data commit at all, cannot
   * silence the report (#117, decision 2).
   */
  it("report builds the kept-issue CLI from the data commit data.lock names", () => {
    const steps = report.split(/^ {6}- /m);
    const dataCheckout = steps.find((step) => /^\s{10}repository: OytunOnal\/permit-rulebook-data$/m.test(step)) ?? "";
    expect(dataCheckout, "report checks out no data").toMatch(/^(?:name:.*\n\s{8})?uses: actions\/checkout@/);
    const ref = /^\s{10}ref:\s*(.+)$/m.exec(dataCheckout)?.[1]?.trim();
    expect(ref).toBe("${{ steps.lock.outputs.sha }}");
    // The step that gives that sha reads it out of data.lock.
    const lockStep = steps.find((step) => /^ {8}id: lock$/m.test(step)) ?? "";
    expect(lockStep, "no step reads the sha out of data.lock").toMatch(/^ {10}.*\bdata\.lock\b/m);
    // Never the run's own data checkout, never a dispatch's sha.
    expect(report).not.toMatch(/client_payload|steps\.data\.outputs|needs\.build\.outputs/);
    // Only the CLI is built, with no install script run beside the write token.
    expect(report).toMatch(/^\s+run: npm ci --ignore-scripts$/m);
    expect(report).toMatch(/^\s+run: npm run build:kept-issue$/m);
    expect(report).not.toMatch(/npm run (build|check)$/m);
  });
});

/**
 * The site's address is a literal in the deploy workflow, reviewed like any
 * code. A repository variable is a setting no review reads, and whoever can
 * write one would decide where the carry reads the live site from and which
 * host the canonical links and the sitemap name. So the deploy reads none.
 *
 * The declared set is GitHub's `vars` context, the one way a workflow reads a
 * repository variable. The address's value is not asserted, so a domain change
 * stays a one-line edit.
 */
describe("the site's address is reviewed code", () => {
  const REPOSITORY_VARIABLE_CONTEXTS = ["vars"];

  it("the deploy reads no repository variable", () => {
    for (const context of REPOSITORY_VARIABLE_CONTEXTS) {
      // A property read (`vars.X`, `vars['X']`), which an `if:` may hold with
      // no `${{ }}` around it, or the context named anywhere inside an
      // expression, where `toJSON(vars)` reads every variable at once.
      const contextReadPattern = new RegExp(`\\b${context}\\s*[.[]|\\$\\{\\{(?:(?!\\}\\}).)*\\b${context}\\b`);
      const lines = pages.split(LF).filter((line) => contextReadPattern.test(line)).map((line) => line.trim());
      expect(lines, `pages.yml reads the \`${context}\` context`).toEqual([]);
    }
  });
});
