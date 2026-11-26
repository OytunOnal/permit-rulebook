import { describe, expect, it } from "vitest";
import { COPIED, FEEDBACK_DOORS } from "../src/lib/copy/feedback.js";
import { FEEDBACK_ADDRESS, FEEDBACK_PATH, url } from "../src/lib/site.js";
import { feedbackGmail, feedbackMailto } from "../src/lib/feedback-page.js";
import { replayRecord } from "../src/lib/scope.js";
import { PAINTED_AS_COMPOSED, paintedAsComposedScript, verdictFor } from "./verdict-cards.js";
import { withSite } from "./browser-walk.js";
import { LAYOUTS, ds, frRecord, skipped, warnFeedbackDoorNotWalked } from "./s13-feedback-door.js";
import type { Profile } from "permit-rulebook-data";
import type { BrowserPage } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page/interview-page.mjs";

/**
 * s13 — the feedback door, walked in a browser: the line under the verdict on
 * a results screen, /feedback/ reached from it, and the page's own copy
 * button and tap targets.
 *
 * The bound this slice exists to keep: the mail carries nothing the reader
 * declared. On a real screen, with a record on the device, every link to a
 * mail is still the build-time constant.
 */

warnFeedbackDoorNotWalked();

/** In the page: what the results screen says about feedback, and what it carries, as JSON. */
function readSayInPage(): string {
  const main = document.getElementById("main")!;
  const say = main.querySelector(".say");
  const link = say && say.querySelector("a");
  return JSON.stringify({ present: !!say,
    height: link ? Math.round(link.getBoundingClientRect().height) : 0,
    mailtos: [...document.querySelectorAll("a[href^='mailto:']")].map((a) => a.getAttribute("href")) });
}

/** What the results screen says about feedback, and what it carries: the expression a case evaluates. */
const SAY = `(${readSayInPage})()`;

/** Checks the results screen `arrival` opens on, with `profile` saved, paints its verdict with a tap-sized line and no mailto. */
async function expectLineOnResultsScreen(profile: Profile, arrival: string): Promise<void> {
  const seen = await withSite(async (site) => {
    const { page: tab } = site;
    const interview = new InterviewPage(site);
    await interview.seed(profile);
    await interview.open(arrival);
    await tab.waitUntilAtRest();
    return {
      say: JSON.parse(await tab.evaluate(SAY)),
      // The record as the page restores it: replayed through the
      // interview, which drops what it would not ask (France never
      // asks the five-year question).
      painted: JSON.parse(await tab.evaluate(paintedAsComposedScript(
        verdictFor(replayRecord(ds, profile, Object.keys(profile)).answers),
      ))),
    };
  }, { viewport: { width: 1100, height: 1000 }, mobile: false }) as {
    say: { height: number; mailtos: string[] }; painted: typeof PAINTED_AS_COMPOSED;
  };

  // The layout, where the line sits, its words and its link are the
  // verdict's ("the results line, from the verdict"); the page paints
  // that verdict, and the link is a tap target.
  expect(seen.painted).toEqual(PAINTED_AS_COMPOSED);
  expect(seen.say.height, `the link is ${seen.say.height} px`).toBeGreaterThanOrEqual(44);
  // No mailto: anywhere on a results screen: the door in the body is a
  // link to a page, and the footer stopped carrying the address on the
  // s13 walk. Nothing here could carry the record into a mail.
  expect(seen.say.mailtos, "a mailto: on the results screen").toEqual([]);
}

/** Checks /feedback/, reached from the results line, carries no query and only the constant mail links. */
async function expectFeedbackHrefsAreConstants(): Promise<void> {
  const seen = JSON.parse(await withSite(async (site) => {
    const { page: tab } = site;
    const interview = new InterviewPage(site);
    await interview.seed(frRecord);
    await interview.open("/?country=fr");
    await tab.evaluate('document.querySelector(".say a").click()');
    await tab.waitUntilNewDocumentDrawn();
    return tab.evaluate(
      'JSON.stringify({ path: location.pathname,'
      + ' mailtos: [...document.querySelectorAll("a[href^=\'mailto:\']")].map((a) => a.getAttribute("href")),'
      + ' gmails: [...document.querySelectorAll("a[href^=\'https://mail.google.com/\']")]'
      + '   .map((a) => a.getAttribute("href")),'
      + ' search: location.search })',
    );
  }, { viewport: { width: 1100, height: 1000 }, mobile: false }) as string) as
    { path: string; mailtos: string[]; gmails: string[]; search: string };

  expect(seen.path).toBe(url(FEEDBACK_PATH));
  // The line links the page and nothing else: no query travels with it.
  expect(seen.search, "the results line carried a query to /feedback/").toBe("");
  // Both links of every door, and every one of them the build-time
  // constant to the byte: a record on the device and a screen just left,
  // and nothing of either reached any of them. (Neither the footer nor the
  // address line links a mail now, so the doors are the whole list.)
  expect(seen.gmails).toEqual(FEEDBACK_DOORS.map(feedbackGmail));
  expect(seen.mailtos).toEqual(FEEDBACK_DOORS.map(feedbackMailto));
}

/** Checks neither the first question screen nor the second offers the results line. */
async function expectNoQuestionScreenCarriesLine(): Promise<void> {
  const seen = JSON.parse(await withSite(async (site) => {
    const { page: tab } = site;
    const interview = new InterviewPage(site);
    await interview.open();
    await tab.waitUntilAtRest();
    const first = await tab.evaluate(SAY);
    // One answer in, still a question screen: question one's first option.
    await interview.answer("destination", "de");
    const second = await tab.evaluate(SAY);
    return JSON.stringify({ first: JSON.parse(first), second: JSON.parse(second) });
  }, { viewport: { width: 1100, height: 1000 }, mobile: false }) as string) as
    { first: { present: boolean }; second: { present: boolean } };

  expect(seen.first.present, "question one offers a line about a result").toBe(false);
  expect(seen.second.present, "question two offers a line about a result").toBe(false);
}

describe.skipIf(skipped !== null)("the walk: a record, a results screen, the line", () => {
  // A saved record and an arrival that names the country it is already for:
  // the flat, one-country layout, which has no country sections at all. And
  // the multi-country layout, which an arrival cannot produce: one
  // <details class="country-sec"> per country shown.
  for (const [name, profile, arrival] of LAYOUTS)
    it(`the line is under the strip on the ${name} layout, and its link is the page`,
      () => expectLineOnResultsScreen(profile, arrival), 180000);

  it("and on /feedback/ reached from that screen the hrefs are the constants, byte for byte",
    () => expectFeedbackHrefsAreConstants(), 180000);

  it("no question screen carries it", () => expectNoQuestionScreenCarriesLine(), 180000);
});

/** The address's copy button on /feedback/, as a page expression. */
const copyButton = 'document.querySelector(".addr button[data-copy]")';
/** The word beside the address, as a page expression. */
const doneWord = 'document.querySelector(".addr .done")';

/** The word beside the address at each moment of the two taps. */
interface TapWords { before: string; afterIcon: unknown; later: string; afterText: unknown }

/** What the copy-button walk reads off /feedback/. */
interface CopyButtonSeen {
  copied: string[]; before: string; afterIcon: string; later: string; afterText: string;
  height: number; borderWidth: string; icon: number; visible: string; text: string;
}

/** Taps the glyph, waits for the word to clear, taps the address text, and returns the word at each moment. */
async function tapGlyphThenAddress(tab: BrowserPage): Promise<TapWords> {
  // The word beside the address, at each moment. Two taps: the glyph's
  // own box, and the address text — both are the one button.
  // A tap's word waits on the copy it follows, and the clearing on the word gone.
  const before = await tab.evaluate(`${doneWord}.textContent`);
  await tab.evaluate(`${copyButton}.querySelector("svg").dispatchEvent(new MouseEvent("click", { bubbles: true }))`);
  const afterIcon = await tab.waitUntil(`window.__copied.length === 1 && ${doneWord}.textContent`, "the glyph's tap never said anything");
  await tab.waitUntil(`${doneWord}.textContent === ""`, "the word never cleared");
  const later = await tab.evaluate(`${doneWord}.textContent`);
  await tab.evaluate('document.getElementById("feedback-address").dispatchEvent(new MouseEvent("click", { bubbles: true }))');
  const afterText = await tab.waitUntil(`window.__copied.length === 2 && ${doneWord}.textContent`, "the address's tap never said anything");
  return { before, afterIcon, later, afterText };
}

/** The clipboard's record, the tap words and the button's own look, as JSON. */
function copyButtonRead(tab: BrowserPage, { before, afterIcon, later, afterText }: TapWords): Promise<string> {
  return tab.evaluate(
    `JSON.stringify({ copied: window.__copied, before: ${JSON.stringify(before)},`
    + ` afterIcon: ${JSON.stringify(afterIcon)}, later: ${JSON.stringify(later)},`
    + ` afterText: ${JSON.stringify(afterText)},`
    + ` height: Math.round(${copyButton}.getBoundingClientRect().height),`
    // Text-like, not a box; the glyph at the text's size; no visible word.
    + ` borderWidth: getComputedStyle(${copyButton}).borderTopWidth,`
    + ` icon: Math.round(${copyButton}.querySelector("svg").getBoundingClientRect().width),`
    + ` visible: ${copyButton}.textContent.trim(),`
    + ' text: document.getElementById("feedback-address").textContent })',
  );
}

/** In the page: the clipboard stood in for by a stub that records, in `window.__copied`, each text it is handed. */
function stubTheClipboardInPage(): number {
  const page = window as unknown as { __copied: string[] };
  page.__copied = [];
  Object.defineProperty(navigator, "clipboard", { value: {
    writeText: (t: string) => { page.__copied.push(t); return Promise.resolve(); } }, configurable: true });
  return 1;
}

/** The copy button walked on /feedback/ with the clipboard stubbed: what it copied, said and looks like. */
async function copyButtonSeen(): Promise<CopyButtonSeen> {
  return JSON.parse(await withSite(async ({ page: tab, url }) => {
    await tab.goto(url("/feedback/"));
    // Headless Chrome may refuse the clipboard: the write is stood in for
    // by a stub that records what it was handed, which is the fact under
    // test — the script hands the clipboard the page's address and nothing
    // else. The button's own words are read off the screen.
    await tab.evaluate(`(${stubTheClipboardInPage})()`);
    return copyButtonRead(tab, await tapGlyphThenAddress(tab));
  }, { viewport: { width: 1000, height: 900 }, mobile: false }) as string) as CopyButtonSeen;
}

/** Checks both taps copied the address and said so, the word cleared, and the button is a tap-sized bare address with its glyph. */
async function expectCopyButtonCopiesAndSays(): Promise<void> {
  const seen = await copyButtonSeen();

  expect(seen.text).toBe(FEEDBACK_ADDRESS);
  // Both taps copied the address and nothing else.
  expect(seen.copied, "the clipboard was handed something other than the address")
    .toEqual([FEEDBACK_ADDRESS, FEEDBACK_ADDRESS]);
  expect(seen.before).toBe("");
  expect(seen.afterIcon, "the glyph did not say it had copied").toBe(COPIED);
  expect(seen.later, "the word did not clear").toBe("");
  expect(seen.afterText, "the address text did not say it had copied").toBe(COPIED);
  expect(seen.height, `the button is ${seen.height} px`).toBeGreaterThanOrEqual(44);
  expect(seen.borderWidth, "the address has a border").toBe("0px");
  expect(seen.icon, `the glyph is ${seen.icon} px`).toBeGreaterThanOrEqual(14);
  // The only visible text of the button is the address itself.
  expect(seen.visible).toBe(FEEDBACK_ADDRESS);
}

/** Checks every link and button on /feedback/ is at least 44 px tall and the page never scrolls sideways at `width`. */
async function expectTapFloorAt(width: number, height: number, mobile: boolean): Promise<void> {
  const seen = JSON.parse(await withSite(async ({ page: tab, url }) => {
    await tab.goto(url("/feedback/"));
    return tab.evaluate(
      'JSON.stringify({ overflow: document.documentElement.scrollWidth'
      + ' - document.documentElement.clientWidth,'
      + ' targets: [...document.querySelectorAll("main a, main button")].map((el) => ({'
      + '   text: el.textContent.trim().slice(0, 40),'
      + '   height: Math.round(el.getBoundingClientRect().height) })) })',
    );
  }, { viewport: { width, height }, mobile })) as
    { overflow: number; targets: { text: string; height: number }[] };

  expect(seen.targets.length, "the page has no doors on it").toBeGreaterThanOrEqual(6);
  for (const target of seen.targets)
    expect(target.height, `"${target.text}" is ${target.height} px at ${width}`)
      .toBeGreaterThanOrEqual(44);
  expect(seen.overflow, `/feedback/ scrolls sideways by ${seen.overflow} px at ${width}`)
    .toBeLessThanOrEqual(0);
}

describe.skipIf(skipped !== null)("/feedback/ itself, at both widths", () => {
  it("the Copy button puts the address on the clipboard and says so for two seconds",
    () => expectCopyButtonCopiesAndSays(), 180000);

  for (const [width, height, mobile] of [[390, 844, true], [1000, 900, false]] as const)
    it(`every button and link reaches the tap floor at ${width} px`, () => expectTapFloorAt(width, height, mobile), 180000);
});
