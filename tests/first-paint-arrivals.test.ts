import { beforeAll, describe, expect, it } from "vitest";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { LINK_ARRIVAL_LINE, RETURNING_LINE } from "../src/lib/copy/interview.js";
import { WIDE_FROM_PX } from "../src/lib/first-paint.js";
import { replayRecord } from "../src/lib/scope.js";
import { walkSite, type BrowserPage, type PageOnSite } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page/interview-page.mjs";
import { ABOVE_THE_BOX } from "./layout-shifts.js";
import {
  ARRIVALS, HELD_MODULE, LANDS_ON, VIEWPORTS, detail, readAtFirstPaint, readMeasured, skipped,
  type AtFirstPaint, type Measured,
} from "./first-paint-measure.js";

/**
 * The first paint, measured the way the field measures it.
 *
 * The counter's Core Web Vitals (Cloudflare, read 2026-09-10, bots excluded)
 * put Cumulative Layout Shift poor for 23% of samples while LCP and INP were
 * good for 100%, and named what moves: `#app` at 0.402 and the shared footer
 * at 0.414, against Google's "poor" line of 0.25. The page shipped
 * `<main id="main"></main>` empty and a 220 KB module drew the first question
 * into it afterwards; everything below moved down to make room.
 *
 * No gate here could see it. On a loopback the module arrives with the HTML
 * and Chrome paints once, so CLS reads 0 — the defect only exists when the
 * HTML is on screen before the script lands. So this case asks the server to
 * hold the module back, which is the one thing the reproduction of 2026-09-15
 * had that the suite did not (s10).
 *
 * What it asserts is four things, because the number alone is not the promise.
 * The number, on every arrival. WHICH nodes moved, because a 0.09 made
 * entirely of the masthead would pass a bound that forbids the page moving
 * under the reader. How far the FOOTER travelled in pixels, because the
 * score cannot see a footer below the fold and the reader with a taller phone
 * can. And that the module leaves the built screen ALONE: rewriting identical
 * markup shifts nothing, so the number reads 0 whether the module skips the
 * write or repeats it, and only node identity tells the two apart (Spec and
 * Standards reviews, 2026-09-15).
 *
 * Measured 2026-09-15 on the build this file gates, module 700 ms late. Before
 * is master at 390x844; after is all three screens.
 *
 *   arrival                  before   390x844        390x1400       1280x900
 *   / cold, no record         0.110   0      +0px    0      +0px    0      +0px
 *   /?country=fr              0.280   0.005  +205px  0.052  +205px  0.009  +105px
 *   / saved record            0.156   0      -2px    0.001  -2px    0.005  -45px
 *   /?route=de-blue-card-…    0.305   0.006  +246px  0.062  +246px  0.009  +105px
 *   / finished record         0.579   0    +4786px  0    +4786px  0    +3454px
 *
 * Every residual is one thing and it is the only one this slice could not
 * remove: the screen a returning or arriving reader gets is a different screen
 * — a different question, and a line saying what the arrival did — and it is
 * not the height of the one the build painted. What moved the page ABOVE the
 * box (the masthead's promise, 0.082 of the record arrival's 0.156) and what
 * folded the ledger away after the fact (0.008 of the cold page) are both
 * decided in <head> now, before anything is painted, and read as zero.
 *
 * The finished-record row is s22's, measured 2026-09-16 with a record the
 * product writes today (the seed until then replayed as a half record, and
 * this file measured a question screen under a verdict's name — v1.1 gate
 * critique, N2: 0.65 / 0.76 / 0.56 in the field's own measurement, 0.579 /
 * 0.719 / 0.464 here). It is the one arrival where the box does not hold: the
 * routes carry the footer thousands of pixels in the frame the verdict is
 * drawn, so the frame's distance fraction is 1 and ANY element visible above
 * the routes that moves at all is charged its whole area — a 5 px change in
 * the masthead's height measured 0.446 on its own. And the verdict's masthead
 * has no shape a stylesheet could reserve: one to three headline lines and
 * two to five of subline, by what the rules said. So for that reader nothing
 * the build painted is shown but the frame — the header, the tagline and the
 * line — and the page appears where it stays. s22 covered the rest in place
 * and the covers kept their room, so the line sat centred in a hidden box a
 * thousand pixels under the eyebrow; since s31 the covered things take no
 * room and the line stands under the eyebrow, where the headline lands.
 * Re-measured 2026-09-18 with this file's method, before and after, at
 * 390x844 / 390x1400 / 1280x900: 0 / 0 / 0 both ways, no shift source at
 * all; the line at 130–154 under an eyebrow at 107–122 (was 445–800).
 *
 * And what the reader MEETS in that box, read at the same moment, at 390x844:
 * the box is 355 px on the four question arrivals, because the stand-in
 * covers question one rather than replacing it; the verdict reader's box
 * takes no room, and their line is in the masthead.
 *
 *   / cold, no record        question one — "Where are you looking to go?"
 *   /?country=fr             "Setting up your questions."
 *   / saved record           "Your answers are on this device — bringing them back."
 *   /?route=de-blue-card-…   "Setting up your questions."
 *   / finished record        "Your answers are on this device — bringing them back." (under the eyebrow)
 */
// The dataset as the interview reads it, to replay a seeded record the way the module does.
const DATASET = rawDataset as unknown as Dataset;

/** One of the screens the page is measured at. */
type Screen = (typeof VIEWPORTS)[number];
/** One of the ways a reader arrives. */
type Arrival = (typeof ARRIVALS)[number];

const measured = new Map<string, Measured>();
const atFirstPaint = new Map<string, AtFirstPaint>();
const key = (viewport: string, arrival: string) => `${viewport} · ${arrival}`;

/** What the page measured once the module drew this arrival at this screen. */
const measuredAt = (screen: Screen, arrival: Arrival) => measured.get(key(screen.name, arrival.name))!;
/** What the build painted for this arrival at this screen, before the module landed. */
const paintedAt = (screen: Screen, arrival: Arrival) => atFirstPaint.get(key(screen.name, arrival.name))!;
/** What the cold, record-less / measured at this screen. */
const coldAt = (screen: Screen) => measuredAt(screen, ARRIVALS[0]);

/** The line this reader should meet in the box, and nothing else. */
const STAND_IN = {
  fresh: [], record: [RETURNING_LINE], link: [LINK_ARRIVAL_LINE], verdict: [RETURNING_LINE],
} as const;
/** The cover the pre-paint script writes for each reader — none for a fresh
 * visit, and `verdict` for a record that says it was finished (s22). */
const COVER = { fresh: "", record: "record", link: "link", verdict: "verdict" } as const;

/** Writes the arrival's record into the site's storage the way the product writes it, or takes the record off it. */
async function seedTheStore(site: PageOnSite, arrival: Arrival): Promise<void> {
  const interview = new InterviewPage(site);
  // Seeded the way the product writes it: a record that reached a
  // verdict carries the bit that says so (s22).
  if (arrival.record) {
    await interview.seed(arrival.record.answers, { history: [...arrival.record.history], done: arrival.shape === "verdict" });
    return;
  }
  // Storage belongs to the origin, so it is cleared from a page of
  // this site — 404 is the cheapest one that runs no interview.
  await site.page.goto(site.url("/404.html"));
  await interview.clearRecord();
}

/** Opens the arrival with the module held, keeps what the build painted, then what the module drew. */
async function readTheArrival(page: BrowserPage, address: string, label: string): Promise<void> {
  // Read back once the HTML is parsed, with the module still held:
  // what is on the screen at this point is what the build put there.
  const href = new URL(address).href;
  await page.navigate(href);
  await page.waitUntil(`location.href === ${JSON.stringify(href)} && document.readyState !== "loading"`,
    `${href} was never parsed`);
  const built = await readAtFirstPaint(page);
  expect(built.held, `${label}: the built page painted nothing into #main`)
    .toBe(true);
  atFirstPaint.set(label, built);
  // The stand-ins go in the task that draws the reader's screen.
  await page.waitUntil(`!document.querySelector(".stand-in")`, "the module never drew the reader's screen");
  await page.waitUntilAtRest();
  measured.set(label, await readMeasured(page));
}

/** Walks every arrival at every screen and keeps what each painted and measured. */
async function measureEveryArrival(): Promise<void> {
  for (const screen of VIEWPORTS)
    for (const arrival of ARRIVALS)
      await walkSite({ site: HELD_MODULE, screen, shiftRegion: ABOVE_THE_BOX }, async (site) => {
        await seedTheStore(site, arrival);
        await readTheArrival(site.page, site.url(arrival.path), key(screen.name, arrival.name));
      });
}

/** Checks the arrival's page did not shift at all. */
function expectNothingMoves(screen: Screen, arrival: Arrival): void {
  // Exactly zero, not a budget under Google's "good": every arrival
  // the field sends can paint where it stays (#66).
  const m = measuredAt(screen, arrival);
  expect(m.cls, `CLS ${m.cls} — ${detail(m)}`).toBe(0);
}

/** Checks the box carried the reader's own cover and line, and question one only for a fresh visit. */
function expectTheBoxSaysSomethingTrue(screen: Screen, arrival: Arrival): void {
  // A returning reader was shown question one — a question they had
  // already answered — until the module swapped it, every time they
  // came back. Nothing untrue is ever on this screen (human's walk,
  // 2026-09-15), so the box carries the reader's own line instead, and
  // question one is covered for exactly those readers.
  const b = paintedAt(screen, arrival);
  expect(b.cover, `the pre-paint script wrote data-cover=${JSON.stringify(b.cover)}`)
    .toBe(COVER[arrival.shape]);
  expect(b.standIn, `the box read ${JSON.stringify(b.standIn)}`)
    .toEqual([...STAND_IN[arrival.shape]]);
  if (arrival.shape === "fresh")
    expect(b.question, "a fresh visit is not shown question one").not.toBe("");
  else
    expect(b.question, `question ${JSON.stringify(b.question)} was shown to a reader who has answered it`)
      .toBe("");
}

/** Checks the resumed line is drawn exactly when the reader's record has answers the interview keeps. */
function expectResumedLineExactlyOnResume(screen: Screen, arrival: Arrival): void {
  // The measurement above is of the page WITH the line a returning
  // reader is owed: a record with answers the interview keeps lands on
  // a question or a verdict that says so. Nowhere else — not on a cold
  // page, not on an arrival that narrates itself.
  const m = measuredAt(screen, arrival);
  const kept = arrival.record
    ? replayRecord(DATASET, arrival.record.answers, [...arrival.record.history])
    : { answers: {}, order: [] };
  const resumes = (arrival.shape === "record" || arrival.shape === "verdict") && kept.order.length > 0;
  expect(m.resumed, `the resumed line is ${m.resumed ? "there" : "missing"}`).toBe(resumes);
}

/** Checks the module drew the screen the arrival's row names. */
function expectLandsOnItsScreen(screen: Screen, arrival: Arrival): void {
  // A seed the interview no longer accepts replays as a shorter record
  // and lands on a question; a row that says "finished" must be shown
  // a verdict, or the number above is about a different screen.
  const m = measuredAt(screen, arrival);
  expect(m.state, `the module drew a ${m.state} screen`).toBe(LANDS_ON[arrival.name]);
}

/** Checks no node above the box moved. */
function expectNothingAboveTheBoxMoves(screen: Screen, arrival: Arrival): void {
  // The aggregate would forgive a masthead that resized a little, and
  // a masthead that resizes takes the whole interview with it. Nothing
  // above the box is allowed to move at all, on any arrival: what the
  // masthead says and how tall it is are settled before the page
  // paints, so this is asserted as zero, not as a budget.
  const m = measuredAt(screen, arrival);
  const moved = m.shifts.flatMap((s) => s.sources).filter((x) => x.inRegion).map((x) => x.node);
  expect(moved, `${moved.join(", ")} moved — ${detail(m)}`).toEqual([]);
}

/** Checks the footer took room at first paint only for a fresh visit, and always once the module drew. */
function expectFooterRoomOnlyOnceDrawn(screen: Screen, arrival: Arrival): void {
  // The reader's own screen is not the height of the one the build
  // painted, so a footer laid out under the built one moves when the
  // module draws. For a reader with a cover it takes no room until
  // then, and appears at the page's end, where it stays.
  const b = paintedAt(screen, arrival);
  const m = measuredAt(screen, arrival);
  expect(b.footBox, `at first paint the footer ${b.footBox ? "took" : "took no"} room`)
    .toBe(arrival.shape === "fresh");
  expect(m.footBox, "the footer took no room once the module had drawn").toBe(true);
}

/** Checks the ledger's count was unseen before the module drew, except for a fresh visit on a phone. */
function expectCountUnseenUntilTheReaders(screen: Screen, arrival: Arrival): void {
  // "Nothing yet" is untrue for a reader with a record or a link, and
  // the line widened in view when the module wrote the real count.
  const b = paintedAt(screen, arrival);
  if (arrival.shape !== "fresh")
    expect(b.countShown, `the count read ${JSON.stringify(b.count)} before the module drew`).toBe(false);
  else if (screen.viewport.width < WIDE_FROM_PX)
    expect(b.countShown, "a fresh visit on a phone was not shown its count").toBe(true);
}

/** Checks the cold, record-less / shifted not at all. */
function expectColdPaintsOnce(screen: Screen): void {
  // Nothing on it differs from what the build drew, so there is nothing
  // for the module to change — any shift here is a second render of the
  // same screen, and that is the defect, smaller.
  const m = coldAt(screen);
  expect(m.cls, `CLS ${m.cls} — ${detail(m)}`).toBe(0);
}

/** Checks every reader owed a question met the fresh visit's box to the pixel, and the reader owed a verdict none. */
function expectTheSameBoxForEveryQuestion(screen: Screen): void {
  // The stand-in sits over question one rather than in place of it, so
  // the card holds the box open and the page below starts where it
  // starts for everybody. Said in pixels, because a box held open by a
  // number instead would drift the first time the card changed.
  //
  // Everybody but the reader whose screen is a verdict: nothing the
  // build painted below the eyebrow is theirs, and since s31 it takes
  // no room — the box included — until the module draws the page they
  // came back to. Their line is under the eyebrow, not in a box.
  const questioned = ARRIVALS.filter((a) => a.shape !== "verdict");
  const boxes = questioned.map((a) => [a.name, paintedAt(screen, a).box] as const);
  const fresh = paintedAt(screen, ARRIVALS[0]).box;
  expect(fresh, "the box has no height at all").toBeGreaterThan(100);
  expect(boxes.map(([, box]) => box), boxes.map(([n, b]) => `${n}: ${b}px`).join(" · "))
    .toEqual(questioned.map(() => fresh));
  for (const a of ARRIVALS.filter((x) => x.shape === "verdict"))
    expect(paintedAt(screen, a).box, `${a.name}: the covered box still holds its room`).toBe(0);
}

/** Checks the cold / moved the footer by no pixel. */
function expectColdFooterStill(screen: Screen): void {
  // Said in pixels as well as in the score, because the score cannot
  // see a footer that is below the fold and the reader with a taller
  // phone can.
  const m = coldAt(screen);
  expect(m.footMoved, `the footer moved — ${detail(m)}`).toBe(0);
}

/** Checks the cold / still shows the very node the build painted. */
function expectColdKeepsTheBuiltNode(screen: Screen): void {
  // The measurement cannot tell a skipped write from a repeated one:
  // rewriting identical markup moves nothing either. This can. Delete
  // the skip in `paint` and restore `main.innerHTML =` and this is the
  // case that goes red.
  const m = coldAt(screen);
  expect(m.sameCard, `the module replaced the screen the build drew — ${detail(m)}`).toBe(true);
}

/** Checks the cold / ledger is open on a wide screen and folded on a narrow one. */
function expectLedgerFitsTheWidth(screen: Screen): void {
  // Which it is was decided 700 ms late until s10, and the cold page
  // shifted by 0.008 when the module folded it (Spec review). It is
  // decided in <head> now, before anything is painted.
  const m = coldAt(screen);
  expect(m.ledgerOpen, `the ledger came out ${m.ledgerOpen ? "open" : "closed"}`)
    .toBe(screen.viewport.width >= WIDE_FROM_PX);
}

describe.skipIf(skipped !== null)("the page as it first paints is already the page (s10)", () => {
  beforeAll(() => measureEveryArrival(), 600000);

  for (const screen of VIEWPORTS)
    describe(screen.name, () => {
      for (const arrival of ARRIVALS) {
        it(`${arrival.name}: nothing the reader did not ask for moves`, () => expectNothingMoves(screen, arrival));
        it(`${arrival.name}: the box says something true before the module lands`,
          () => expectTheBoxSaysSomethingTrue(screen, arrival));
        it(`${arrival.name}: the resumed line is there exactly when the reader resumed (s20)`,
          () => expectResumedLineExactlyOnResume(screen, arrival));
        it(`${arrival.name}: lands on the screen the row names (s22)`, () => expectLandsOnItsScreen(screen, arrival));
        it(`${arrival.name}: nothing above the box moves`, () => expectNothingAboveTheBoxMoves(screen, arrival));
        it(`${arrival.name}: the footer takes room only once the reader's screen is drawn (#66)`,
          () => expectFooterRoomOnlyOnceDrawn(screen, arrival));
        it(`${arrival.name}: the ledger's count is unseen until it is the reader's (#66)`,
          () => expectCountUnseenUntilTheReaders(screen, arrival));
      }

      it("the cold, record-less / paints once: no shift at all", () => expectColdPaintsOnce(screen));
      it("every reader owed a question meets the same box, to the pixel; the reader owed a verdict meets none",
        () => expectTheSameBoxForEveryQuestion(screen));
      it("the cold / does not move the footer by a pixel", () => expectColdFooterStill(screen));
      it("the cold / keeps the very node the build painted — the module draws nothing",
        () => expectColdKeepsTheBuiltNode(screen));
      it("the ledger is a panel on a wide screen and folded away on a narrow one",
        () => expectLedgerFitsTheWidth(screen));
    });
});
