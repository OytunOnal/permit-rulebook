import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { frameAlone, styleIn } from "./frame-alone.js";

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

/** Every stylesheet the built interview page links, as the browser receives them: the page's
 * own (the tokens, the identity), the interview's and the verdict's, minified together. */
function builtStylesheetsOfTheInterview(): string {
  const page = read("dist/index.html");
  const hrefs = [...page.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]!);
  expect(hrefs.length, "precondition: the built page links its stylesheets").toBeGreaterThan(0);
  return hrefs.map((href) => read(`dist/${href.replace(/^.*\/_astro\//, "_astro/")}`)).join("\n");
}

/** A stylesheet with every `@media print` block taken out. Paper is exempt: the printed record
 * drops the mark and prints the stamp in black on white, a decision about what to print. Brace
 * counting, not a regular expression: a print block contains nested rules. */
function withoutPrint(css: string): string {
  let rest = css;
  for (let at = rest.indexOf("@media print"); at >= 0; at = rest.indexOf("@media print")) {
    let depth = 0;
    let end = rest.length;
    for (let j = rest.indexOf("{", at); j < rest.length; j++) {
      if (rest[j] === "{") depth++;
      else if (rest[j] === "}" && --depth === 0) { end = j + 1; break; }
    }
    rest = rest.slice(0, at) + rest.slice(end);
  }
  return rest;
}

/** The selectors that make the pair what it is. */
const PAIR_SELECTORS = [".stamps", ".stamps .mark", ".stamps .stamp"];

// The title these cases have always sat under; every block below repeats it, so each case keeps its id.
const ONE_DEFINITION = "the identity pair has one definition";

describe(ONE_DEFINITION, () => {
  it("identity.css carries the pair, in tokens", () => {
    for (const selector of PAIR_SELECTORS)
      expect(identity, selector).toContain(`${selector} {`);
    // Both sizes, and the tilt in opposite directions.
    expect(identity).toContain("@media (min-width: 761px)");
    expect(identity).toContain("transform: rotate(calc(-1 * var(--stamp-rotate)))");
    expect(identity).toContain("transform: translateX(-50%) rotate(var(--stamp-rotate))");
    // The stamp's centre is under the mark's corner, and its own box is what
    // stops it growing past the pair: twice the space between that centre and
    // the pair's right edge, at each size (CI, ubuntu, 2026-09-08).
    expect(identity).toContain("width: max-content; max-width: 10.4rem");
    expect(identity).toContain("width: max-content; max-width: 12.4rem");
    // Written entirely in tokens: no bare hex, no hard-coded rotation.
    expect(identity).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(identity).not.toMatch(/rotate\(-?\d/);
  });

  it("the route page inlines that file rather than a copy of it", () => {
    expect(styleIn(frameAlone(dataset as unknown as Dataset))).toContain(identity);
  });
});

describe(ONE_DEFINITION, () => {
  it("the results page links the same file", () => {
    const page = read("src/pages/index.astro");
    expect(page).toContain('import "../../identity.css";');
    // What it renders, read off what it renders — the markup comes from
    // `identity.ts` now, so the page's own source says nothing about it
    // (Standards review, 2026-09-08).
    const built = read("dist/index.html");
    expect(built).toContain('class="stamps"');
    expect(built).toContain('class="mark"');
    expect(built).toContain('id="stamp-label"');
    // And neither the page nor the stylesheets it is built with state anything
    // about the pair beyond identity.css — not what it is made of, nor where it goes.
    const builtCss = builtStylesheetsOfTheInterview();
    expect(page).toContain('<header class="masthead-with-stamps">');
    expect(builtCss).not.toContain("header .stamps{position:absolute");
    for (const property of ["border:var(--stamp-border)", "var(--font-mono)", "letter-spacing:.1em"])
      expect(page.split("import \"../../identity.css\";")[1] + builtCss, property)
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
    expect(read("src/lib/route-page/route-page.ts")).toContain('<header class="masthead masthead-with-stamps">');
    expect(builtStylesheetsOfTheInterview()).not.toContain("header .stamps{position:absolute");
  });
});

describe(ONE_DEFINITION, () => {
  it("nothing else in the site draws the pair", () => {
    // A second definition is the drift this file exists to stop. `tokens.css`
    // holds values, not components; a page holds placement, not geometry.
    // Print is exempt (`withoutPrint`).
    for (const file of ["tokens.css", "src/lib/route-page/route-page.ts", "src/lib/frame/head/frame.css", "src/lib/frame/head/shared-blocks.css",
      "src/lib/route-page/route-page.css", "src/lib/country-page.css", "src/lib/data-page.css", "src/lib/feedback-page.css", "src/lib/verdict/verdict.css"]) {
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

  it("the interview page's built stylesheets draw the pair only as identity.css does", () => {
    // Built, the interview's stylesheet is minified together with identity.css, so the pair's
    // drawing rules are counted: as many as identity.css writes, and no more.
    const built = withoutPrint(builtStylesheetsOfTheInterview());
    expect(built, "precondition: the interview's stylesheet is among them").toContain(".qcard");
    const own = withoutPrint(identity);
    for (const part of ["mark", "stamp"]) {
      const written = own.split(`.stamps .${part} {`).length - 1;
      expect(written, `precondition: identity.css draws .stamps .${part}`).toBeGreaterThan(0);
      expect(built.split(`.stamps .${part}{`).length - 1, `.stamps .${part} is drawn a second time`).toBe(written);
    }
  });
});

/**
 * The identity was written out four times — the route page, the country page,
 * the 404 and the interview — with the same words, the same classes and four
 * chances to drift (Standards review, 2026-09-08). `identity.css` holds the one
 * set of rules that places it; `identity.ts` holds the one set of elements
 * those rules place.
 */

// The title these cases have always sat under; every block below repeats it, so each case keeps its id.
const ONE_SET_OF_ELEMENTS = "the identity has one set of elements too";

const emitters = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(root(dir))) {
    const path = `${dir}/${name}`;
    if (statSync(root(path)).isDirectory()) emitters(path, out);
    else if (/[.](ts|astro)$/.test(name)) out.push(path);
  }
  return out;
};

/**
 * The one exception, named rather than left to be discovered: the social card
 * is a 1,200×630 image rendered by a browser at a fixed size, with its own
 * geometry in pixels (a 224 px mark, a 404 px pair). It is not a page inside
 * the shared stylesheet, and giving it the page's markup would make it the
 * wrong size in a link preview.
 */
const OWN_GEOMETRY = ["src/lib/social-card.ts"];

describe(ONE_SET_OF_ELEMENTS, () => {
  it("only identity.ts writes the seal, the mark or the pair", () => {
    const offenders: string[] = [];
    for (const file of emitters("src")) {
      if (file === "src/lib/identity.ts" || OWN_GEOMETRY.includes(file)) continue;
      const text = read(file);
      for (const marker of ['class="seal"', 'class="stamps"', 'class="mark"'])
        if (text.includes(marker)) offenders.push(`${file}: ${marker}`);
    }
    expect(offenders, "the identity is being written out a second time").toEqual([]);
  });

  it("and only the frame writes the icon links", () => {
    const offenders: string[] = [];
    for (const file of emitters("src")) {
      if (file === "src/lib/frame/head/icon-links.ts") continue;
      if (read(file).includes('rel="apple-touch-icon"')) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

describe(ONE_SET_OF_ELEMENTS, () => {
  /**
   * Four links, and each is a size somebody actually asks for: the .ico for the
   * tab, the SVG for a display that can scale it, a 96px PNG because a search
   * engine wants a square that is a multiple of 48 (Google's own rule — the
   * site was in the results with no mark beside it, 2026-09-09), and a 180px
   * PNG for a home screen.
   */
  it("every built page carries the same four icon links, and the files exist", () => {
    const pages = ["dist/index.html", "dist/404.html", "dist/germany/index.html",
      "dist/germany/eu-blue-card-general/index.html"];
    for (const page of pages) {
      const html = read(page);
      expect(html, page).toContain('rel="apple-touch-icon"');
      expect(html, page).toContain('href="/favicon-180.png"');
      expect(html, page).toContain('sizes="96x96"');
      expect((html.match(/rel="icon"/g) ?? []).length, page).toBe(3);
    }
    for (const file of ["favicon.ico", "favicon.svg", "favicon-96.png", "favicon-180.png"])
      expect(existsSync(root(`dist/${file}`)), `${file} is linked but not built`).toBe(true);
  });
});
