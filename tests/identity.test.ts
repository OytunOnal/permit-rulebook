import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PAGE_CSS } from "../src/lib/route-page.js";

/**
 * The identity pair is one drawing, used twice.
 *
 * The PR mark above a stamp, tilted the other way, its bottom-right corner on
 * the middle of the stamp's top edge: the route page's "Rules read" stamp since
 * 2026-09-07, the results page's "Record generated" stamp since 2026-09-08. The
 * rules live in `identity.css` and nowhere else — the route page inlines that
 * text, the results page links the same file — so the two screens cannot drift
 * into two identities.
 *
 * Half of this is checked by reading; the other half by measuring, because a
 * shared stylesheet proves nothing if one page overrides it.
 */

const root = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const read = (p: string) => readFileSync(root(p), "utf8").split("\r\n").join("\n");

const identity = read("identity.css");
const dist = root("dist");

/** The selectors that make the pair what it is. */
const PAIR_SELECTORS = [".stamps", ".stamps .mark", ".stamps .stamp"];

describe("the identity pair has one definition", () => {
  it("identity.css carries the pair, in tokens", () => {
    for (const selector of PAIR_SELECTORS)
      expect(identity, selector).toContain(`${selector} {`);
    // Both sizes, and the tilt in opposite directions.
    expect(identity).toContain("@media (min-width: 761px)");
    expect(identity).toContain("transform: rotate(calc(-1 * var(--stamp-rotate)))");
    expect(identity).toContain("transform: translateX(-50%) rotate(var(--stamp-rotate))");
    // Written entirely in tokens: no bare hex, no hard-coded rotation.
    expect(identity).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(identity).not.toMatch(/rotate\(-?\d/);
  });

  it("the route page inlines that file rather than a copy of it", () => {
    expect(PAGE_CSS).toContain(identity);
  });

  it("the results page links the same file", () => {
    const page = read("src/pages/index.astro");
    expect(page).toContain('import "../../identity.css";');
    expect(page).toContain('class="stamps"');
    expect(page).toContain('class="mark"');
    // And states nothing about the pair at all any more — not what it is made
    // of, and since 2026-09-08 not where it goes either.
    expect(page).toContain('<header class="masthead-with-stamps">');
    expect(page).not.toContain("header .stamps{position:absolute");
    for (const property of ["border:var(--stamp-border)", "var(--font-mono)", "letter-spacing:.1em"])
      expect(page.split("import \"../../identity.css\";")[1], property)
        .not.toContain(`.stamp{${property}`);
  });

  it("identity.css places the pair as well as drawing it", () => {
    // Placement lived on each page until 2026-09-08 — the route page centred
    // the pair, the results page pinned it flush right — so the two drifted on
    // the one thing a reader compares them by. One rule now.
    for (const rule of [".masthead-with-stamps {", ".masthead-with-stamps > :first-child {", ".masthead-with-stamps .stamps {"])
      expect(identity, rule).toContain(rule);
    expect(identity).toContain("align-items: center");
    expect(identity).toContain("flex: 0 1 37rem");
    expect(identity).toContain("margin: 0 auto");
    expect(identity).toContain("margin: 0 0 0 auto");
    // And both mastheads use it, rather than each stating its own.
    expect(read("src/pages/index.astro")).toContain('<header class="masthead-with-stamps">');
    expect(read("src/lib/route-page.ts")).toContain('<header class="masthead masthead-with-stamps">');
    expect(read("src/pages/index.astro")).not.toContain("header .stamps{position:absolute");
  });

  it("nothing else in the site draws the pair", () => {
    // A second definition is the drift this file exists to stop. `tokens.css`
    // holds values, not components; a page holds placement, not geometry.
    //
    // Print is deliberately exempt. Paper is a different medium — the results
    // record drops the mark and prints the stamp in black on white — and that
    // is a decision about what to print, not a second drawing.
    // Brace counting, not a regular expression: a print block contains nested
    // rules, and a lazy match stops at the first inner brace.
    const withoutPrint = (css: string) => {
      const at = css.indexOf("@media print");
      if (at < 0) return css;
      let depth = 0, i = css.indexOf("{", at);
      for (let j = i; j < css.length; j++) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}" && --depth === 0) return css.slice(0, at) + css.slice(j + 1);
      }
      return css.slice(0, at);
    };
    for (const file of ["tokens.css", "src/pages/index.astro", "src/lib/route-page.ts"]) {
      const own = withoutPrint(read(file).split("${IDENTITY}").join(" "));
      expect(own, `${file} draws the mark`).not.toMatch(/\.stamps\s+\.mark\s*\{/);
      // And states nothing the pair is made of, only where it goes.
      for (const rule of [...own.matchAll(/(^|[ ,])([.]stamps[^{;]*)[{]([^}]*)[}]/gm)]) {
        const properties = rule[3].split(";").map((d) => d.split(":")[0].trim()).filter(Boolean);
        for (const property of properties)
          expect(["position", "margin", "right", "left", "top", "bottom", "display", "flex", "align-self", "z-index"],
            `${file}: "${rule[2].trim()}" sets ${property}, which is the pair's own`).toContain(property);
      }
    }
  });
});

/**
 * And the drawing lands in the same place on both screens. A shared stylesheet
 * is not a shared result: a page can override it, and the promise the human
 * made is geometric — the corner meets the middle of the top edge.
 */
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
    `  !! THE IDENTITY PAIR WAS NOT MEASURED: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join("\n"));

/**
 * A corner of an element after its own transform. `getBoundingClientRect` gives
 * the axis-aligned box of a rotated element, which is not the corner — so the
 * transform matrix is applied to the untransformed corner by hand.
 */
/**
 * Where the pair sits, relative to the text block beside it.
 *
 * The absolute distances differ between the two screens because their content
 * measures do — the results page puts its padding on the body, the route page
 * on the wrap — so what is asserted is what the rule promises: the pair is
 * CENTRED in the space that remains, and level with the middle of the text.
 */
const SEED_FINISHED_RECORD =
  'localStorage.setItem("permit-rulebook.record.v1", ' + JSON.stringify(JSON.stringify({
    version: 1,
    answers: {
      destination: "nl", citizenship: "TR", situation: "ict", salary_eur_month: "band_6",
      nl_recent_grad: "no", top200_grad: "no", age_band: "a30to35",
    },
    history: ["destination", "citizenship", "situation", "salary_eur_month", "nl_recent_grad", "top200_grad", "age_band"],
  })) + ")";

const PLACEMENT = `(() => {
  const head = document.querySelector('.masthead-with-stamps');
  if (!head) return JSON.stringify({ missing: true });
  const box = head.querySelector('.stamps');
  box.removeAttribute('hidden');
  const text = head.firstElementChild;
  const cs = getComputedStyle(head);
  const gap = Number.parseFloat(cs.columnGap) || 0;
  const h = head.getBoundingClientRect(), t = text.getBoundingClientRect(), s = box.getBoundingClientRect();
  return JSON.stringify({
    stack: cs.flexDirection,
    textWidth: Math.round(t.width),
    spaceLeft: Math.round(s.left - t.right - gap),
    spaceRight: Math.round(h.right - s.right),
    centreOffset: Math.round((s.top + s.height / 2) - (t.top + t.height / 2)),
    rightAlign: Math.round(s.right - t.right),
    belowText: Math.round(s.top - t.bottom),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  });
})()`;

const PROBE = `(() => {
  const box = document.querySelector(".stamps");
  if (!box) return JSON.stringify({ missing: true });
  box.removeAttribute("hidden");
  const corner = (el, ux, uy) => {
    const r = el.getBoundingClientRect();
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform.replace("none", ""));
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const px = (ux - 0.5) * el.offsetWidth, py = (uy - 0.5) * el.offsetHeight;
    return { x: cx + m.a * px + m.c * py, y: cy + m.b * px + m.d * py };
  };
  const mark = box.querySelector(".mark"), stamp = box.querySelector(".stamp");
  const br = corner(mark, 1, 1);
  const mid = corner(stamp, 0.5, 0);
  const b = box.getBoundingClientRect();
  return JSON.stringify({
    dx: +(br.x - mid.x).toFixed(1), dy: +(br.y - mid.y).toFixed(1),
    markW: mark.offsetWidth, markH: mark.offsetHeight,
    stampH: stamp.offsetHeight, boxW: Math.round(b.width), boxH: Math.round(b.height),
    markTransform: getComputedStyle(mark).transform,
    text: stamp.innerHTML.replace(/<[^>]*>/g, " ").split(/[^!-~]+/).filter(Boolean).join(" "),
  });
})()`;

/** What the probe hands back, and the slice of the harness this file uses. */
type Measure = Record<string, number | string | undefined>;
interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

describe.skipIf(skipped !== null)("the identity pair lands identically on both screens", () => {
  const RESULTS = "/";
  const ROUTE = "/germany/eu-blue-card-general/";

  for (const [width, label] of [[1100, "desktop"], [390, "390 px"]] as const) {
    it(`is the same drawing on the results page and a route page at ${label}`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          const out: Record<string, Measure> = {};
          for (const path of [RESULTS, ROUTE]) {
            await page.goto(server.origin + path, 700);
            out[path] = JSON.parse(await page.evaluate(PROBE)) as Measure;
          }
          return out;
        }, { viewport: { width, height: 900 }, mobile: width < 800 }) as Record<string, Measure>;

        const results = seen[RESULTS];
        const route = seen[ROUTE];
        expect(results.missing, "the results page has no pair").toBeUndefined();
        expect(route.missing, "the route page has no pair").toBeUndefined();

        // The promise: the mark's bottom-right corner sits on the middle of the
        // stamp's top edge.
        for (const [path, m] of Object.entries(seen)) {
          expect(Math.abs(m.dx as number), `${path} dx`).toBeLessThan(2);
          expect(Math.abs(m.dy as number), `${path} dy`).toBeLessThan(2);
        }

        // And it is the same drawing, not merely a correct one on each page.
        for (const key of ["markW", "markH", "stampH", "boxW", "boxH", "markTransform", "dx", "dy"])
          expect(route[key], `${key} differs between the two screens`).toEqual(results[key]);

        // The text each stamp carries is its own, and stays its own.
        expect(results.text).toMatch(/^Record generated[ ]+[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
        expect(route.text).toMatch(/^Rules read[ ]+[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
      } finally {
        server.close();
      }
    }, 120000);
  }

  for (const [width, label] of [[1100, "desktop"], [390, "390 px"]] as const) {
    it(`sits in the same place on both screens at ${label}`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          const out: Record<string, Measure> = {};
          for (const path of [RESULTS, ROUTE]) {
            await page.goto(server.origin + path, 400);
            if (path === RESULTS) {
              await page.evaluate(SEED_FINISHED_RECORD);
              await page.goto(server.origin + path, 1400);
            }
            out[path] = JSON.parse(await page.evaluate(PLACEMENT)) as Measure;
          }
          return out;
        }, { viewport: { width, height: 1000 }, mobile: width < 800 }) as Record<string, Measure>;

        const results = seen[RESULTS];
        const route = seen[ROUTE];
        expect(results.missing, "the results masthead does not carry the pair").toBeUndefined();
        expect(route.missing, "the route masthead does not carry the pair").toBeUndefined();

        // The pair must never push the page sideways. `measure:taps` walks the
        // results screen before any answers, where the stamp is still hidden,
        // so this is the only check that sees it (2026-09-08).
        for (const [path, m] of Object.entries(seen))
          expect(m.overflow as number, `${path} scrolls sideways`).toBeLessThanOrEqual(0);

        for (const [path, m] of Object.entries(seen)) {
          if (width > 760) {
            // A row: the text column stops at 37rem and the pair is centred in
            // what is left, level with the middle of the text.
            expect(m.stack, path).toBe("row");
            expect(m.textWidth, `${path} text column`).toBe(592);
            expect(Math.abs((m.spaceLeft as number) - (m.spaceRight as number)), `${path} not centred`)
              .toBeLessThanOrEqual(1);
            expect(Math.abs(m.centreOffset as number), `${path} not level with the text`)
              .toBeLessThanOrEqual(1);
          } else {
            // A column: the pair sits under the text, right-aligned to it.
            expect(m.stack, path).toBe("column");
            expect(Math.abs(m.rightAlign as number), `${path} not right-aligned`).toBeLessThanOrEqual(1);
            expect(m.belowText as number, `${path} not below the text`).toBeGreaterThanOrEqual(0);
          }
        }

        // The same placement, not merely a correct one on each page.
        const shared = width > 760
          ? ["stack", "textWidth", "centreOffset"]
          : ["stack", "rightAlign", "belowText"];
        for (const key of shared)
          expect(route[key], `${key} differs between the two screens`).toEqual(results[key]);
      } finally {
        server.close();
      }
    }, 120000);
  }
});
