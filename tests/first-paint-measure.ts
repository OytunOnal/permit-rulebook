import { fileURLToPath } from "node:url";
import type { BrowserPage, LayoutShifts } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page.mjs";
import { skipReason, warnNotWalked } from "./browser-walk.js";

/**
 * What the first-paint suites share: the built site with its module held back,
 * the screens it is measured at, and what the page reads once the module has
 * drawn — the measurement `first-paint-arrivals.test.ts` and
 * `first-paint-in-pieces.test.ts` both take of the page. Below them, the
 * arrivals the first of those walks and what it reads at the first paint.
 */
export const dist = fileURLToPath(new URL("../dist", import.meta.url));

/** Why the browser suites do not walk here, or null when they do. */
export const skipped = skipReason();
if (skipped) warnNotWalked("THE FIRST PAINT", skipped);

/** A realistic mobile lag on the module: HTML at once, script 700 ms later. */
const DELAY_JS_MS = 700;
/** The built site with its module that late, so the build's own paint can be read. */
export const HELD_MODULE = { folder: dist, delayJsMs: DELAY_JS_MS };

/**
 * Four screens, because the defect hid in them. At 390x844 the footer is below
 * the fold on every arrival and its movement costs nothing; at 390x1400 the
 * same page moved it 44 to 140 px in plain sight. A gate that measured only the
 * short phone would have called a moving footer fixed (Spec review,
 * 2026-09-15). The desktop rows are where the ledger is a panel rather than a
 * disclosure, which is the other decision the module used to take after the
 * page had painted; at 1280x800 the footer is in view as well (#66).
 */
export const VIEWPORTS = [
  { name: "390x844", viewport: { width: 390, height: 844 }, mobile: true },
  { name: "390x1400", viewport: { width: 390, height: 1400 }, mobile: true },
  { name: "1280x900", viewport: { width: 1280, height: 900 }, mobile: false },
  { name: "1280x800", viewport: { width: 1280, height: 800 }, mobile: false },
] as const;

/** What the first paint leaves on the window for the read once the module has drawn: the node the build drew in
 * the box, and the footer's top then, or null where it took no room. */
type FirstPaintMarks = Window & { __built?: Element | null; __foot?: number | null };

/** In the page: what it reads once the module has drawn, its shifts aside, as JSON. */
function readBesideTheShifts(): string {
  const marks = window as FirstPaintMarks;
  const foot = document.querySelector("footer.site-foot")!;
  return JSON.stringify({
    sameCard: marks.__built === document.querySelector("#main > *"),
    footBox: foot.getClientRects().length > 0,
    footMoved: marks.__foot === null ? null : Math.round(foot.getBoundingClientRect().top - marks.__foot!),
    subline: Math.round(document.getElementById("subline")!.getBoundingClientRect().height),
    ledgerOpen: (document.getElementById("decl") as HTMLDetailsElement).open,
    resumed: !!document.querySelector("#main .resumed"),
    state: document.getElementById("app")!.dataset.state,
  });
}

/** The read once the module has drawn: the expression the measure evaluates. */
const READ_BESIDE_THE_SHIFTS = `(${readBesideTheShifts})()`;

export interface Measured {
  cls: number;
  /** Each shift, with every node it moved: named, how far across and down it
   * went, and whether it is above the box. */
  shifts: Pick<LayoutShifts["counted"][number], "value" | "sources">[];
  /** Whether the node the build drew is still the node on the screen. */
  sameCard: boolean;
  /** Whether the footer takes room once the module has drawn. */
  footBox: boolean;
  /** How far the footer travelled between the build's paint and the module's,
   * in pixels, signed; null when the first paint gave it no room. The
   * footer's travel is a requirement of its own, and the aggregate hides
   * it: at 390x844 the footer is off the bottom of the screen and can
   * move 140 px for nothing (Spec review, 2026-09-15). */
  footMoved: number | null;
  /**
   * The masthead's promise, in pixels. It is the direct cause of every shift
   * this page had left once the box was full — the long form is painted for a
   * reader who has answered nothing and the short one for a reader who has —
   * so a failure that names it is a failure somebody can read. A line that
   * wraps differently on a CI font is about twenty pixels.
   */
  subline: number;
  ledgerOpen: boolean;
  /** Whether the module drew the resumed line over the question or the
   * verdict — the one thing a returning reader's screen carries that the first
   * paint could not hold room for, so the record arrivals are measured with it
   * there (s20, #56). */
  resumed: boolean;
  /** The screen the module drew — `questions` or `results` — so a row that
   * names a verdict is proven to be measuring one (s22). */
  state: string;
}

/** What the page measures once the module has drawn: its shifts, the box's region marked, and the rest. */
export async function readMeasured(page: BrowserPage): Promise<Measured> {
  const { counted } = await page.readLayoutShifts();
  const shifts = counted.map((e) => ({ value: Math.round(e.value * 10000) / 10000, sources: e.sources }));
  return { cls: counted.reduce((s, e) => s + e.value, 0), shifts, ...JSON.parse(await page.evaluate(READ_BESIDE_THE_SHIFTS)) };
}

/** A distance in pixels with its sign, as a failure message prints it. */
const signed = (px: number) => `${px >= 0 ? "+" : ""}${px}px`;
/** What was read, for a failure that names what moved and why. */
export const detail = (m: Measured) =>
  `${m.shifts.map((s) => `[${s.value} ${s.sources
    .map((source) => `${source.node} x${signed(source.dx)} y${signed(source.dy)}`).join(", ")}]`)
    .join(" ") || "(no shift)"}`
  + ` · footer ${m.footMoved === null ? "had no room at first paint" : signed(m.footMoved)}`
  + ` · subline ${m.subline}px · ledger ${m.ledgerOpen ? "open" : "closed"}`;

/**
 * What is on the screen while the module is still in the post — which is to
 * say, the page as the BUILD wrote it.
 *
 * It holds the card's node by reference, never by marking it: an attribute
 * would change what the box serialises to, and the skip this exists to prove
 * is a comparison of exactly that. And it reads what a reader actually sees in
 * the box, because from s10's second round the built page carries question one
 * AND the two lines that stand in for it, and which of the three shows is the
 * stylesheet's answer to a cover — not something the built HTML can be read for
 * (human's walk, 2026-09-15). The question is read by the interview's own
 * `readScreen`, in the same moment, the module still held.
 */
export async function readAtFirstPaint(page: BrowserPage): Promise<AtFirstPaint> {
  const built = JSON.parse(await page.evaluate(AT_FIRST_PAINT)) as Omit<AtFirstPaint, "question">;
  const { question } = await new InterviewPage({ page }).readScreen();
  return { ...built, question };
}

/** What is on the screen at the first paint, its question aside: the expression the read evaluates. */
export const AT_FIRST_PAINT = `(${readBuiltPaint})()`;

/** In the page: what is on the screen at the first paint, its question aside, as JSON, with the box's node and the
 * footer's top left on the window for the read once the module has drawn. */
function readBuiltPaint(): string {
  const marks = window as FirstPaintMarks;
  marks.__built = document.querySelector("#main > *");
  const foot = document.querySelector("footer.site-foot")!;
  const footBox = foot.getClientRects().length > 0;
  marks.__foot = footBox ? foot.getBoundingClientRect().top : null;
  // Null, not false, for an element the page does not draw: the read says so as it always has.
  const shown = (el: Element | null) => el && getComputedStyle(el).visibility === "visible"
    && getComputedStyle(el).display !== "none" && !!(el as HTMLElement).offsetParent;
  return JSON.stringify({
    held: !!marks.__built,
    cover: document.documentElement.dataset.cover ?? "",
    box: Math.round(document.getElementById("main")!.getBoundingClientRect().height),
    standIn: [...document.querySelectorAll(".stand-in")].filter(shown).map((el) => el.textContent),
    footBox,
    count: document.getElementById("decl-count")?.textContent ?? "",
    countShown: shown(document.getElementById("decl-count")),
  });
}

export interface AtFirstPaint {
  held: boolean;
  /** The cover the pre-paint script wrote on `<html>` — which reader this is. */
  cover: string;
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
  /** Whether the footer takes any room on the page yet. */
  footBox: boolean;
  /** The ledger's count as the build wrote it, for a failure to quote. */
  count: string;
  /** Whether a reader can see the ledger's count. */
  countShown: boolean;
}

/**
 * Every way a reader's first screen can differ from the one the build drew.
 * All seven are measured at all four viewports. `shape` is the reader the
 * pre-paint script names — `fresh`, `link`, `record` or, since s22, `verdict`
 * — and the stand-in and the cover are asserted from it.
 */
export const ARRIVALS = [
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
    // One more arrival: a record with nothing
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
  // A link whose code the site no longer knows: the head cannot tell it from
  // a known one, so it is painted as a link arrival, and the module then finds
  // nothing answered and settles on the other standing promise (#13).
  { name: "/?country=zz — a country code the site does not know", path: "/?country=zz", record: null, shape: "link" },
  { name: "/?route=zz — a route the site does not know", path: "/?route=zz", record: null, shape: "link" },
] as const;

/**
 * Which screen each arrival lands on once the module has drawn it. Said per
 * row rather than derived, so a seed the interview has stopped accepting turns
 * the row red instead of quietly measuring a question screen under a verdict's
 * name (s22).
 */
export const LANDS_ON: Record<(typeof ARRIVALS)[number]["name"], "questions" | "results"> = {
  "/ cold, with no record": "questions",
  "/?country=fr — from a country page": "questions",
  "/ with a saved record": "questions",
  "/?route=de-blue-card-general — from a route page": "questions",
  "/ with a finished record": "results",
  "/?country=zz — a country code the site does not know": "questions",
  "/?route=zz — a route the site does not know": "questions",
};
