import { describe, expect, it } from "vitest";
import { withSite, skipReason } from "./browser-walk.js";

/**
 * The Orientation lens (RUBRIC 1.3), which the site map's own birth demanded:
 * the cases that walk the frame in a browser.
 *
 * The product reached 29 pages with every screen approved on its own and nobody
 * owning the space between them: the interview navigated by its footer, a route
 * page by a crumb, a country page by nothing, and from Germany there was no way
 * to France at all (site map, 2026-09-08).
 */

/** And the folded state, measured rather than read off a media query. */
const { PHONE } = await import("../scripts/browser/browser.mjs");

const skipped = skipReason();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE NAVIGATION WAS NOT WALKED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

// The menu's state, read the same way at every step of the walks so the steps compare.
const STATE = 'JSON.stringify({'
  + ' expanded: document.querySelector(".menu").getAttribute("aria-expanded"),'
  + ' menuShown: getComputedStyle(document.querySelector(".menu")).display !== "none",'
  + ' navShown: getComputedStyle(document.querySelector(".nav")).display !== "none",'
  + ' focused: document.activeElement ? (document.activeElement.textContent || "").trim() : "",'
  + ' columns: getComputedStyle(document.querySelector(".nav")).gridTemplateColumns })';

/** Checks the nav at `width` is folded behind Menu or an open row, as `folded` says. */
async function expectNavFoldedAt(width: number, folded: boolean) {
  const seen = JSON.parse(await withSite(async ({ page, url: addressOf }) => {
    await page.goto(addressOf("/germany/"));
    return page.evaluate(STATE);
  }, { viewport: { width, height: 900 }, mobile: false }) as string) as
    { menuShown: boolean; navShown: boolean };
  expect(seen.menuShown, `the Menu button is ${seen.menuShown ? "shown" : "hidden"} at ${width}`).toBe(folded);
  expect(seen.navShown, `the row is ${seen.navShown ? "shown" : "hidden"} at ${width}`).toBe(!folded);
}

/** The menu's state at phone width: closed, opened, after Escape inside it, and after a choice. */
async function menuStatesAtPhoneWidth() {
  return await withSite(async ({ page, url: addressOf }) => {
    await page.goto(addressOf("/germany/"));
    const closed = JSON.parse(await page.evaluate(STATE));
    await page.evaluate('document.querySelector(".menu").click()');
    const open = JSON.parse(await page.evaluate(STATE));
    await page.evaluate(
      'document.querySelector(".nav").dispatchEvent('
      + ' new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))',
    );
    const escaped = JSON.parse(await page.evaluate(
      STATE.replace(/ [}][)]$/, ", onButton: document.activeElement === document.querySelector('.menu') })"),
    ));
    await page.evaluate('document.querySelector(".menu").click()');
    // Choosing a country closes the menu on the way out. The navigation
    // itself is held back so the state can be read: a page that has already
    // left has no menu to report on, which is how this case first went
    // flaky (2026-09-08).
    await page.evaluate(
      'document.addEventListener("click", (e) => e.preventDefault(), { capture: true, once: true });'
      + ' document.querySelector(".nav a").click()',
    );
    const chosen = JSON.parse(await page.evaluate(STATE));
    return { closed, open, escaped, chosen };
  }, PHONE) as {
    closed: { expanded: string; navShown: boolean };
    open: { expanded: string; navShown: boolean; focused: string; columns: string };
    escaped: { expanded: string; navShown: boolean; onButton: boolean };
    chosen: { expanded: string; navShown: boolean };
  };
}

/** Checks the menu at phone width opens into one column, takes the focus, and closes on Escape and on a choice. */
async function expectMenuOpensAndCloses() {
  const seen = await menuStatesAtPhoneWidth();

  expect(seen.closed.expanded).toBe("false");
  expect(seen.closed.navShown, "the row is showing before Menu was touched").toBe(false);
  expect(seen.open.expanded).toBe("true");
  expect(seen.open.navShown, "Menu opened nothing").toBe(true);
  // One column, as the mock draws it, and the focus on the first item.
  expect(seen.open.columns.split(" ").length, `columns: ${seen.open.columns}`).toBe(1);
  expect(seen.open.focused, "the focus did not move into the menu").toBe("Germany");
  // Escape closes it and gives the focus back to the control that opened it.
  expect(seen.escaped.expanded).toBe("false");
  expect(seen.escaped.navShown).toBe(false);
  expect(seen.escaped.onButton, "Escape left the focus adrift").toBe(true);
  // And choosing something closes it on the way out.
  expect(seen.chosen.expanded).toBe("false");
  expect(seen.chosen.navShown).toBe(false);
}

/** Checks Escape pressed outside the menu, and a tap outside it, both close it. */
async function expectEscapeAndTapOutsideClose() {
  const seen = await withSite(async ({ page, url: addressOf }) => {
    const state = async () => JSON.parse(await page.evaluate(STATE)) as
      { expanded: string; navShown: boolean };
    await page.goto(addressOf("/germany/"));
    // Escape pressed on the document, with the focus nowhere near the menu.
    await page.evaluate('document.querySelector(".menu").click()');
    const opened = await state();
    await page.evaluate('document.querySelector("h1").focus ? document.querySelector("h1").focus() : 0');
    await page.evaluate(
      'document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))',
    );
    const afterEscape = JSON.parse(await page.evaluate(
      STATE.replace(/ [}][)]$/, ", onButton: document.activeElement === document.querySelector('.menu') })"),
    )) as { expanded: string; navShown: boolean; onButton: boolean };
    // And a tap on the page outside it.
    await page.evaluate('document.querySelector(".menu").click()');
    const reopened = await state();
    await page.evaluate('document.querySelector("main").click()');
    const afterOutside = await state();
    return { opened, afterEscape, reopened, afterOutside };
  }, PHONE) as {
    opened: { expanded: string; navShown: boolean };
    afterEscape: { expanded: string; navShown: boolean; onButton: boolean };
    reopened: { expanded: string; navShown: boolean };
    afterOutside: { expanded: string; navShown: boolean };
  };

  expect(seen.opened.expanded).toBe("true");
  expect(seen.afterEscape.expanded, "Escape from outside the menu did nothing").toBe("false");
  expect(seen.afterEscape.navShown).toBe(false);
  expect(seen.afterEscape.onButton, "Escape left the focus adrift").toBe(true);
  expect(seen.reopened.expanded).toBe("true");
  expect(seen.afterOutside.expanded, "a tap outside left the menu open").toBe("false");
  expect(seen.afterOutside.navShown).toBe(false);
}

describe.skipIf(skipped !== null)("the nav folds where it says it does", () => {
  for (const [width, folded] of [[960, false], [959, true]] as const)
    it(`at ${width} px the nav is ${folded ? "folded behind Menu" : "an open row"}`, () => expectNavFoldedAt(width, folded), 180000);

  it("at 390 the menu opens, takes the focus, closes on Escape and on a choice", expectMenuOpensAndCloses, 180000);

  it("Escape closes it from anywhere on the page, and so does a tap outside", expectEscapeAndTapOutsideClose, 180000);
});

/**
 * On the live site the country headings over the per-route JSON lists were
 * clipped: the list started over the lower half of the letters, so only their
 * tops showed (human, 2026-09-08). The links carry the inline tap class, whose
 * negative vertical margin is right for a link inside a sentence and, inside a
 * grid, pulled each list up over its own heading.
 */
describe.skipIf(skipped !== null)("the data page's headings sit clear of their lists", () => {
  for (const [width, height] of [[1100, 900], [390, 844]] as const)
    it(`no country heading is overlapped at ${width} px`, async () => {
      const heads = JSON.parse(await withSite(async ({ page, url: addressOf }) => {
        await page.goto(addressOf("/data/"));
        return page.evaluate(
          'JSON.stringify([...document.querySelectorAll(".jsonlinks")].map((nav) => {'
          + ' const label = nav.querySelector(".label");'
          + ' const link = nav.querySelector("a");'
          + ' const l = label.getBoundingClientRect();'
          + ' const a = link.getBoundingClientRect();'
          + ' return { text: label.textContent.trim(), height: Math.round(l.height),'
          + '   bottom: Math.round(l.bottom), linkTop: Math.round(a.top),'
          + '   linkHeight: Math.round(a.height) }; }))',
        );
      }, { viewport: { width, height }, mobile: width < 500 }) as string) as
        { text: string; height: number; bottom: number; linkTop: number; linkHeight: number }[];

      expect(heads.length, "no per-route JSON lists on the page").toBe(4);
      for (const head of heads) {
        // The heading has a box of its own, and the list starts below it.
        expect(head.height, `${head.text}: the heading has no height`).toBeGreaterThan(8);
        expect(head.linkTop, `${head.text}: the list starts ${head.bottom - head.linkTop} px over the heading`)
          .toBeGreaterThanOrEqual(head.bottom);
        // And the rows are still a tap target.
        expect(head.linkHeight, `${head.text}: a JSON row is ${head.linkHeight} px`).toBeGreaterThanOrEqual(44);
      }
    }, 180000);
});

/** And the pages still work under their own policy, in a browser: the walk
 * fails on anything the policy refused on any of them, naming its page. */
describe.skipIf(skipped !== null)("nothing the site does is refused by its own policy", () => {
  it("every kind of page loads, renders and opens its menu with no CSP violation", async () => {
    const seen = await withSite(async ({ page, url: addressOf }) => {
      const out: Record<string, string> = {};
      for (const [name, path] of [
        ["interview", "/"], ["country", "/germany/"], ["data", "/data/"],
        ["route", "/germany/researcher/"], ["error", "/404.html"],
      ] as const) {
        await page.goto(addressOf(path));
        // Every load has run, so the policy has met each, before the next page opens.
        await page.waitUntilAtRest();
        out[name] = await page.evaluate(
          '(() => { const b = document.querySelector(".menu"); if (!b) return "no button";'
          + ' b.click(); return b.getAttribute("aria-expanded"); })()',
        );
      }
      return out;
    }, PHONE);

    // The inline menu script is hashed, so it still runs.
    for (const [name, menu] of Object.entries(seen)) expect(menu, `${name}: the menu did not open`).toBe("true");
  }, 180000);
});
