import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { WIDE_QUERY } from "../src/lib/first-paint.js";

/**
 * s30 — on a phone the next question comes up to meet the reader.
 *
 * Every question after the first is drawn 445 px down the page on a phone —
 * under the header, the headline, the subline and the stamp — with its first
 * option at 550. At 844 the second option is often out of sight; at 667 a long
 * first option is cut. The reader tapped an answer and had to scroll to find
 * the question they were asked (v1.1 gate critique, P10; measured on the live
 * site 2026-09-17 at 390×844 and 375×667). s20's `reveal` never fired: it
 * scrolls only when the card's *top* is off the screen, and the top was on it.
 *
 * The cases below read the card's top edge against the viewport after each
 * gesture, and compare it with the header's own measured height and the gap
 * the header keeps under itself — never a typed number. Narrow and wide are
 * the site's own breakpoint, `WIDE_QUERY`, as `matchMedia` reads it.
 */
const dist = fileURLToPath(new URL("../dist", import.meta.url));

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
    `  !! THE QUESTION'S LANDING WAS NOT WALKED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  emulateMedia(features: { name: string; value: string }[]): Promise<void>;
  problems(): string[];
}

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Where the reader is, read the way a reader would: the card's top against
 * the viewport, the header's height and the breath it keeps under itself,
 * what holds the focus, and which question is being asked.
 */
const WHERE = `JSON.stringify((() => {
  const card = document.querySelector("#main .qcard");
  const first = card && (card.querySelector(".opt, #cfilter") || card.querySelector(".qlabel"));
  const head = document.querySelector(".site-head");
  const active = document.activeElement;
  return {
    state: document.getElementById("app").dataset.state,
    wide: matchMedia(${JSON.stringify(WIDE_QUERY)}).matches,
    scrollY: window.scrollY,
    viewport: window.innerHeight,
    cardTop: card ? card.getBoundingClientRect().top : null,
    headerHeight: head ? head.getBoundingClientRect().height : null,
    gap: head ? parseFloat(getComputedStyle(head).paddingBottom) : null,
    question: card ? (card.querySelector(".qlabel")?.textContent || "").trim() : "",
    activeIsFirst: !!first && active === first,
    active: !active ? "" : active.id ? "#" + active.id : active.tagName + "." + (active.className || "").split(" ")[0],
  };
})())`;

interface Where {
  state: string;
  wide: boolean;
  scrollY: number;
  viewport: number;
  cardTop: number | null;
  headerHeight: number | null;
  gap: number | null;
  question: string;
  activeIsFirst: boolean;
  active: string;
}

const where = async (page: BrowserPage): Promise<Where> => JSON.parse(await page.evaluate(WHERE)) as Where;

/** The first option of the question on the screen — a choice, never the
 * country search, which no path reaches this early. */
const TAP_FIRST = 'document.querySelector("#main .qcard .opt").click()';
/** The first option, then the reader's position read before the browser has
 * had a frame: what an instant landing leaves, and a smooth one does not. */
const TAP_FIRST_AND_READ = `(() => { ${TAP_FIRST}; return ${WHERE}; })()`;
const TAP_BACK = 'document.querySelector("#main #back").click()';

/** The card's top is one header and one gap under the viewport's top — within
 * the pixel the browser rounds a scroll to. */
function expectLanded(step: Where, label: string): void {
  expect(step.state, `${label}: left the interview`).toBe("questions");
  expect(step.cardTop, `${label}: no question card`).not.toBeNull();
  const landing = step.headerHeight! + step.gap!;
  expect(
    Math.abs(step.cardTop! - landing),
    `${label}: the card's top is at ${step.cardTop} px, the landing is ${landing} px (scrollY ${step.scrollY})`,
  ).toBeLessThanOrEqual(1);
}

async function coldStart(page: BrowserPage, origin: (p: string) => string, settleMs = 1200): Promise<Where> {
  await page.goto(origin("/404.html"), 300);
  await page.evaluate("localStorage.clear()");
  await page.goto(origin("/"), settleMs);
  return where(page);
}

describe.skipIf(skipped !== null)("on a phone every question after the first comes up under the header", () => {
  for (const [name, viewport] of [
    ["390x844", { width: 390, height: 844 }],
    ["375x667, where a long first option was cut", { width: 375, height: 667 }],
  ] as const)
    it(`at ${name}: the first answer, the next, and Back`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          const cold = await coldStart(page, server.url);
          await page.evaluate(TAP_FIRST);
          await settle(900);
          const first = await where(page);
          await page.evaluate(TAP_FIRST);
          await settle(900);
          const second = await where(page);
          await page.evaluate(TAP_BACK);
          await settle(900);
          const back = await where(page);
          return { cold, first, second, back, problems: page.problems() };
        }, { viewport, mobile: true });
        expect(seen.problems).toEqual([]);
        expect(seen.cold.wide, "the breakpoint reads this width as wide").toBe(false);
        // The first paint is not a gesture: the cold load scrolls nothing.
        expect(seen.cold.scrollY).toBe(0);

        expectLanded(seen.first, "after the first answer");
        expect(seen.first.question).not.toBe(seen.cold.question);
        expectLanded(seen.second, "after the second answer");
        expect(seen.second.question).not.toBe(seen.first.question);
        expectLanded(seen.back, "after Back");
        expect(seen.back.question, "Back did not return to the question before").toBe(seen.first.question);

        // The focus behaviour does not change: the first control holds it,
        // and the page moved once to get there.
        for (const [label, step] of [["first answer", seen.first], ["second answer", seen.second], ["Back", seen.back]] as const)
          expect(step.activeIsFirst, `after the ${label} the focus is on ${step.active || "nothing"}`).toBe(true);
      } finally {
        server.close();
      }
    }, 180000);

  it("with reduced motion the landing is instant: final before the browser draws a frame", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.emulateMedia([{ name: "prefers-reduced-motion", value: "reduce" }]);
        const cold = await coldStart(page, server.url);
        const reduced = await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches");
        const atOnce = JSON.parse(await page.evaluate(TAP_FIRST_AND_READ)) as Where;
        await settle(900);
        const later = await where(page);
        return { cold, reduced, atOnce, later, problems: page.problems() };
      }, { viewport: { width: 390, height: 844 }, mobile: true });
      expect(seen.problems).toEqual([]);
      expect(seen.reduced, "the browser did not take the reduced-motion preference").toBe(true);
      expectLanded(seen.atOnce, "in the same task as the tap");
      expect(seen.later.scrollY, "the page kept moving after the instant landing").toBe(seen.atOnce.scrollY);
    } finally {
      server.close();
    }
  }, 180000);
});

describe.skipIf(skipped !== null)("what does not change", () => {
  it("at 1280x900 an answer scrolls nothing: the card sits beside the ledger with room above it", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const cold = await coldStart(page, server.url);
        await page.evaluate(TAP_FIRST);
        await settle(900);
        const first = await where(page);
        await page.evaluate(TAP_FIRST);
        await settle(900);
        const second = await where(page);
        return { cold, first, second, problems: page.problems() };
      }, { viewport: { width: 1280, height: 900 }, mobile: false });
      expect(seen.problems).toEqual([]);
      expect(seen.cold.wide, "the breakpoint reads this width as narrow").toBe(true);
      expect(seen.first.state).toBe("questions");
      expect(seen.first.scrollY, "the first answer moved a desktop reader").toBe(0);
      expect(seen.second.scrollY, "the second answer moved a desktop reader").toBe(0);
      expect(seen.first.activeIsFirst, `the focus is on ${seen.first.active || "nothing"}`).toBe(true);
    } finally {
      server.close();
    }
  }, 180000);

  it("at 390x844 a ✎ correction keeps s20's rule: a card whose top is on the screen is not moved", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await coldStart(page, server.url);
        await page.evaluate(TAP_FIRST);
        await settle(900);
        const landed = await where(page);
        // The reader scrolls a little back up — the card's top is still on the
        // screen, lower than the landing — then reopens the first row from the
        // ledger (found by its field, never by its words). On a phone the
        // ledger sits below the card, so opening it moves nothing above.
        await page.evaluate(`window.scrollTo({ top: ${landed.scrollY} - Math.round(window.innerHeight / 4), behavior: "instant" })`);
        const before = await where(page);
        await page.evaluate(`(() => {
          document.getElementById("decl").open = true;
          document.querySelector('#decl-list [data-field="destination"]').click();
        })()`);
        await settle(900);
        const corrected = await where(page);
        return { landed, before, corrected, problems: page.problems() };
      }, { viewport: { width: 390, height: 844 }, mobile: true });
      expect(seen.problems).toEqual([]);
      expect(seen.before.cardTop!).toBeGreaterThan(0);
      expect(seen.before.cardTop!).toBeLessThan(seen.before.viewport);
      expect(seen.corrected.state).toBe("questions");
      expect(seen.corrected.question, "the correction did not reopen the first question").not.toBe(seen.landed.question);
      // s20: the card is revealed only when its top is off the screen. It was
      // on it, so the page stands where the reader left it.
      expect(seen.corrected.scrollY, "a correction moved a card the reader could already see").toBe(seen.before.scrollY);
      expect(seen.corrected.activeIsFirst, `the focus is on ${seen.corrected.active || "nothing"}`).toBe(true);
    } finally {
      server.close();
    }
  }, 180000);
});
