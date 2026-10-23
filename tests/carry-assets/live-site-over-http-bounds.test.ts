import { afterEach, describe, expect, it } from "vitest";
import { carryAssets } from "../../scripts/carry-assets/carry.mjs";
import { liveAnswerOverHttp } from "../../scripts/live-site-over-http.mjs";
import { buildDirectoryInMemory } from "./build-directory-in-memory.js";
import { entryRunAsChildProcess } from "./carry-runs.js";
import {
  CSS, CSS_NAME, DIGESTS, astroFilesIn, distHolding, expectRefusedOver, liveDeployAnswers, sweepTemporary,
} from "./deploy-fixtures.js";
import { standInOrigin, type HttpAnswer } from "./stand-in-origin.js";

/**
 * The live site read over HTTP, on a real local server: the bounds an answer
 * is held to. A command line cannot move the origin and a redirect is an
 * error, a body is held to the ceiling and to arriving whole, and the run's
 * budget holds against a silent host. Why each of these is so is written in
 * `scripts/live-site-over-http.mjs`.
 *
 * Most cases drive the real entry as a child process (`entryRunAsChildProcess`)
 * against a local stand-in for the live origin (`stand-in-origin.ts`), so the
 * exit code is an assertion. The one that holds a budget it is handed calls
 * the flow with this reader. What the bytes of an answer over HTTP are taken
 * to be is `live-site-over-http.test.ts`'s.
 */

afterEach(sweepTemporary);

describe("the live site's answers, read over HTTP", () => {
  it("takes the origin from the environment, and nothing on the command line can move it", async () => {
    // The step passes no argv, and this is why: the flag reader takes any
    // `--name value` — the entry header's "Where the address comes from". The
    // address is a value, read from the environment, and a command line that
    // spells an origin is inert: this case hands it one, pointing at a host
    // that would answer, and measures that not a packet reached it.
    const live = await standInOrigin(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const decoy = await standInOrigin(liveDeployAnswers({ "index.DECOYAAA.css": CSS }));
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out, "--origin", decoy.url]);
      expect(run.status, run.out).toBe(0);
      expect(decoy.asked, "the command line moved the origin").toEqual([]);
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`]);
      expect(astroFilesIn(out)).toEqual([CSS_NAME]);
    } finally { live.close(); decoy.close(); }
  });

  it("refuses to follow a redirect off the host, rather than fetching where it points", async () => {
    // A same-origin name, so nothing above refuses it, answering a redirect to
    // a host we can watch — and that host serves a perfectly good stylesheet,
    // so the only reason it goes uncarried is that the redirect was refused.
    const moved = "index.GGGGGGGG.css";
    const elsewhere = await standInOrigin({ "/pwn.css": { type: "text/css; charset=utf-8", body: CSS } });
    const answers: Record<string, HttpAnswer> = liveDeployAnswers({ [moved]: CSS });
    answers[`/_astro/${moved}`] = { redirectTo: `${elsewhere.url}/pwn.css` };
    const live = await standInOrigin(answers);
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(elsewhere.asked, "the carrier followed the redirect off the host").toEqual([]);
      expect(astroFilesIn(out)).toEqual([]);
      expect(run.out).toContain(moved);
      // On the redirect, and not on the clock: a starved origin can leave all
      // three assertions above holding while the step never saw a `location:`
      // header at all. The mark is the concept rather than the sentence,
      // because the words belong to undici — today `fetch failed (unexpected
      // redirect)` — and a dependency's wording is not this step's decision.
      // See `expectRefusedOver`.
      expectRefusedOver(run.out, "redirect", "refusing the redirect instead of following it");
    } finally { live.close(); elsewhere.close(); }
  });

  it("survives a body that stops halfway", async () => {
    const answers: Record<string, HttpAnswer> = liveDeployAnswers({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = { type: "text/css; charset=utf-8", body: CSS, dropAfter: 4 };
    const live = await standInOrigin(answers);
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // Not a truncated stylesheet on disk: nothing at all.
      expect(astroFilesIn(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      // The mark is `<name>: its body`, and every word of it is this step's
      // own: that prefix is written where an answer's headers were read, a
      // body was begun, and the body is what failed. The cause after it
      // belongs to undici — `terminated (other side closed)` today — and is
      // not asserted, because a dependency's wording is not this step's
      // decision.
      //
      // TWO MARKS, and not one, because the three shapes a starved runner
      // reaches are not covered by either alone: the budget spent before the
      // request prints `anything: asset-digests.txt: The operation was aborted
      // due to timeout`, the fetch giving up before any body prints
      // `index.…css: fetch failed (other side closed)`, and a clock firing
      // mid-body prints `index.…css: its body The operation was aborted due to
      // timeout`. The first two carry no `its body` at all, so the positive
      // mark goes RED on them. The third carries `its body` and passes it, and
      // is caught by the absence instead. Disjoint shapes, so dropping either
      // leaves one of the three green for the wrong reason.
      //
      // They fail differently on purpose: the mark is the step's own wording
      // and may go red the day this step changes it; the absence is Node's,
      // and can only weaken if that wording moves, never turn a deploy red.
      // What shrinks the clock's window is `dropAfter` in `stand-in-origin.ts`.
      // See `expectRefusedOver`.
      expectRefusedOver(run.out, `${CSS_NAME}: its body`, "reading the body far enough to find it ended early");
      expect(run.out, "the socket died on the step's own clock, not on the origin's silence")
        .not.toContain("aborted due to timeout");
    } finally { live.close(); }
  });

  it("survives a body larger than the ceiling, without holding it in memory to find out", async () => {
    // Chunked, so there is no content-length to refuse it by: the ceiling has
    // to hold while the bytes are arriving.
    const big = Buffer.alloc(5 * 1024 * 1024, 0x61);
    const answers = liveDeployAnswers({ [CSS_NAME]: big });
    const live = await standInOrigin(answers);
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      // This is the largest drain here — measured, 4 MB of the 5 reach the
      // child before the ceiling trips — and it is safe because the client
      // never waits: it aborts the moment the count passes. Asserting the
      // ceiling is what says so. See `expectRefusedOver`.
      expectRefusedOver(run.out, String(4 * 1024 * 1024), "counting the body past the asset ceiling");
    } finally { live.close(); }
  });

  it("gives up when the run's time budget is spent, without waiting out a silent host", async () => {
    // The budget is a ceiling the flow sets, not a knob: there is no
    // `--budget-ms`, and the deploy passes no argv at all, so nothing
    // reachable from `pages.yml` can shrink it to 1 and turn the step into a
    // silent no-op. It is the exported flow that takes it, with the reader the
    // entry passes, and that is what this case drives.
    //
    // What it bounds is waiting on the network, which is what this case
    // measures: a host that has stopped answering. It does not bound the
    // step's own work — the ceiling on that is the ceiling on the page.
    const answers: Record<string, HttpAnswer> = liveDeployAnswers({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = { type: "text/css; charset=utf-8", body: CSS, delayMs: 5_000 };
    const live = await standInOrigin(answers);
    const out = buildDirectoryInMemory();
    try {
      const began = Date.now();
      // The real clock, as the entry passes it: the budget is measured against
      // a host that is really silent.
      const result = await carryAssets({
        origin: live.url, buildDirectory: out, liveAnswerFor: liveAnswerOverHttp, now: Date.now, budgetMs: 500,
      });
      const took = Date.now() - began;
      expect(result.carried).toEqual([]);
      expect(out.assetNames()).toEqual([]);
      // A line NAMING what it could not carry, so a lone unrelated problem
      // cannot satisfy it.
      expect(result.problems).toEqual([expect.stringContaining(CSS_NAME)]);
      // It gave up on its own clock rather than the host's.
      expect(took, `the run took ${took} ms`).toBeLessThan(4_000);
    } finally { live.close(); }
  });
});
