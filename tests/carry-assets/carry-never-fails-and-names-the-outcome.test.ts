import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carryAssets } from "../../scripts/carry-assets/carry.mjs";
import { annotationsOf, flowRunInProcess } from "./carry-runs.js";
import {
  CSS, CSS_NAME, DIGESTS, JS, JS_NAME,
  astroFilesIn, digestListBytesOf, distHolding, liveDeployAnswers, sweepTemporary, tempDirectory,
} from "./deploy-fixtures.js";
import { pageOf, pageOfSize } from "./live-page.js";
import { liveAnswerFor, liveSiteInMemory } from "./live-site-in-memory.js";

/**
 * The carry's flow — the carrier that lets a cached page still find its
 * assets — against an in-memory live site, with no socket anywhere: that it
 * never fails the deploy, and that it says which of the three outcomes
 * happened.
 *
 * Why the step exists, and what its ceilings are, is written once in
 * `scripts/carry-assets/carry.mjs`'s own header. That it never fails is the
 * promise the deploy rests on. What it carries, and from where, is
 * `carry-takes-attested-bytes-from-our-origin.test.ts`'s; what the live site
 * over HTTP does is `live-site-over-http.test.ts`'s.
 *
 * Every case runs the flow in this process (`flowRunInProcess`).
 */

const lastLine = (out: string): string => out.trim().split("\n").at(-1) ?? "";

afterEach(sweepTemporary);

/**
 * What an origin cannot make this step do to the deploy. Two kinds of case,
 * and both end the same way: exit 0, nothing written that should not be, and a
 * line naming what was left behind.
 *
 * The failures it survives — a `dist/` it cannot write into, a value that
 * would start a line of its own — and the ceilings that bound what a page may
 * cost: how large a page may be, how much of the log it may fill, and how many
 * requests it may spend. What an answer over HTTP cannot make it do is
 * `live-site-over-http.test.ts`'s.
 */
describe("the carrier cannot fail the deploy", () => {
  it("prints nothing that can become a line of its own in the deploy log", async () => {
    // In Actions a line beginning `::` is a workflow command, and this step
    // prints values it did not write. Only someone who can already set the
    // environment can reach this — the page's own strings cannot, because a
    // reference with whitespace in it never becomes a name — so it is the
    // printing that holds rather than the trust: whatever this step is
    // handed, it says on one line.
    const out = distHolding();
    const run = await flowRunInProcess("http://host.invalid/\r\n::error::title=pwn::injected", out);
    expect(run.status, run.out).toBe(0);
    const commands = run.out.split("\n").filter((line) => line.startsWith("::"));
    // The step's own annotation is a workflow command and is allowed to be
    // one; a line the value wrote is not.
    expect(commands.every((line) => line.startsWith("::warning::")), run.out).toBe(true);
    expect(run.out, "the injected text was dropped instead of being shown on one line").toContain("injected");
  });

  it("keeps a reference a page names out of the log's length as well as out of the network", async () => {
    // Every refusal prints a bounded head of the reference, so a page cannot
    // put as many 400-character lines in a deploy's log as it can name
    // references. A log nobody can read is the same as no log.
    const long = `https://evil.example/_astro/${"a".repeat(400)}.js`;
    const live = liveSiteInMemory({ "/": { type: "text/html; charset=utf-8", body: pageOf([long]) } });
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked, "a refused reference cost a request").toEqual(["/"]);
      const longest = Math.max(...run.out.trim().split("\n").map((line) => line.length));
      expect(longest, run.out).toBeLessThan(200);
      // Still reported, and still recognisable as the reference it refused.
      expect(run.out).toContain("evil.example");
    } finally { live.close(); }
  });

  it("keeps the content type an origin answers with out of the log's length too", async () => {
    // The same rule one population over: a `content-type` is the origin's
    // string, not the page's, bounded by nothing but Node's header limit and
    // reachable up to twenty times in one run. `oneLine` means it cannot forge
    // a workflow command, so the whole of the cost would be a deploy log
    // nobody can read — which is exactly what `short` exists to stop.
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS });
    // The body is the real one, so the refusal turns on the type alone.
    answers[`/_astro/${CSS_NAME}`] = { type: `x-${"a".repeat(6000)}`, body: CSS };
    const live = liveSiteInMemory(answers);
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([]);
      const longest = Math.max(...run.out.trim().split("\n").map((line) => line.length));
      expect(longest, run.out).toBeLessThan(200);
      // Still reported, and still recognisable as the type it refused.
      expect(run.out, run.out).toContain("answered 200 as x-aaa");
    } finally { live.close(); }
  });

  it("survives a dist it cannot write into", async () => {
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    // `_astro` as a FILE: portable across platforms, where a permission bit is
    // not — Windows lets a process write into its own read-only directory.
    const out = tempDirectory();
    writeFileSync(join(out, "_astro"), "not a directory");
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(statSync(join(out, "_astro")).isFile(), "the carrier replaced the path it could not write").toBe(true);
      expect(readFileSync(join(out, "_astro"), "utf8"), "the carrier wrote over the path").toBe("not a directory");
      // And it left nothing else behind in the build it could not fill — not
      // even the digest list, which it could not honestly write either: the
      // assets it would describe are behind the same unreadable path.
      expect(readdirSync(out)).toEqual(["_astro"]);
      expect(run.out).toContain(DIGESTS);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  it("refuses a live page over its 512 KB ceiling before asking for anything else", async () => {
    // The ceiling on the page is the ceiling on reading its names, and it is
    // the page's own: a page is an index.html, today 11,569 bytes, and 512 KB
    // is not an asset's 4 MB.
    const live = liveSiteInMemory({ "/": { type: "text/html; charset=utf-8", body: Buffer.from(pageOfSize(1024 * 1024), "utf8") } });
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // Read and refused: the list was never even asked for.
      expect(live.asked).toEqual(["/"]);
      expect(astroFilesIn(out)).toEqual([]);
    } finally { live.close(); }
  });

  /**
   * Four hundred references, because the ceiling counts what is asked for
   * rather than what is carried: counted the other way, 400 references that
   * all 404 would cost 401 requests and 401 printed lines — a tampered page
   * turned into a request generator against our own origin and an unbounded
   * Actions log. What a page can make this step do is measured in requests,
   * so both shapes are measured the same way: the page, the digest list, and
   * then at most twenty assets.
   */
  const manyNames = Array.from({ length: 400 }, (_, i) => `index.${String(i).padStart(8, "0")}.css`);
  const many = Object.fromEntries(manyNames.map((name) => [name, CSS]));

  it("asks for twenty assets at most, however many the page names", async () => {
    const live = liveSiteInMemory(liveDeployAnswers(many));
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // The page, the list, then twenty assets, and not a request more.
      expect(live.asked).toHaveLength(22);
      expect(astroFilesIn(out)).toHaveLength(20);
    } finally { live.close(); }
  });

  it("asks for twenty at most when every one of them 404s, and prints a bounded list", async () => {
    const answers = liveDeployAnswers(many);
    for (const name of manyNames) delete answers[`/_astro/${name}`];
    const live = liveSiteInMemory(answers);
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked).toHaveLength(22);
      expect(astroFilesIn(out)).toEqual([]);
      // One line per request it spent, one for the rest, one summary — not one
      // line per reference a stranger's page happened to name.
      const lines = run.out.trim().split("\n");
      expect(lines.length, run.out).toBeLessThanOrEqual(25);
    } finally { live.close(); }
  });
});

/**
 * Which of the three things happened, and whether the deploy log says so.
 *
 * Nothing in this repository reads this step's output, so the run summary is
 * the only place a reader's broken page is ever going to be predicted: the
 * quiet outcome has to be rare and true, and both loud ones have to be loud.
 * When the step ends quiet and when it raises the annotation is one rule,
 * written where the verdict is computed in `scripts/carry-assets/carry.mjs`;
 * these cases measure the flow against it.
 */
describe("the step says which of the three things happened", () => {
  it("is quiet only when this build already has everything the live page names", async () => {
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const out = distHolding({ [CSS_NAME]: CSS });
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // It read the page and found nothing to do: one request, no annotation.
      expect(live.asked).toEqual(["/"]);
      expect(annotationsOf(run.out), run.out).toBe("");
    } finally { live.close(); }
  });

  it("raises the annotation on every path that gives up before it can look", async () => {
    // When the step could not look, it does not know whether the window is
    // open, and that is exactly when it has to say so — on every return before
    // the page has been read, not only on the ones after.
    const stopped = liveSiteInMemory({ "/": { status: 503, type: "text/html", body: Buffer.from("down") } });
    const flood = liveSiteInMemory({ "/": { type: "text/html; charset=utf-8", body: Buffer.from(pageOfSize(1024 * 1024), "utf8") } });
    try {
      const cases: [string, string][] = [
        ["no origin at all", ""],
        ["a value that is not an address", "ftp://permitrulebook.com/"],
        ["an address that does not parse", "http://["],
        ["a host that answers nothing", "http://127.0.0.1:1"],
        ["a page that answers 503", stopped.url],
        ["a page over the 512 KB ceiling", flood.url],
      ];
      for (const [label, value] of cases) {
        const out = distHolding();
        const run = await flowRunInProcess(value, out);
        expect(run.status, `${label}: ${run.out}`).toBe(0);
        expect(annotationsOf(run.out), `${label} ended as quiet as a healthy deploy: ${run.out}`).not.toBe("");
        // And it says which of the three it is: it could not look, so it does
        // not claim to know what a reader will find.
        expect(annotationsOf(run.out), `${label}: ${run.out}`).toContain("could not read the live page");
      }
      // The seventh return is the export's own: the entry always passes a
      // build directory, so `looked` is where that path is measured.
      const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
      try {
        expect((await carryAssets({ origin: live.url, liveAnswerFor })).looked).toBe(false);
      } finally { live.close(); }
    } finally { stopped.close(); flood.close(); }
  });

  it("raises the annotation for a name it left behind, even when it carried another", async () => {
    // Carrying one name of two is a normal outcome, and the one left behind is
    // still a 404 for a reader holding that page: the page names two, the list
    // names one, one is carried and one left behind.
    const stale = "index.STALE001.css";
    const shared = "index.SHARED02.js";
    const answers = liveDeployAnswers({ [stale]: CSS, [shared]: JS });
    answers[`/${DIGESTS}`] = { type: "text/plain; charset=utf-8", body: digestListBytesOf({ [shared]: JS }) };
    const live = liveSiteInMemory(answers);
    const out = distHolding();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([shared]);
      expect(annotationsOf(run.out), run.out).toContain(stale);
      // The one it did carry is not what the reader is missing, so it is not
      // in the line that names what the reader is missing.
      expect(annotationsOf(run.out), run.out).not.toContain(shared);
    } finally { live.close(); }
  });

  it("does not call a healthy deploy a disagreement over one reference it could never carry", async () => {
    // "The page and the list are from different deploys" is decided on the
    // page's WHOLE reference set against the list — those are the two things
    // that either describe the same deploy or do not. On the ordinary deploy
    // that changed neither asset, both real names are already built, so one
    // stray reference would otherwise be the whole of what is needed.
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS, [JS_NAME]: JS });
    answers["/"] = {
      type: "text/html; charset=utf-8",
      body: pageOf([`/_astro/${CSS_NAME}`, `/_astro/${JS_NAME}`, "/_astro/../../pwn.css"]),
    };
    const live = liveSiteInMemory(answers);
    const out = distHolding({ [CSS_NAME]: CSS, [JS_NAME]: JS });
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(run.out, "a healthy deploy was called a disagreement between two generations")
        .not.toContain("different deploys");
      expect(astroFilesIn(out)).toEqual([CSS_NAME, JS_NAME].sort());
      // It still says what it could not carry, and still says it plainly: the
      // reader's page asks for a name nothing here can account for.
      expect(annotationsOf(run.out), run.out).toContain("pwn.css");
    } finally { live.close(); }
  });

  it("does not end quiet on a 200 page that names none of this deploy's assets", async () => {
    // A proxy notice, a maintenance page or an error page answered 200 must
    // not be granted the silence of a healthy deploy on evidence nothing
    // validated. Our own `/` always names assets; a live page that names none
    // is not this site's deploy answering.
    const live = liveSiteInMemory({
      "/": { type: "text/html; charset=utf-8", body: Buffer.from("<!DOCTYPE html><html><body>back soon</body></html>", "utf8") },
    });
    const out = distHolding({ [CSS_NAME]: CSS });
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked, run.out).toEqual(["/"]);
      expect(annotationsOf(run.out), `a page with nothing in it ended as quiet as a healthy deploy: ${run.out}`).not.toBe("");
      // And it says which outcome this is: the page was read, so the step does
      // not claim it could not look.
      expect(annotationsOf(run.out), run.out).not.toContain("could not read the live page");
    } finally { live.close(); }
  });

  it("raises the annotation when this build could not publish its own digest list", async () => {
    // On a deploy whose page names are all already built, a failed publish
    // printed as a plain line would read exactly like a healthy run — while
    // the NEXT deploy is guaranteed to carry nothing, which is the window this
    // step exists to close.
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    // This build already has every name the live page references, so there is
    // nothing to carry, nothing missing and nothing else for the step to say.
    // The list's own path is a DIRECTORY — portable, where a permission bit is
    // not — so the publish is the one thing that fails.
    const out = distHolding({ [CSS_NAME]: CSS });
    mkdirSync(join(out, DIGESTS));
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked, "the run had nothing to carry, which is what hid this").toEqual(["/"]);
      expect(annotationsOf(run.out), run.out).toContain(DIGESTS);
    } finally { live.close(); }
  });

  it("tells the three outcomes apart in the deploy log", async () => {
    // Refusing everything, having no work to do, and never reaching the page
    // each print a last line of their own, because the first evidence of a
    // silent step would otherwise be a reader's unstyled page. Still exit 0 on
    // all three: it never fails the deploy.
    const refusing = liveDeployAnswers({ [CSS_NAME]: CSS });
    refusing[`/_astro/${CSS_NAME}`] = { status: 500, type: "text/html", body: Buffer.from("no") };
    const bad = liveSiteInMemory(refusing);
    const idle = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const missing = distHolding();
    const nothingToCarry = distHolding({ [CSS_NAME]: CSS });
    const blind = distHolding();
    try {
      const alarm = await flowRunInProcess(bad.url, missing);
      const quiet = await flowRunInProcess(idle.url, nothingToCarry);
      const unseen = await flowRunInProcess("http://127.0.0.1:1", blind);
      for (const run of [alarm, quiet, unseen]) expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(missing)).toEqual([]);
      const said = [alarm, quiet, unseen].map((run) => lastLine(run.out));
      expect(new Set(said).size, said.join("\n")).toBe(3);
      // And the loud one names what the reader is going to ask for and not get.
      expect(annotationsOf(alarm.out), alarm.out).toContain(CSS_NAME);
      expect(annotationsOf(quiet.out), quiet.out).toBe("");
      expect(annotationsOf(unseen.out), unseen.out).not.toBe("");
    } finally { bad.close(); idle.close(); }
  });
});
