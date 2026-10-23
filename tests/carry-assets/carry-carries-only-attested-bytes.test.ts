import { describe, expect, it } from "vitest";
import { readAssetNames, writeAssetDigests } from "../../scripts/carry-assets/carry.mjs";
import { openBuildDirectoryInMemory } from "./build-directory-in-memory.js";
import { flowRunInProcess } from "./carry-runs.js";
import {
  CSS, CSS_NAME, DIGESTS, HEADER, JS, JS_NAME, digestListBytesOf, expectRefusedOver, liveDeployAnswers, sha256,
} from "./deploy-fixtures.js";
import { pageOf } from "./live-page.js";
import { liveSiteInMemory } from "./live-site-in-memory.js";

/**
 * The carry's flow against an in-memory live site and build directory, on a
 * fixed clock, run in this process (`flowRunInProcess`): which bytes it takes
 * as attested. What it takes forward is
 * `carry-takes-the-live-generation-forward.test.ts`'s.
 */

/**
 * The authority for a carried byte: the digest list, and what it is and is not
 * worth. That reading is written once, in `scripts/carry-assets/generation/digest-list.mjs`
 * under "What makes a carried byte trustworthy", and it is not repeated here
 * — the measurements that argue for each case are in the case.
 *
 * What these assert is which bodies are written, which are refused, and how
 * few requests a refusal costs. The refusals that turn on how an answer was
 * framed over HTTP are `live-site-over-http.test.ts`'s.
 */
describe("the carrier carries only what our own previous build attested to", () => {
  it("publishes the digest list this build's assets will be checked against", () => {
    const out = openBuildDirectoryInMemory({ [CSS_NAME]: CSS, [JS_NAME]: JS });
    const result = writeAssetDigests(out);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(out.besidePage.get(DIGESTS)).toBe(
      `${HEADER}\n${sha256(CSS)}  ${CSS_NAME}\n${sha256(JS)}  ${JS_NAME}\n`,
    );
  });

  it("publishes this build's digest list as part of the step, before it carries anything into the build", async () => {
    // The list describes what this build BUILT, so it is written before a
    // carried file lands in `_astro/` — and it is published whether or not
    // anything is carried, because the next deploy's whole check is this file.
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const out = openBuildDirectoryInMemory({ [JS_NAME]: JS });
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(out.assetNames()).toEqual([CSS_NAME, JS_NAME].sort());
      // This build's own asset, and not the one it carried a moment later.
      expect(out.besidePage.get(DIGESTS)).toBe(`${HEADER}\n${sha256(JS)}  ${JS_NAME}\n`);
    } finally { live.close(); }
  });

  it("carries nothing when the live deploy published no digest list", async () => {
    // A live deploy with no list is one this carries nothing from; it still
    // publishes the list the deploy after it will read.
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS });
    delete answers[`/${DIGESTS}`];
    const live = liveSiteInMemory(answers);
    const out = openBuildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(out.assetNames()).toEqual([]);
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
    const out = openBuildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(out.assetNames()).toEqual([]);
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
    const out = openBuildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(out.assetNames()).toEqual([]);
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
    const out = openBuildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(out.assetNames()).toEqual([CSS_NAME, JS_NAME].sort());
      // `pwn.css` cost no request: it is named in a line, not fetched.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`, `/_astro/${JS_NAME}`]);
      expect(run.out).toContain("pwn.css");
    } finally { live.close(); }
  });

  it("holds the list to the same rule for a name as the carrier does", async () => {
    // One rule, spelled once, in `generation/asset-names.mjs`: the carrier's plain name
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
    const out = openBuildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(out.assetNames()).toEqual([]);
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
    const out = openBuildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // It went all the way to the asset and came back with nothing written.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`]);
      expect(out.assetNames()).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      // For being empty, which is the whole of this case — the digest agrees
      // here, so emptiness is the only verdict left that is about the body.
      // See `expectRefusedOver`.
      expectRefusedOver(run.out, "empty body", "finding the body empty");
    } finally { live.close(); }
  });
});
