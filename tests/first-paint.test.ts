import { beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { remainingQuestions, type Dataset } from "permit-rulebook-data";
import { LINK_ARRIVAL_LINE, NO_SCRIPT_LINE, RETURNING_LINE } from "../src/lib/copy.js";
import { FIRST_PAINT_SCRIPT } from "../src/lib/first-paint.js";
import { firstPaintPlaceholdersHtml, questionCardHtml } from "../src/lib/question.js";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";
import { replayRecord } from "../src/lib/scope.js";
import { FEEDBACK_PATH } from "../src/lib/identity.js";
import { url } from "../src/lib/site.js";

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
 * entirely of the masthead would pass a bound whose scenario forbids the page
 * moving under the reader. How far the FOOTER travelled in pixels, because the
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
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const DATASET = rawDataset as unknown as Dataset;

const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE FIRST PAINT WAS NOT MEASURED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

/**
 * A realistic mobile lag on the module, and the one the table in the scenario
 * was measured at: HTML at once, script 700 ms later.
 */
const DELAY_JS_MS = 700;

/**
 * The scenario's bound — below 0.1, inside Google's "good", which is 0.1 or
 * less. Every arrival at every viewport measured 0 on 2026-09-15, once the
 * shape of the first paint stopped being decided after it.
 */
const GOOD = 0.1;

/**
 * Three screens, because the defect hid in one of them. At 390x844 the footer
 * is below the fold on every arrival and its movement costs nothing; at
 * 390x1400 the same page moved it 44 to 140 px in plain sight. A gate that
 * measured only the short phone would have called a moving footer fixed
 * (Spec review, 2026-09-15). The desktop row is where the ledger is a panel
 * rather than a disclosure, which is the other decision the module used to
 * take after the page had painted.
 */
const VIEWPORTS = [
  { name: "390x844", viewport: { width: 390, height: 844 }, mobile: true },
  { name: "390x1400", viewport: { width: 390, height: 1400 }, mobile: true },
  { name: "1280x900", viewport: { width: 1280, height: 900 }, mobile: false },
] as const;

/**
 * The observer goes in after the load and reads `buffered: true`, so it still
 * sees the shifts that happened before it existed. It is installed rather than
 * awaited because the driver's `evaluate` hands back a value, not a promise —
 * hence the beat between installing and reading.
 */
const INSTALL = `(() => {
  window.__cls = [];
  new PerformanceObserver((l) => window.__cls.push(...l.getEntries()
    .filter((e) => !e.hadRecentInput)
    .map((e) => ({
      value: e.value,
      nodes: (e.sources ?? []).map((s) => !s.node ? "?"
        : s.node.id ? "#" + s.node.id
        : s.node.tagName + (s.node.className ? "." + String(s.node.className).split(" ")[0] : "")).slice(0, 3),
    })))).observe({ type: "layout-shift", buffered: true });
  return "installed";
})()`;

/**
 * What is on the screen while the module is still in the post — which is to
 * say, the page as the BUILD wrote it.
 *
 * It holds the card's node by reference, never by marking it: an attribute
 * would change what the box serialises to, and the skip this exists to prove
 * is a comparison of exactly that. And it reads what a reader actually sees in
 * the box, because from s10's second round the built page carries question one
 * AND the two lines that stand in for it, and which of the three shows is the
 * stylesheet's answer to a flag — not something the built HTML can be read for
 * (human's walk, 2026-09-15).
 */
const AT_FIRST_PAINT = `(() => {
  window.__built = document.querySelector("#main > *");
  window.__foot = document.querySelector("footer.site-foot").getBoundingClientRect().top;
  const shown = (el) => el && getComputedStyle(el).visibility === "visible"
    && getComputedStyle(el).display !== "none" && !!el.offsetParent;
  return JSON.stringify({
    held: !!window.__built,
    first: document.documentElement.dataset.first ?? "",
    box: Math.round(document.getElementById("main").getBoundingClientRect().height),
    question: shown(document.querySelector(".qlabel")) ? document.querySelector(".qlabel").textContent : "",
    standIn: [...document.querySelectorAll(".stand-in")].filter(shown).map((el) => el.textContent),
  });
})()`;

interface AtFirstPaint {
  held: boolean;
  /** What the pre-paint script wrote on `<html>` — which reader this is. */
  first: string;
  /** The box the reader meets, in pixels. It is the same box whichever line is
   * in it: the stand-in sits OVER the question card rather than in place of
   * it, so the card holds the height open (s10). Zero for the reader owed a
   * verdict, whose box takes no room until the module draws (s31). */
  box: number;
  /** Question one's label, if a reader can read it; empty if it is covered. */
  question: string;
  /** The line standing in for it, if any — in the box, or under the eyebrow
   * for the reader owed a verdict (s31). Never more than one. */
  standIn: string[];
}

const READ = `JSON.stringify({
  cls: window.__cls.reduce((s, e) => s + e.value, 0),
  shifts: window.__cls.map((e) => ({ value: Math.round(e.value * 1000) / 1000, nodes: e.nodes })),
  sameCard: window.__built === document.querySelector("#main > *"),
  footMoved: Math.round(document.querySelector("footer.site-foot").getBoundingClientRect().top - window.__foot),
  subline: Math.round(document.getElementById("subline").getBoundingClientRect().height),
  ledgerOpen: document.getElementById("decl").open,
  resumed: !!document.querySelector("#main .qcard .resumed"),
  state: document.getElementById("app").dataset.state,
})`;

interface Measured {
  cls: number;
  shifts: { value: number; nodes: string[] }[];
  /** Whether the node the build drew is still the node on the screen. */
  sameCard: boolean;
  /** How far the footer travelled between the build's paint and the module's,
   * in pixels, signed. The scenario's second requirement is about this number
   * and the aggregate hides it: at 390x844 the footer is off the bottom of the
   * screen and can move 140 px for nothing (Spec review, 2026-09-15). */
  footMoved: number;
  /**
   * The masthead's promise, in pixels. It is the direct cause of every shift
   * this page had left once the box was full — the long form is painted for a
   * reader who has answered nothing and the short one for a reader who has —
   * so a failure that names it is a failure somebody can read. A line that
   * wraps differently on a CI font is about twenty pixels.
   */
  subline: number;
  ledgerOpen: boolean;
  /** Whether the module drew the resumed line over the question — the one
   * thing a returning reader's screen carries that the first paint could not
   * hold room for, so the record arrival is measured with it there (s20). */
  resumed: boolean;
  /** The screen the module drew — `questions` or `results` — so a row that
   * names a verdict is proven to be measuring one (s22). */
  state: string;
}

/**
 * Every way a reader's first screen can differ from the one the build drew.
 * All five are measured at all three viewports. `shape` is the reader the
 * pre-paint script names — `fresh`, `link`, `record` or, since s22, `verdict`
 * — and the stand-in and the flag are asserted from it.
 */
const ARRIVALS = [
  { name: "/ cold, with no record", path: "/", record: null, shape: "fresh" },
  { name: "/?country=fr — from a country page", path: "/?country=fr", record: null, shape: "link" },
  {
    name: "/ with a saved record",
    path: "/",
    shape: "record",
    // A reader part-way through: France, a Turkish passport, an offer there.
    record: {
      answers: { destination: "fr", citizenship: "TR", situation: "offer", situation_country: "fr" },
      history: ["destination", "citizenship", "situation", "situation_country"],
    },
  },
  {
    name: "/?route=de-blue-card-general — from a route page",
    path: "/?route=de-blue-card-general",
    record: null,
    shape: "link",
  },
  {
    // The arrival the scenario's table does not name: a record with nothing
    // left to ask restores straight to the verdict, and 23 route cards go into
    // the box one question was painted in.
    //
    // The profile is s20's finished persona — an offer in Germany, a Turkish
    // passport, every question the interview asks today answered — and the
    // row asserts below that it LANDS on a verdict. The seed this row carried
    // until s22 used `education`, `age` and `salary_eur_year: "60000"`, field
    // names the product no longer writes, so the record replayed as a half
    // record and the gate measured a question screen while believing it
    // measured a verdict: the re-score found CLS 0.65 here where this file
    // said 0 (v1.1 gate critique, N2).
    name: "/ with a finished record",
    path: "/",
    shape: "verdict",
    record: {
      answers: {
        destination: "de", situation: "offer", qualification: "degree", citizenship: "TR",
        occupation_shortage: "yes", recognition_de: "recognized", experience_5y: "lt2", experience_7y: "lt3",
        salary_eur_year: "band_4", german: "none", english: "none", funds_eur_month: "band_0",
      },
      history: [
        "destination", "situation", "qualification", "citizenship", "occupation_shortage",
        "recognition_de", "experience_5y", "experience_7y", "salary_eur_year", "german", "english", "funds_eur_month",
      ],
    },
  },
] as const;

/**
 * Which screen each arrival lands on once the module has drawn it. Said per
 * row rather than derived, so a seed the interview has stopped accepting turns
 * the row red instead of quietly measuring a question screen under a verdict's
 * name (s22).
 */
const LANDS_ON: Record<(typeof ARRIVALS)[number]["name"], "questions" | "results"> = {
  "/ cold, with no record": "questions",
  "/?country=fr — from a country page": "questions",
  "/ with a saved record": "questions",
  "/?route=de-blue-card-general — from a route page": "questions",
  "/ with a finished record": "results",
};

/**
 * Everything ABOVE the box, which may never move on any arrival.
 *
 * This is the decision the pre-paint script exists to keep: what the masthead
 * says and how tall it is are settled before the page paints, so a reader with
 * a record does not watch the whole interview slide up under a promise that
 * shortened 700 ms in. It was 0.082 of the 0.156 that arrival used to measure,
 * and it is the one part of this that is fixed by construction rather than by
 * viewport — so it is asserted as zero, not as a budget.
 */
const ABOVE_THE_BOX = ["#headline", "#subline", "#stamp", "DIV.stamp", "HEADER.masthead-with-stamps"];

const measured = new Map<string, Measured>();
const atFirstPaint = new Map<string, AtFirstPaint>();
const key = (viewport: string, arrival: string) => `${viewport} · ${arrival}`;

/** What was read, for a failure that names what moved and why. */
const detail = (m: Measured) =>
  `${m.shifts.map((s) => `[${s.value} ${s.nodes.join(",")}]`).join(" ") || "(no shift)"}`
  + ` · footer ${m.footMoved >= 0 ? "+" : ""}${m.footMoved}px`
  + ` · subline ${m.subline}px · ledger ${m.ledgerOpen ? "open" : "closed"}`;

describe.skipIf(skipped !== null)("the page as it first paints is already the page (s10)", () => {
  const read = (viewport: string, arrival: string) => measured.get(key(viewport, arrival))!;
  const built = (viewport: string, arrival: string) => atFirstPaint.get(key(viewport, arrival))!;
  /** The line this reader should meet in the box, and nothing else. */
  const STAND_IN = {
    fresh: [], record: [RETURNING_LINE], link: [LINK_ARRIVAL_LINE], verdict: [RETURNING_LINE],
  } as const;
  /** The word the pre-paint script writes for each reader — none for a fresh
   * visit, and `verdict` for a record that says it was finished (s22). */
  const FLAG = { fresh: "", record: "record", link: "link", verdict: "verdict" } as const;
  const cold = (viewport: string) => read(viewport, ARRIVALS[0].name);

  beforeAll(async () => {
    const server = await serve(dist, { delayJsMs: DELAY_JS_MS });
    try {
      for (const screen of VIEWPORTS)
        for (const arrival of ARRIVALS)
          await withBrowser(async (page: BrowserPage) => {
            // Storage belongs to the origin, so it is written from a page of
            // this site — 404 is the cheapest one that runs no interview.
            await page.goto(server.url("/404.html"), 300);
            // Seeded the way the product writes it: a record that reached a
            // verdict carries the bit that says so (s22).
            await page.evaluate(arrival.record
              ? `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
                JSON.stringify(serialize(
                  arrival.record.answers, [...arrival.record.history], arrival.shape === "verdict",
                ))})`
              : "localStorage.clear()");
            // Read back while the module is still 450 ms out: what is on the
            // screen at this point is what the build put there.
            await page.goto(server.url(arrival.path), 250);
            const built = JSON.parse(await page.evaluate(AT_FIRST_PAINT)) as AtFirstPaint;
            expect(built.held, `${key(screen.name, arrival.name)}: the built page painted nothing into #main`)
              .toBe(true);
            atFirstPaint.set(key(screen.name, arrival.name), built);
            await new Promise((r) => setTimeout(r, DELAY_JS_MS + 1250));
            await page.evaluate(INSTALL);
            await new Promise((r) => setTimeout(r, 400));
            measured.set(key(screen.name, arrival.name), JSON.parse(await page.evaluate(READ)) as Measured);
          }, { viewport: screen.viewport, mobile: screen.mobile });
    } finally {
      server.close();
    }
  }, 600000);

  for (const screen of VIEWPORTS)
    describe(screen.name, () => {
      for (const arrival of ARRIVALS) {
        it(`${arrival.name}: nothing the reader did not ask for moves`, () => {
          const m = read(screen.name, arrival.name);
          expect(m.cls, `CLS ${m.cls} — ${detail(m)}`).toBeLessThan(GOOD);
        });

        it(`${arrival.name}: the box says something true before the module lands`, () => {
          // A returning reader was shown question one — a question they had
          // already answered — until the module swapped it, every time they
          // came back. Nothing untrue is ever on this screen (human's walk,
          // 2026-09-15), so the box carries the reader's own line instead, and
          // question one is covered for exactly those readers.
          const b = built(screen.name, arrival.name);
          expect(b.first, `the pre-paint script wrote data-first=${JSON.stringify(b.first)}`)
            .toBe(FLAG[arrival.shape]);
          expect(b.standIn, `the box read ${JSON.stringify(b.standIn)}`)
            .toEqual([...STAND_IN[arrival.shape]]);
          if (arrival.shape === "fresh")
            expect(b.question, "a fresh visit is not shown question one").not.toBe("");
          else
            expect(b.question, `question ${JSON.stringify(b.question)} was shown to a reader who has answered it`)
              .toBe("");
        });

        it(`${arrival.name}: the resumed line is there exactly when the reader resumed (s20)`, () => {
          // The measurement above is of the page WITH the line a returning
          // reader is owed: a record with answers the interview keeps and
          // questions still open lands on a question that says so. Nowhere
          // else — not on a cold page, not on an arrival that narrates itself,
          // not on a verdict.
          const m = read(screen.name, arrival.name);
          const kept = arrival.record
            ? replayRecord(DATASET, arrival.record.answers, [...arrival.record.history])
            : { answers: {}, order: [] };
          const resumes = arrival.shape === "record"
            && kept.order.length > 0 && remainingQuestions(DATASET, kept.answers).length > 0;
          expect(m.resumed, `the resumed line is ${m.resumed ? "there" : "missing"}`).toBe(resumes);
        });

        it(`${arrival.name}: lands on the screen the row names (s22)`, () => {
          // A seed the interview no longer accepts replays as a shorter record
          // and lands on a question; a row that says "finished" must be shown
          // a verdict, or the number above is about a different screen.
          const m = read(screen.name, arrival.name);
          expect(m.state, `the module drew a ${m.state} screen`).toBe(LANDS_ON[arrival.name]);
        });

        it(`${arrival.name}: nothing above the box moves`, () => {
          // The aggregate would forgive a masthead that resized a little, and
          // a masthead that resizes takes the whole interview with it. Nothing
          // above the box is allowed to move at all, on any arrival.
          const m = read(screen.name, arrival.name);
          const moved = m.shifts.flatMap((s) => s.nodes).filter((n) => ABOVE_THE_BOX.includes(n));
          expect(moved, `${moved.join(", ")} moved — ${detail(m)}`).toEqual([]);
        });
      }

      it("the cold, record-less / paints once: no shift at all", () => {
        // Nothing on it differs from what the build drew, so there is nothing
        // for the module to change — any shift here is a second render of the
        // same screen, and that is the defect, smaller.
        const m = cold(screen.name);
        expect(m.cls, `CLS ${m.cls} — ${detail(m)}`).toBe(0);
      });

      it("every reader owed a question meets the same box, to the pixel; the reader owed a verdict meets none", () => {
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
        const boxes = questioned.map((a) => [a.name, built(screen.name, a.name).box] as const);
        const fresh = built(screen.name, ARRIVALS[0].name).box;
        expect(fresh, "the box has no height at all").toBeGreaterThan(100);
        expect(boxes.map(([, box]) => box), boxes.map(([n, b]) => `${n}: ${b}px`).join(" · "))
          .toEqual(questioned.map(() => fresh));
        for (const a of ARRIVALS.filter((x) => x.shape === "verdict"))
          expect(built(screen.name, a.name).box, `${a.name}: the covered box still holds its room`).toBe(0);
      });

      it("the cold / does not move the footer by a pixel", () => {
        // Said in pixels as well as in the score, because the score cannot
        // see a footer that is below the fold and the reader with a taller
        // phone can.
        const m = cold(screen.name);
        expect(m.footMoved, `the footer moved — ${detail(m)}`).toBe(0);
      });

      it("the cold / keeps the very node the build painted — the module draws nothing", () => {
        // The measurement cannot tell a skipped write from a repeated one:
        // rewriting identical markup moves nothing either. This can. Delete
        // the skip in `paint` and restore `main.innerHTML =` and this is the
        // case that goes red.
        const m = cold(screen.name);
        expect(m.sameCard, `the module replaced the screen the build drew — ${detail(m)}`).toBe(true);
      });

      it("the ledger is a panel on a wide screen and folded away on a narrow one", () => {
        // Which it is was decided 700 ms late until s10, and the cold page
        // shifted by 0.008 when the module folded it (Spec review). It is
        // decided in <head> now, before anything is painted.
        const m = cold(screen.name);
        expect(m.ledgerOpen, `the ledger came out ${m.ledgerOpen ? "open" : "closed"}`)
          .toBe(screen.viewport.width >= 761);
      });
    });
});

/**
 * The pre-paint script, run against a page in a bottle.
 *
 * It is a string that runs in <head>, so the browser gate above is what proves
 * it; this is the same script read for its one decision at a time, with the
 * three things it looks at held still — the link, the store and the width —
 * because the gate can only seed what the product writes and the script has
 * to be right about what the product never writes too (s22).
 */
describe("the pre-paint script decides who the reader is from a few bytes (s10, s22)", () => {
  const flags = (o: { search?: string; stored?: string | null; throws?: boolean }): Record<string, string> => {
    const dataset: Record<string, string> = {};
    runInNewContext(FIRST_PAINT_SCRIPT, {
      document: { documentElement: { dataset } },
      location: { search: o.search ?? "" },
      localStorage: {
        getItem: () => { if (o.throws) throw new Error("blocked"); return o.stored ?? null; },
      },
      matchMedia: () => ({ matches: true }),
    });
    return dataset;
  };
  const halfDone = serialize({ destination: "fr" }, ["destination"]);
  const finished = serialize({ destination: "fr" }, ["destination"], true);

  it("a fresh visit is nobody in particular", () => {
    expect(flags({ stored: null }).first).toBeUndefined();
  });

  it("a record is a returning reader; a finished one is a reader owed a verdict", () => {
    expect(flags({ stored: halfDone }).first).toBe("record");
    expect(flags({ stored: finished }).first).toBe("verdict");
  });

  it("a record from before the bit existed is a returning reader, not a verdict", () => {
    expect(flags({ stored: JSON.stringify({ version: 1, answers: { destination: "fr" }, history: ["destination"] }) }).first)
      .toBe("record");
  });

  it("reads one key, and nothing else in the record can stand in for it", () => {
    // The bit is the product's own word, in the product's own place: a truthy
    // value under the same name, or the word under another name, is not it.
    expect(flags({ stored: JSON.stringify({ version: 1, answers: {}, history: [], done: "yes" }) }).first).toBe("record");
    expect(flags({ stored: JSON.stringify({ version: 1, answers: {}, history: [], finished: true }) }).first).toBe("record");
  });

  it("a record that is not JSON is still a record, never a crashed head", () => {
    expect(flags({ stored: "{" }).first).toBe("record");
  });

  it("a record wins over a link, and a finished one still does", () => {
    expect(flags({ search: "?country=fr", stored: null }).first).toBe("link");
    expect(flags({ search: "?country=fr", stored: halfDone }).first).toBe("record");
    expect(flags({ search: "?route=fr-talent-blue-card", stored: finished }).first).toBe("verdict");
  });

  it("a browser that refuses site data is a reader with no record", () => {
    expect(flags({ throws: true }).first).toBeUndefined();
    expect(flags({ search: "?country=fr", throws: true }).first).toBe("link");
  });

  it("says whether the reader has answered, so a phone paints the ledger line where it will stay (s30)", () => {
    // A record and a link both bring an answer; a fresh visit brings none. A
    // verdict's ledger is the module's to place, not the head's: on a phone it
    // stands above the result once answers exist (s30 amendment 7), but s22's
    // cover hides #app until the module draws, so the head has nothing to
    // decide there. The head cannot know whether a link's code is one the
    // page knows, so the flag is written for every link and the module keeps
    // its word for the first screen.
    expect(flags({ stored: halfDone }).answered).toBe("");
    expect(flags({ search: "?country=fr", stored: null }).answered).toBe("");
    expect(flags({ search: "?country=zz", stored: null }).answered).toBe("");
    expect(flags({ stored: null }).answered).toBeUndefined();
    expect(flags({ stored: finished }).answered).toBeUndefined();
  });

  it("names nothing from the dataset", () => {
    // It is inlined into the page, where nothing checks a name against the
    // dataset: the only words it knows are the four readers and the key.
    for (const c of DATASET.countries)
      expect(FIRST_PAINT_SCRIPT, c.code).not.toMatch(new RegExp(`\\b${c.code}\\b`, "i"));
    for (const c of DATASET.countries)
      for (const r of c.routes) expect(FIRST_PAINT_SCRIPT, r.id).not.toContain(r.id);
  });
});

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
    // Byte for byte, which is the whole claim: the label, the options, what
    // each one means and the help link are in the page because the renderer
    // put them there, so there is no second copy to drift.
    const questions = remainingQuestions(dataset, {});
    expect(inMain).toBe(questionCardHtml({
      dataset, question: questions[0], answers: {}, asked: [], editing: null,
      total: questions.length,
    }) + firstPaintPlaceholdersHtml());
  });

  it("tells a reader with no script, in a sentence, why they cannot answer it", () => {
    // Asserted as a sentence off the built page, not as the constant read back
    // to itself: emptying the copy line used to leave every case green and
    // ship `<noscript><p class="nojs"></p></noscript>` (Standards review;
    // DECISIONS.md — checks require decisions, not content).
    const line = /<noscript>([\s\S]*?)<\/noscript>/.exec(inMain)?.[1] ?? "";
    const words = line.replace(/<[^>]*>/g, "").trim();
    expect(words, "the noscript box shipped empty").not.toBe("");
    expect(words.length, `too short to be a sentence: ${JSON.stringify(words)}`).toBeGreaterThan(20);
    expect(words, "it does not say what is missing").toMatch(/JavaScript/);
    expect(words, "not a sentence").toMatch(/\.$/);
    // And it is the product's one wording for it, said in copy.ts.
    expect(words).toBe(NO_SCRIPT_LINE);
  });

  it("offers no feedback line: the cold / is a question, and the line is the verdict's (s13)", () => {
    // The line under the verdict — "Something to say about this result?" —
    // appears on a results screen only, never on a question, never before an
    // answer (s13, scenario point 6). The built first paint is question one
    // with nothing on the record, so the box the build paints must not link
    // the page the line leads to.
    expect(inMain, "the cold first paint links /feedback/").not.toContain(url(FEEDBACK_PATH));
    expect(inMain).not.toContain('class="say"');
  });

  it("carries a sentence for each reader whose screen is not the one it painted", () => {
    // Asserted as sentences off the built page and not as the constants read
    // back to themselves: emptying either one has to turn this red, the way
    // emptying the noscript line does (DECISIONS.md — checks require
    // decisions, not content). The decision is that a reader who is about to
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
  });
});
