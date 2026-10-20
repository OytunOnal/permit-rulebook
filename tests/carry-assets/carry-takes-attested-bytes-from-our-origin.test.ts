import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { carryAssets, writeAssetDigests } from "../../scripts/carry-assets/carry.mjs";
import { readAssetNames } from "../../scripts/carry-assets/asset-names.mjs";
import { annotationsOf, entryRunAsChildProcess, flowRunInProcess } from "./carry-runs.js";
import {
  CSS, CSS_NAME, DIGESTS, HEADER, JS, JS_NAME,
  astroFilesIn, digestListBytesOf, distHolding, expectRefusedOver, liveDeployAnswers, pageNaming, sha256,
  sweepTemporary, tempDirectory,
} from "./deploy-fixtures.js";
import { pageOf } from "./live-page.js";
import { liveAnswerFor, liveSiteInMemory } from "./live-site-in-memory.js";

/**
 * The carry's flow — the carrier that lets a cached page still find its
 * assets — against an in-memory live site, with no socket anywhere: what it
 * carries, and from where.
 *
 * Why the step exists, and what its ceilings are, is written once in
 * `scripts/carry-assets/carry.mjs`'s own header. What is asserted here is that
 * it takes the live generation forward, that it writes only bytes our own
 * previous build attested to, and that it fetches from our origin and nowhere
 * else. That it never fails the deploy, and says which of the three outcomes
 * happened, is `carry-never-fails-and-names-the-outcome.test.ts`'s.
 *
 * Most cases run the flow in this process (`flowRunInProcess`). The cases that
 * assert what only the entry decides — that the origin is an environment
 * value and never a flag, and that a run with no build directory writes
 * nowhere — run the real entry as a child process (`entryRunAsChildProcess`),
 * on values it refuses before any request, so it opens no socket. What the
 * live site over HTTP does is `live-site-over-http.test.ts`'s.
 */

/** The run's counted line, wherever the annotations after it leave it. */
const summary = (out: string): string => out.split("\n").find((line) => line.includes("left behind")) ?? "";

afterEach(sweepTemporary);

/**
 * The step doing its job: which page it reads, which files it asks for, what it
 * writes when the host answers well — and, because most of what this step does
 * is decline to write, the refusals that turn on one asset's own answer or on
 * the run having nowhere to read from.
 *
 * The two describes after this one take an axis each: what makes a carried
 * byte trustworthy at all, and the one origin this may read. What an origin
 * cannot make this step do to the deploy is
 * `carry-never-fails-and-names-the-outcome.test.ts`'s.
 */
describe("the carrier takes the live generation forward", () => {
  it("fetches only the assets this build does not already have", async () => {
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS, [JS_NAME]: JS }));
    const out = distHolding({ [JS_NAME]: JS });
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // The page, the digest list, then the one missing file — and never the
      // one this build already has.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`]);
      expect(astroFilesIn(out)).toEqual([CSS_NAME, JS_NAME].sort());
    } finally { live.close(); }
  });

  it("writes the bytes the live host served, and says the name, the size and the digest", async () => {
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // Byte-identical: not re-encoded, not re-indented, not minified.
      expect(readFileSync(join(out, "_astro", CSS_NAME)).equals(CSS)).toBe(true);
      expect(run.out).toContain(CSS_NAME);
      expect(run.out).toContain(String(CSS.length));
      expect(run.out).toContain(sha256(CSS));
    } finally { live.close(); }
  });

  it("carries nothing and says so when the live host answers 404", async () => {
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = { status: 404, type: "text/html; charset=utf-8", body: Buffer.from("gone") };
    const live = liveSiteInMemory(answers);
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([]);
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
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      expect(run.out).toContain("text/html");
    } finally { live.close(); }
  });

  it("exits 0 when the live origin answers nothing at all", async () => {
    // The deploy must survive a host that is down, a DNS failure, a timeout.
    // No open site answers at this address, which is the same shape.
    const out = distHolding();
    const run = await flowRunInProcess("http://127.0.0.1:1", out);
    expect(run.status, run.out).toBe(0);
    expect(astroFilesIn(out)).toEqual([]);
    expect(run.out).toMatch(/could not/i);
  });

  it("reads the page the origin actually names, base path and all", async () => {
    // A site served from a subpath carries that path in its address, which is
    // what the workflow hands this step. Reading the host root instead would
    // read a stranger's page, or nothing; and the digest list is published
    // under that same base, beside the page.
    const base = "/permit-rulebook";
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }, base));
    const out = distHolding();
    try {
      const run = await flowRunInProcess(`${live.url}${base}/`, out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked).toEqual([`${base}/`, `${base}/${DIGESTS}`, `${base}/_astro/${CSS_NAME}`]);
      expect(astroFilesIn(out)).toEqual([CSS_NAME]);
    } finally { live.close(); }
  });

  it("writes nothing under --dry-run, and still names what it would carry", async () => {
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS, [JS_NAME]: JS }));
    const out = distHolding({ [JS_NAME]: JS });
    try {
      const run = await flowRunInProcess(live.url, out, { dryRun: true });
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([JS_NAME]);
      expect(readdirSync(out)).toEqual(["_astro"]);
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
    const out = distHolding();
    try {
      const run = await flowRunInProcess("", out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked).toEqual([]);
      expect(astroFilesIn(out)).toEqual([]);
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
    // lets `dist` be left out. The entry always passes one; this is the
    // export's own promise, so it is asserted on the export.
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    try {
      const result = await carryAssets({ origin: live.url, liveAnswerFor });
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

/**
 * The authority for a carried byte: the digest list, and what it is and is not
 * worth. That reading is written once, in `scripts/carry-assets/digest-list.mjs`
 * under "What makes a carried byte trustworthy", and it is not repeated here
 * — the measurements that argue for each case are in the case.
 *
 * What these assert is which bodies are written, which are refused, and how
 * few requests a refusal costs. The refusals that turn on how an answer was
 * framed over HTTP are `live-site-over-http.test.ts`'s.
 */
describe("the carrier carries only what our own previous build attested to", () => {
  it("publishes the digest list this build's assets will be checked against", () => {
    const out = distHolding({ [CSS_NAME]: CSS, [JS_NAME]: JS });
    const result = writeAssetDigests(out);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(readFileSync(join(out, DIGESTS), "utf8")).toBe(
      `${HEADER}\n${sha256(CSS)}  ${CSS_NAME}\n${sha256(JS)}  ${JS_NAME}\n`,
    );
  });

  it("publishes this build's digest list as part of the step, before it carries anything into the build", async () => {
    // The list describes what this build BUILT, so it is written before a
    // carried file lands in `_astro/` — and it is published whether or not
    // anything is carried, because the next deploy's whole check is this file.
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const out = distHolding({ [JS_NAME]: JS });
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([CSS_NAME, JS_NAME].sort());
      // This build's own asset, and not the one it carried a moment later.
      expect(readFileSync(join(out, DIGESTS), "utf8")).toBe(`${HEADER}\n${sha256(JS)}  ${JS_NAME}\n`);
    } finally { live.close(); }
  });

  it("carries nothing when the live deploy published no digest list", async () => {
    // A live deploy with no list is one this carries nothing from; it still
    // publishes the list the deploy after it will read.
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS });
    delete answers[`/${DIGESTS}`];
    const live = liveSiteInMemory(answers);
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([]);
      // It asked for the list and stopped there: not one asset was fetched.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`]);
      // On the list's own 404, and not on the clock: a list request that times
      // out leaves `live.asked` and the printed name exactly as this does.
      // See `expectRefusedOver`.
      expectRefusedOver(run.out, "published no digest list", "learning that the live deploy published no list");
    } finally { live.close(); }
  });

  it("carries nothing when the digest list does not parse", async () => {
    // A list cut mid-line — a proxy that truncated it, a half-written file.
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS });
    answers[`/${DIGESTS}`] = { type: "text/plain; charset=utf-8", body: digestListBytesOf({ [CSS_NAME]: CSS }).subarray(0, HEADER.length + 20) };
    const live = liveSiteInMemory(answers);
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([]);
      expect(live.asked).toEqual(["/", `/${DIGESTS}`]);
      // On the cut line, and not on the clock. See `expectRefusedOver`.
      expectRefusedOver(run.out, "is not a sha256 and a name", "reading the list far enough to fail on a line");
    } finally { live.close(); }
  });

  it("refuses the whole run when the list describes none of the names the page needs", async () => {
    // A proxy holding one and not the other, or a deploy that landed between
    // the two fetches: the page names a generation the list does not describe
    // at all, so there is nothing here this step can check any byte against.
    // The measurement is the decision, not the wording: it spent no request on
    // an asset, and it named what it could not check.
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS });
    answers[`/${DIGESTS}`] = { type: "text/plain; charset=utf-8", body: digestListBytesOf({ "index.ZZZZZZZZ.css": CSS }) };
    const live = liveSiteInMemory(answers);
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([]);
      expect(live.asked).toEqual(["/", `/${DIGESTS}`]);
      // On the two generations disagreeing, and not on the clock. See
      // `expectRefusedOver`.
      expectRefusedOver(run.out, "different deploys", "comparing the list against the page's whole reference set");
    } finally { live.close(); }
  });

  it("leaves behind only the name the list lacks, and carries the ones it attests to", async () => {
    // A page reference `/_astro/../../pwn.css` normalises to `pwn.css`, which
    // no list of ours carries. A name the list lacks is that name not carried;
    // NONE of the needed names being in the list is the page and the list
    // coming from different deploys, which is the case above. So this one
    // measures the split: the two attested names are fetched and written, the
    // third is never requested, and the line that names it is not the line
    // that refuses a run.
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS, [JS_NAME]: JS });
    answers["/"] = {
      type: "text/html; charset=utf-8",
      body: pageOf([`/_astro/${CSS_NAME}`, `/_astro/${JS_NAME}`, "/_astro/../../pwn.css"]),
    };
    const live = liveSiteInMemory(answers);
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([CSS_NAME, JS_NAME].sort());
      // `pwn.css` cost no request: it is named in a line, not fetched.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`, `/_astro/${JS_NAME}`]);
      expect(run.out).toContain("pwn.css");
    } finally { live.close(); }
  });

  it("holds the list to the same rule for a name as the carrier does", async () => {
    // One rule, spelled once, in `asset-names.mjs`: the carrier's plain name
    // and the list's line pattern are the same pattern.
    //
    // Measured from both ends of the same name: the page's reader refuses it,
    // and so does the list's, which fails the list whole.
    expect(readAssetNames(pageOf(["/_astro/.."]).toString("utf8"), "https://example.test/").names).toEqual([]);
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS });
    answers[`/${DIGESTS}`] = {
      type: "text/plain; charset=utf-8",
      body: Buffer.from(`${HEADER}\n${sha256(CSS)}  ..\n${sha256(CSS)}  ${CSS_NAME}\n`, "utf8"),
    };
    const live = liveSiteInMemory(answers);
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([]);
      // The list failed to parse, so not one asset was asked for.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`]);
      // On the line the list's own reader refused, and not on the clock. See
      // `expectRefusedOver`.
      expectRefusedOver(run.out, "is not a sha256 and a name", "reading the list and refusing the name it holds");
    } finally { live.close(); }
  });

  it("refuses an empty body even when the list attests to exactly those nought bytes", async () => {
    // A 0-byte file published under the previous generation's name answers
    // 200 with nothing — worse than the 404 this step exists to fix, and
    // silent.
    //
    // The digest is what refuses a wrong body, so the way to measure that the
    // empty one is refused for being EMPTY is to take the digest out of the
    // argument: the list here names sha256 of nothing, the body is nothing,
    // and the two agree. Everything else about this answer is in order. It is
    // still not written.
    const empty = Buffer.alloc(0);
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS });
    answers[`/${DIGESTS}`] = { type: "text/plain; charset=utf-8", body: digestListBytesOf({ [CSS_NAME]: empty }) };
    answers[`/_astro/${CSS_NAME}`] = { type: "text/css", body: empty };
    const live = liveSiteInMemory(answers);
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // It went all the way to the asset and came back with nothing written.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`]);
      expect(astroFilesIn(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      // For being empty, which is the whole of this case — the digest agrees
      // here, so emptiness is the only verdict left that is about the body.
      // See `expectRefusedOver`.
      expectRefusedOver(run.out, "empty body", "finding the body empty");
    } finally { live.close(); }
  });
});

/**
 * The page is a stranger's string, and a deploy is a bad place to trust one.
 * Every case here is a reference the live HTML could name and this step must
 * refuse — by name, on one line, without a single request to the host it
 * names.
 */
describe("the carrier fetches from our origin and nowhere else", () => {
  it("refuses a reference to another host, another scheme, or no host at all", async () => {
    const mine = "index.CCCCCCCC.css";
    const answers = liveDeployAnswers({ [mine]: CSS });
    const live = liveSiteInMemory(answers);
    try {
      // The page is written once the host is known, because the scheme case
      // has to name this very host: then only the `https:` makes it foreign —
      // the mirror of an `http://` reference on the live site, which is https.
      const foreign = [
        "https://evil.example/_astro/absolute.DDDDDDDD.js",
        "//evil.example/_astro/protocol-relative.EEEEEEEE.js",
        `https://${new URL(live.url).host}/_astro/scheme.FFFFFFFF.js`,
      ];
      answers["/"] = { type: "text/html; charset=utf-8", body: pageOf([...foreign, `/_astro/${mine}`]) };
      const out = distHolding();
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // Ours, and only ours. Nothing was asked of this host on behalf of the
      // three foreign references either.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${mine}`]);
      expect(astroFilesIn(out)).toEqual([mine]);
      // Each of the three is reported, and each is reported as much of itself
      // as a log line can afford: a page chooses how long its references are,
      // so a refusal prints a bounded head of one rather than the whole of it.
      for (const ref of foreign)
        expect(run.out, `${ref} was not reported`).toContain(ref.slice(0, 30));
    } finally { live.close(); }
  });

  it("counts a reference as ours only when it resolves to this page's own `_astro/`", async () => {
    // `/_astro/../real.css` resolves to `/real.css`, a URL this deploy does not
    // publish; scored by its basename against `dist/_astro/real.css`, it would
    // read "already in this build" while the reader holding that page 404s. A
    // name is one of this deploy's assets only when the whole resolved path is
    // the one this step would build for that name.
    const real = "index.IIIIIIII.css";
    const answers = liveDeployAnswers({ [real]: CSS });
    answers["/"] = { type: "text/html; charset=utf-8", body: pageOf([`/_astro/../${real}`]) };
    const live = liveSiteInMemory(answers);
    const out = distHolding({ [real]: CSS });
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // Never fetched, and never counted as built: the page, and nothing else.
      expect(live.asked, run.out).toEqual(["/"]);
      expect(summary(run.out), run.out).toContain("0 already in this build");
      expect(summary(run.out), run.out).toContain("1 left behind");
      expect(annotationsOf(run.out), "the reader 404s on a URL and the run said nothing").toContain(real);
    } finally { live.close(); }
  });

  it("counts a root-absolute reference as ours only under the base this deploy serves", async () => {
    // A site served from a subpath: a page carrying a root-absolute
    // `/_astro/old.css` names a URL the host 404s. Rebuilt under the base by
    // its basename, it would be fetched and reported carried for a URL the
    // deploy will never serve.
    const base = "/permit-rulebook";
    const stale = "index.JJJJJJJJ.css";
    // The live deploy has both, under its base, and its digest list names both:
    // nothing else refuses this one, so what the step does with it is decided
    // by where the reference resolves and by nothing else. The host 404s the
    // root-absolute path, the way Pages does.
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS, [stale]: Buffer.from("/* the stale one */\n", "utf8") }, base);
    answers[`${base}/`] = {
      type: "text/html; charset=utf-8",
      body: pageOf([`${base}/_astro/${CSS_NAME}`, `/_astro/${stale}`]),
    };
    const live = liveSiteInMemory(answers);
    const out = distHolding();
    try {
      const run = await flowRunInProcess(`${live.url}${base}/`, out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked, run.out).not.toContain(`${base}/_astro/${stale}`);
      expect(astroFilesIn(out), run.out).toEqual([CSS_NAME]);
      expect(annotationsOf(run.out), run.out).toContain(stale);
    } finally { live.close(); }
  });

  it("annotates every reference that resolves under our own origin to a URL this deploy does not publish", async () => {
    // Whether a refusal predicts a reader's 404 is decided by where the
    // reference RESOLVES: under our origin and not to one of this deploy's
    // assets is the reader's 404, whatever made it one. Another host's is
    // that host's business, and a reference that resolves nowhere is a
    // request no browser makes either.
    const mine = "index.KKKKKKKK.css";
    for (const [label, ref, mark] of [
      ["a percent-encoded separator", "/_astro/sub%2Fold.css", "/_astro/sub%2Fold.css"],
      ["a trailing dot segment", "/_astro/old.css/.", "/_astro/old.css/."],
      ["the directory itself", "/_astro/", "/_astro/"],
      ["a name over the 128-character ceiling", `/_astro/${"a".repeat(136)}.css`, "a".repeat(40)],
    ] as [string, string, string][]) {
      const answers = liveDeployAnswers({ [mine]: CSS });
      answers["/"] = { type: "text/html; charset=utf-8", body: pageOf([`/_astro/${mine}`, ref]) };
      const live = liveSiteInMemory(answers);
      // This build already has the healthy one, so nothing else can raise an
      // annotation: no name is missing and the page does reference one of ours.
      const out = distHolding({ [mine]: CSS });
      try {
        const run = await flowRunInProcess(live.url, out);
        expect(run.status, `${label}: ${run.out}`).toBe(0);
        // Not fetched, either: a URL this deploy does not publish is named, not
        // asked for.
        expect(live.asked, `${label}: ${run.out}`).toEqual(["/"]);
        expect(annotationsOf(run.out), `${label} left the reader's 404 unannounced: ${run.out}`).toContain(mark);
        expect(annotationsOf(run.out), `${label}: ${run.out}`).toContain("gets a 404");
      } finally { live.close(); }
    }
  });

  it("keeps a credential in the address out of the deploy log, whatever the password is made of", async () => {
    // A credential in `CARRY_ORIGIN` must not reach a deploy log, and a guard
    // that depends on what the secret is made of is not a guard: a password
    // may carry `?`, `#`, `/`, a space or an `@`, and a value carrying one of
    // the first four also fails `new URL`. So the shapes are the case.
    const secret = "s3cr3tPW";
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const out = distHolding();
    try {
      // Each one a character a redaction keyed to the address's shape would
      // end at, or an `@` inside the password.
      for (const [label, password] of [
        ["a question mark", `${secret}?x`],
        ["a hash", `${secret}#x`],
        ["a space", `${secret} x`],
        ["an at sign", `${secret}@x`],
      ] as [string, string][]) {
        const run = await flowRunInProcess(`http://reader:${password}@${new URL(live.url).host}/`, distHolding());
        expect(run.status, `${label}: ${run.out}`).toBe(0);
        expect(run.out, `${label}: the repository variable's secret reached the deploy log`).not.toContain(secret);
      }
      // Dropped, not the address with them: what is left is still the page this
      // step was pointed at, and it is read.
      const plain = await flowRunInProcess(`http://reader:${secret}@${new URL(live.url).host}/`, out);
      expect(plain.status, plain.out).toBe(0);
      expect(plain.out, "the repository variable's secret reached the deploy log").not.toContain(secret);
      expect(astroFilesIn(out), plain.out).toEqual([CSS_NAME]);
      // And on the paths that refuse the value before any parse has had a
      // chance to clean it: by construction the ones that failed
      // `^https?://` or failed `new URL`. What holds there is not printing a
      // value that did not parse.
      for (const [label, value] of [
        ["another scheme", `ftp://reader:${secret}@permitrulebook.com/`],
        ["no scheme at all", `u:${secret}@permitrulebook.com/`],
        ["protocol-relative", `//reader:${secret}@permitrulebook.com/`],
      ] as [string, string][]) {
        const refused = await flowRunInProcess(value, distHolding());
        expect(refused.status, `${label}: ${refused.out}`).toBe(0);
        expect(refused.out, `${label}: a value refused unparsed took the secret into the log with it`).not.toContain(secret);
        // Positive, so the absences above cannot be the whole of the case: the
        // line still says which variable was unusable, which is the diagnostic
        // the value itself was standing in for.
        expect(refused.out, `${label}: nothing in the log says which variable was unusable`).toContain("CARRY_ORIGIN");
      }
    } finally { live.close(); }
  });

  it("names no host on the summary line that no socket was opened on", async () => {
    // The counted line says which origin this run read, and it exists to be
    // read during an incident. A redaction greedy to the last `@` anywhere in
    // the value would not lose a host — it would SUBSTITUTE one: a valid
    // origin whose query carries an `@` would come out as the query's own
    // host. The rule is to never print a value that did not parse. What parsed
    // is `from`, and `new URL` has already dropped the credentials from it;
    // what did not parse has no diagnostic worth, so the line says what was
    // wrong instead of showing the value.
    //
    // That is a rule about the ENVIRONMENT's one value, and not about every
    // string this step prints — which population each rule governs is written
    // beside the rule, in `carryAssets`'s flow.
    //
    // Two runs, because this value is a valid URL and only a run with no page
    // read reaches this line at all. The first reaches it by the bail before
    // the page is parsed; the second is a value of the same shape that cannot
    // parse, which is the bail that names the variable.
    const run = await flowRunInProcess("http://permitrulebook.com/x?to=a@evil.example", "");
    expect(run.status, run.out).toBe(0);
    expect(summary(run.out), "the summary named a host this run never opened a socket on").not.toContain("evil.example");
    expect(summary(run.out), "the summary named an origin no page was read from").not.toContain("permitrulebook.com");
    const unparsed = await flowRunInProcess("//permitrulebook.com/x?to=a@evil.example", distHolding());
    expect(unparsed.status, unparsed.out).toBe(0);
    expect(summary(unparsed.out), "the summary showed a value that never parsed").not.toContain("evil.example");
    expect(summary(unparsed.out), "the summary showed a value that never parsed").not.toContain("permitrulebook.com");
    expect(summary(unparsed.out), "the summary says nothing about where it was pointed").toContain("CARRY_ORIGIN");
  });

  it("blames the origin on the counted line only when the origin was what was wrong", async () => {
    // The same line, and the same reason for caring about it: it is what an
    // incident is read from. THREE bails reach it with no page read, and the
    // third is not about the origin at all: a valid `CARRY_ORIGIN` with no
    // build directory has nothing wrong with the variable.
    //
    // The bail that ended the run is the only place that knows which bail it
    // was, so the phrase is decided there and the line prints what it is
    // handed.
    const run = await flowRunInProcess("https://permitrulebook.com/", "");
    expect(run.status, run.out).toBe(0);
    expect(summary(run.out), "the origin was blamed for a missing build directory")
      .not.toContain("no page could be read from");
    expect(summary(run.out), "the line does not say what was actually missing").toContain("build directory");
    // And the two bails that ARE about the origin still say so, and still say
    // which of the two: unset is a variable nobody set, and the other is a
    // value that is set and is not somewhere a page can be read from.
    const unset = await flowRunInProcess("", distHolding());
    expect(summary(unset.out), unset.out).toContain("an unset CARRY_ORIGIN");
    const unreadable = await flowRunInProcess("not a url", distHolding());
    expect(summary(unreadable.out), unreadable.out).toContain("no page could be read from");
  });

  it("reads the address it checked, whitespace and all", async () => {
    // The value that is checked and the value that is fetched are one string:
    // `CARRY_ORIGIN` with a space at each end is the address without them,
    // not `…/%20%20/`, which would answer 404 with no explanation in it.
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const out = distHolding();
    try {
      const run = await flowRunInProcess(`  ${live.url}/  `, out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked, run.out).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`]);
      expect(astroFilesIn(out)).toEqual([CSS_NAME]);
    } finally { live.close(); }
  });

  it("refuses four hundred foreign references without a packet or four hundred lines", async () => {
    // The other half of the ceiling: a reference that never becomes a name
    // costs no request, and it costs no line of its own either, because a page
    // is a stranger's string. Neither the network nor the log is the page's to
    // fill.
    const live = liveSiteInMemory({
      "/": {
        type: "text/html; charset=utf-8",
        body: pageOf(Array.from({ length: 400 }, (_, i) => `https://evil.example/_astro/pwn.${i}.js`)),
      },
    });
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked).toEqual(["/"]);
      expect(astroFilesIn(out)).toEqual([]);
      const lines = run.out.trim().split("\n");
      expect(lines.length, run.out).toBeLessThanOrEqual(25);
    } finally { live.close(); }
  });

  it("refuses a name longer than the filesystem would take, without fetching it", async () => {
    // A 300-character name would make the write throw ENAMETOOLONG — a page
    // could kill the deploy with an attribute.
    const long = `${"a".repeat(300)}.css`;
    const live = liveSiteInMemory({ "/": { type: "text/html; charset=utf-8", body: pageNaming(long) } });
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // Refused before the request: the page was read and nothing else was.
      expect(live.asked).toEqual(["/"]);
      expect(astroFilesIn(out)).toEqual([]);
    } finally { live.close(); }
  });
});
