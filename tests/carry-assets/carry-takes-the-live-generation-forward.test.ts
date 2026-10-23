import { afterEach, describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { carryAssets } from "../../scripts/carry-assets/carry.mjs";
import { openBuildDirectoryInMemory } from "./build-directory-in-memory.js";
import { entryRunAsChildProcess, fixedClock, flowRunInProcess } from "./carry-runs.js";
import {
  CSS, CSS_NAME, DIGESTS, JS, JS_NAME,
  astroFilesIn, distHolding, liveDeployAnswers, sha256, sweepTemporary, tempDirectory,
} from "./deploy-fixtures.js";
import { liveAnswerFor, liveSiteInMemory } from "./live-site-in-memory.js";

/**
 * The carry's flow — the carrier that lets a cached page still find its
 * assets — against an in-memory live site and build directory, on a fixed
 * clock, with no socket or disk anywhere: that it takes the live generation
 * forward.
 *
 * Why the step exists is written once in `scripts/carry-assets/carry.mjs`'s
 * own header, and its ceilings in `live-deploy/ceilings.mjs` beside it.
 *
 * Most cases run the flow in this process (`flowRunInProcess`). The cases that
 * assert what only the entry decides — that the origin is an environment
 * value and never a flag, and that a run with no build directory writes
 * nowhere — run the real entry as a child process (`entryRunAsChildProcess`)
 * over a throwaway `dist/`, on values it refuses before any request, so it
 * opens no socket. What the live site over HTTP does is the
 * `live-site-over-http*.test.ts` files', and what the build directory on disk
 * does is `build-directory-on-disk.test.ts`'s.
 */

afterEach(sweepTemporary);

/**
 * The step doing its job: which page it reads, which files it asks for, what it
 * writes when the host answers well — and, because most of what this step does
 * is decline to write, the refusals that turn on one asset's own answer or on
 * the run having nowhere to read from.
 *
 * Two suites beside this one take an axis each: what makes a carried byte
 * trustworthy at all, `carry-carries-only-attested-bytes.test.ts`, and the
 * one origin this may read, `carry-fetches-from-our-origin-only.test.ts`.
 * What an origin cannot make this step do to the deploy is
 * `carry-never-fails-and-names-the-outcome.test.ts`'s.
 */
describe("the carrier takes the live generation forward", () => {
  it("fetches only the assets this build does not already have", async () => {
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS, [JS_NAME]: JS }));
    const out = openBuildDirectoryInMemory({ [JS_NAME]: JS });
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // The page, the digest list, then the one missing file — and never the
      // one this build already has.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`]);
      expect(out.assetNames()).toEqual([CSS_NAME, JS_NAME].sort());
    } finally { live.close(); }
  });

  it("writes the bytes the live host served, and says the name, the size and the digest", async () => {
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const out = openBuildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // Byte-identical: not re-encoded, not re-indented, not minified.
      expect(out.assets.get(CSS_NAME)?.equals(CSS)).toBe(true);
      expect(run.out).toContain(CSS_NAME);
      expect(run.out).toContain(String(CSS.length));
      expect(run.out).toContain(sha256(CSS));
    } finally { live.close(); }
  });

  it("carries nothing and says so when the live host answers 404", async () => {
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = { status: 404, type: "text/html; charset=utf-8", body: Buffer.from("gone") };
    const live = liveSiteInMemory(answers);
    const out = openBuildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(out.assetNames()).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      expect(run.out).toContain("404");
    } finally { live.close(); }
  });

  it("carries nothing and says so when the answer is 200 but not a stylesheet or a module", async () => {
    // What a host that has lost the file actually does: 200, and an HTML page
    // saying it is missing. Writing that into `dist/_astro/` would replace a
    // stylesheet with a web page and break the deploy this step exists to save.
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = { type: "text/html; charset=utf-8", body: Buffer.from("<html>404</html>") };
    const live = liveSiteInMemory(answers);
    const out = openBuildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(out.assetNames()).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      expect(run.out).toContain("text/html");
    } finally { live.close(); }
  });

  it("exits 0 when the live origin answers nothing at all", async () => {
    // The deploy must survive a host that is down, a DNS failure, a timeout.
    // No open site answers at this address, which is the same shape.
    const out = openBuildDirectoryInMemory();
    const run = await flowRunInProcess("http://127.0.0.1:1", out);
    expect(run.status, run.out).toBe(0);
    expect(out.assetNames()).toEqual([]);
    expect(run.out).toMatch(/could not/i);
  });

  it("reads the page the origin actually names, base path and all", async () => {
    // A site served from a subpath carries that path in its address, which is
    // what the workflow hands this step. Reading the host root instead would
    // read a stranger's page, or nothing; and the digest list is published
    // under that same base, beside the page.
    const base = "/permit-rulebook";
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }, base));
    const out = openBuildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(`${live.url}${base}/`, out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked).toEqual([`${base}/`, `${base}/${DIGESTS}`, `${base}/_astro/${CSS_NAME}`]);
      expect(out.assetNames()).toEqual([CSS_NAME]);
    } finally { live.close(); }
  });

  it("writes nothing under --dry-run, and still names what it would carry", async () => {
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS, [JS_NAME]: JS }));
    const out = openBuildDirectoryInMemory({ [JS_NAME]: JS });
    try {
      const run = await flowRunInProcess(live.url, out, { dryRun: true });
      expect(run.status, run.out).toBe(0);
      expect(out.assetNames()).toEqual([JS_NAME]);
      expect([...out.besidePage.keys()]).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  it("carries nothing when no origin is given, rather than falling back to production", async () => {
    // There is no fallback address — an origin the step was not given is an
    // origin it does not have. The decision is measured where every other
    // origin case measures it: nothing was asked of this host, and nothing
    // arrived in this build, which is where the live site's stylesheet would
    // be if the empty value had fallen through to it.
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const out = openBuildDirectoryInMemory();
    try {
      const run = await flowRunInProcess("", out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked).toEqual([]);
      expect(out.assetNames()).toEqual([]);
    } finally { live.close(); }
  });

  it("refuses an origin that is not a web address, and still publishes this build's digest list", async () => {
    // The two values that would disarm the whole mechanism while the deploy
    // stayed green, if either reached argv: `--dry-run`, and `--dist=<somewhere
    // else>`. What that costs every later deploy is the entry header's "Where
    // the address comes from".
    //
    // So the list is the assertion. Whatever the origin turns out to be, the
    // build this step was pointed at leaves with the list the next deploy
    // reads, and the directory nobody named stays empty.
    for (const value of ["--dry-run", "--dist=", "//permitrulebook.com/", "ftp://permitrulebook.com/", "not a url"]) {
      const elsewhere = distHolding();
      const out = distHolding();
      const run = await entryRunAsChildProcess(value === "--dist=" ? `--dist=${elsewhere}` : value, ["--dist", out]);
      expect(run.status, `${value}: ${run.out}`).toBe(0);
      expect(readdirSync(out).sort(), `${value}: ${run.out}`).toEqual([DIGESTS, "_astro"].sort());
      expect(readdirSync(elsewhere), `${value}: the list landed somewhere nobody named`).toEqual(["_astro"]);
      expect(astroFilesIn(out), `${value}: ${run.out}`).toEqual([]);
    }
  });

  it("carries nothing when no build directory is given, rather than throwing", async () => {
    // `carryAssets` promises in its own words that it throws nothing and that
    // everything it could not do comes back in `problems`, while its signature
    // lets `buildDirectory` be left out. The entry leaves it out only for a
    // blank `--dist`; this is the export's own promise, so it is asserted on
    // the export.
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    try {
      const result = await carryAssets({ origin: live.url, liveAnswerFor, now: fixedClock });
      expect(result.carried).toEqual([]);
      expect(result.alreadyBuilt).toEqual([]);
      expect(result.problems).toHaveLength(1);
      // It gave up before spending a request on a build it could not fill.
      expect(live.asked).toEqual([]);
    } finally { live.close(); }
  });

  it("writes nothing anywhere when there is no build directory to write into", async () => {
    // With `--dist ""` the digest list's name would resolve against the
    // PROCESS's own directory, and a success line would name a file in a
    // directory nobody named, on the run that refuses for having no build
    // directory. Two claims about the same value, one of them false.
    //
    // `cwd` is the instrument: the run is handed a directory of its own, so a
    // regression lands there to be asserted rather than in the working tree.
    const here = tempDirectory();
    const run = await entryRunAsChildProcess("https://permitrulebook.com/", ["--dist", ""], here);
    expect(run.status, run.out).toBe(0);
    expect(readdirSync(here), "the step wrote into whatever directory it was run from").toEqual([]);
    expect(run.out, "a success line for a file that landed where nobody named").not.toContain(`published ${DIGESTS}`);
    expect(run.out, "the run did not say what was missing").toContain("no build directory was given");
    // The dry run says nothing either: `would publish` is a promise about the
    // next deploy, and there is no build here for the next deploy to read.
    const dry = await entryRunAsChildProcess("https://permitrulebook.com/", ["--dry-run", "--dist", ""], here);
    expect(dry.status, dry.out).toBe(0);
    expect(readdirSync(here), dry.out).toEqual([]);
    expect(dry.out, "a promise to publish a list into a build that does not exist").not.toContain("would publish");
  });
});
