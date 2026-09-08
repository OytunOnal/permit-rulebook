import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { routePages } from "../src/lib/route-page.js";
import type { Dataset } from "permit-rulebook-data";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/**
 * The number a route page exists for was 1.5 screens down on a desktop and 2.4
 * screens down on a phone (isolated v1-gate critique, 2026-09-08, F1). On
 * /germany/eu-blue-card-general the first €50,700 sat at y = 1397 of a 2,485 px
 * page, and "Check yours" at y = 2184 — 88% down. What held the fold instead
 * was a box headed "What the checker asks, and what it does not": a disclaimer
 * about an interview a search visitor has never seen.
 *
 * The ten-second test for that visitor is "what is the threshold, when was it
 * read, what do I do next". All three now sit above that box, and these cases
 * measure it in a browser rather than trusting the order in the source.
 */

describe("the answer is above the fold", () => {
  const pages = routePages(ds);

  it("every route page states its own number before it explains itself", () => {
    for (const page of pages) {
      const at = (mark: string) => page.html.indexOf(mark);
      const answer = at('class="answer"');
      expect(answer, `${page.path}: no answer block`).toBeGreaterThan(0);
      // Before the coverage box and before the rules.
      expect(answer, page.path).toBeLessThan(at('class="scope"'));
      expect(answer, page.path).toBeLessThan(at('class="rules"'));
      // It carries the read date and a way in.
      const block = page.html.slice(answer, at('class="scope"'));
      expect(block, page.path).toContain(page.readDate);
      // The page's one call to action sits in the same breath, still before
      // the box: lifted, not duplicated — a route page has one way in.
      expect(block, `${page.path}: no way in`).toContain("?route=");
      expect((page.html.match(/[?]route=/g) ?? []).length, `${page.path}: more than one way in`).toBe(1);
    }
  });

  it("a route with a threshold puts the amount there, and one without says so", () => {
    const withNumber = pages.find((p) => p.path === "/germany/eu-blue-card-general")!;
    const answer = withNumber.html.slice(withNumber.html.indexOf('class="answer"'));
    expect(answer.slice(0, 900)).toContain("50,700");
    // A route that asks for no money does not invent one.
    const without = pages.find((p) => p.path === "/germany/skilled-worker-academic")!;
    const none = without.html.slice(without.html.indexOf('class="answer"'));
    expect(none.slice(0, 900).toLowerCase()).toContain("no salary");
    expect(none.slice(0, 900)).not.toMatch(/€\s?[0-9]/);
  });
});

/** And measured where a reader stands: the first screen, at both widths. */
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
    `  !! THE FOLD WAS NOT MEASURED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join("\n"));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

describe.skipIf(skipped !== null)("measured in a browser", () => {
  for (const [width, height, mobile] of [[1100, 900, false], [390, 844, true]] as const)
    it(`the number, the read date and the way in are in the first screen at ${width} px`, async () => {
      const server = await serve(dist);
      try {
        const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
          await page.goto(server.url("/germany/eu-blue-card-general/"), 500);
          return page.evaluate(
            'JSON.stringify((() => {'
            + ' const box = document.querySelector(".answer");'
            + ' const number = [...document.querySelectorAll(".answer .mono, .answer b")]'
            + '   .find((n) => n.textContent.includes("50,700"));'
            + ' const cta = document.querySelector("a[href*=\\"route=\\"]");'
            + ' const date = document.querySelector(".answer time");'
            + ' const y = (el) => el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : -1;'
            + ' return { box: y(box), number: y(number), cta: y(cta), date: y(date),'
            + '   page: document.documentElement.scrollHeight };'
            + '})())',
          );
        }, { viewport: { width, height }, mobile }) as string) as
          { box: number; number: number; cta: number; date: number; page: number };

        for (const [what, y] of Object.entries(seen)) {
          if (what === "page") continue;
          expect(y, `${what} was not found at ${width} px`).toBeGreaterThanOrEqual(0);
          expect(y, `${what} sits at y=${y} of a ${seen.page} px page, below the ${height} px fold`)
            .toBeLessThan(height);
        }
      } finally {
        server.close();
      }
    }, 180000);
});
