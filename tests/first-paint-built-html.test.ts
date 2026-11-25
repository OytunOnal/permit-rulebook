import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { remainingQuestions, type Dataset } from "permit-rulebook-data";
import { LINK_ARRIVAL_LINE, NO_SCRIPT_LINE, RETURNING_LINE } from "../src/lib/copy/interview.js";
import { questionCardHtml, renderStandInsOverQuestionOne } from "../src/lib/question.js";
import { FEEDBACK_PATH, url } from "../src/lib/site.js";

/**
 * The first paint: the page shipped `<main id="main"></main>` empty and a
 * 220 KB module drew the first question into it afterwards; everything below
 * moved down to make room. Now the screen is in the HTML the build writes (s10).
 */
const dist = fileURLToPath(new URL("../dist", import.meta.url));
// The dataset the renderer draws question one from, read as the build reads it.
const DATASET = rawDataset as unknown as Dataset;

/** Checks the box the build ships is byte for byte the renderer's question one with its stand-ins. */
function expectTheRenderersMarkup(dataset: Dataset, inMain: string): void {
  // Byte for byte, which is the whole claim: the label, the options, what
  // each one means and the help link are in the page because the renderer
  // put them there, so there is no second copy to drift.
  const questions = remainingQuestions(dataset, {});
  expect(inMain).toBe(questionCardHtml({
    dataset, question: questions[0], answers: {}, asked: [], editing: null,
    total: questions.length,
  }) + renderStandInsOverQuestionOne());
}

/** Checks the noscript box ships the product's one sentence saying JavaScript is missing. */
function expectTheNoScriptSentence(inMain: string): void {
  // Asserted as a sentence off the built page, not as the constant read back
  // to itself: emptying the copy line used to leave every case green and
  // ship `<noscript><p class="nojs"></p></noscript>` (Standards review;
  // ROADKEEPER_STANDARDS.md, Tests — a test asserts a decision, not content).
  const line = /<noscript>([\s\S]*?)<\/noscript>/.exec(inMain)?.[1] ?? "";
  const words = line.replace(/<[^>]*>/g, "").trim();
  expect(words, "the noscript box shipped empty").not.toBe("");
  expect(words.length, `too short to be a sentence: ${JSON.stringify(words)}`).toBeGreaterThan(20);
  expect(words, "it does not say what is missing").toMatch(/JavaScript/);
  expect(words, "not a sentence").toMatch(/\.$/);
  // And it is the product's one wording for it, said in the copy module.
  expect(words).toBe(NO_SCRIPT_LINE);
}

/** Checks each stand-in ships as the product's sentence for its reader. */
function expectAStandInSentencePerReader(inMain: string): void {
  // Asserted as sentences off the built page and not as the constants read
  // back to themselves: emptying either one has to turn this red, the way
  // emptying the noscript line does (ROADKEEPER_STANDARDS.md, Tests — a test
  // asserts a decision, not content). The decision is that a reader who is about to
  // have their screen replaced is told so, in words, rather than being shown
  // a question they have already answered.
  for (const [where, expected] of [
    ["stand-in-record", RETURNING_LINE],
    ["stand-in-link", LINK_ARRIVAL_LINE],
  ] as const) {
    const said = new RegExp(`<p class="stand-in ${where}">([^<]*)</p>`).exec(inMain)?.[1] ?? "";
    expect(said, `${where} shipped empty`).not.toBe("");
    expect(said.length, `${where} is too short to be a sentence: ${JSON.stringify(said)}`)
      .toBeGreaterThan(20);
    expect(said, `${where} is not a sentence`).toMatch(/[.!]$/);
    expect(said).toBe(expected);
  }
}

/**
 * The other half of the promise, read off the built page rather than measured:
 * the screen is there before any script is, and it is the renderer's own
 * output — not a second copy of the markup kept in step by hand.
 */
describe.skipIf(!existsSync(dist))("the first question ships in the HTML (s10)", () => {
  const dataset = DATASET;
  const built = readFileSync(join(dist, "index.html"), "utf8");
  const inMain = /<main id="main">([\s\S]*?)<\/main>/.exec(built)?.[1] ?? "";

  it("is the very markup the renderer draws, drawn by the renderer", () => {
    expectTheRenderersMarkup(dataset, inMain);
  });

  it("tells a reader with no script, in a sentence, why they cannot answer it", () => {
    expectTheNoScriptSentence(inMain);
  });

  it("offers no feedback line: the cold / is a question, and the line is the verdict's (s13)", () => {
    // The line under the verdict — "Something to say about this result?" —
    // appears on a results screen only, never on a question, never before an
    // answer (`tests/s13-frame.test.ts`). The built first paint is question one
    // with nothing on the record, so the box the build paints must not link
    // the page the line leads to.
    expect(inMain, "the cold first paint links /feedback/").not.toContain(url(FEEDBACK_PATH));
    expect(inMain).not.toContain('class="say"');
  });

  it("carries a sentence for each reader whose screen is not the one it painted", () => {
    expectAStandInSentencePerReader(inMain);
  });
});
