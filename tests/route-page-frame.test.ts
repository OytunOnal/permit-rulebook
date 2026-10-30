import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { TAP_CLASSES, routePages } from "../src/lib/route-page/route-page.js";
import { WRONG_DOOR_LABEL } from "../src/lib/copy/feedback.js";
import { FEEDBACK_PATH, url } from "../src/lib/site.js";
import { stringPagesSheet, styleIn } from "./frame-alone.js";

/**
 * A route page in its frame: the head a pasted link renders, the header, the
 * doors out to the data and back in, the token file and the tap rule every
 * control carries.
 */

const ds = dataset as unknown as Dataset;
const pages = routePages(ds);

/** Every `<a>` and `<button>` a page ships, with the classes it carries. */
const controlsOf = (html: string): string[][] =>
  [...html.matchAll(/<(?:a|button)\b([^>]*)>/g)]
    .map((m) => (/class="([^"]*)"/.exec(m[1])?.[1] ?? "").split(/\s+/).filter(Boolean));

describe("s6 — one page per route, generated from the dataset", () => {
  /**
   * INVARIANT 4 — every interactive element on every generated page reaches the
   * tap minimum. This is a build-time check over the rendered markup and the
   * page's own stylesheet, not a computed-style measurement: every control
   * carries one of the two declared tap classes, and each class is defined in
   * the page's stylesheet in terms of `--tap-min`. A real measurement at 390 px is
   * `npm run measure:taps`, which drives headless Chrome over the built site.
   */
  it("every interactive element carries a tap rule written in --tap-min", () => {
    for (const page of pages) {
      const controls = controlsOf(page.html);
      expect(controls.length, page.path).toBeGreaterThan(5);
      for (const classes of controls) {
        const claimed = classes.filter((c) => (TAP_CLASSES as readonly string[]).includes(c));
        expect(claimed.length, `${page.path}: <a class="${classes.join(" ")}">`).toBe(1);
      }
    }
    expect(styleIn(pages[0]!.html)).toContain(".tap-min { display: inline-flex; align-items: center; min-height: var(--tap-min); }");
    expect(styleIn(pages[0]!.html)).toContain("a.tap { display: inline-block; padding: calc((var(--tap-min) - 1.6em) / 2) 0;");
    // The token itself, so a rule written against a hard-coded 44px fails.
    expect(styleIn(pages[0]!.html)).toContain("--tap-min: 44px;");
  });

  it("the door to the data is on every page, and so is the way back in", () => {
    for (const page of pages) {
      expect(page.html, page.path).toContain(`href="${page.jsonPath}"`);
      expect(page.html, page.path).toContain("permit-rulebook-data");
      // The way back in was the tracker's new-issue chooser until s16: s13 had
      // made e-mail the reader's door and left this one pointing the old way.
      // It is /feedback/ now, in the words of that page's first door.
      expect(page.html, page.path).toContain(`href="${url(FEEDBACK_PATH)}">${WRONG_DOOR_LABEL}</a>`);
      expect(page.html, page.path).not.toContain("issues/new");
      expect(page.json.route, page.path).toBeDefined();
    }
  });

  it("the head carries the card a pasted link renders", () => {
    for (const page of pages) {
      for (const tag of [
        'property="og:title"', 'property="og:description"', 'property="og:image"',
        'property="og:url"', 'name="twitter:card"', 'rel="canonical"', 'rel="icon"',
      ]) expect(page.html, `${page.path}: ${tag}`).toContain(tag);
      expect(page.html, page.path).toContain("/social-card.png");
      expect(page.title, page.path).toContain("Permit Rulebook");
    }
  });

  /**
   * R5 — the token block on the page is `tokens.css`, not a copy of it.
   */
  it("inlines the token file itself, not a retyping of it", () => {
    const tokens = readFileSync(new URL("../tokens.css", import.meta.url), "utf8")
      .split("\r\n").join("\n");
    expect(styleIn(pages[0]!.html)).toContain(tokens);
    // And it really is the file: a token only the file carries is on the page.
    expect(tokens).toContain("--tap-min: 44px;");
    for (const page of pages) expect(page.html, page.path).toContain("--tap-min: 44px;");
  });

  /**
   * R12 — a crumb separator cannot be left behind when the last crumb wraps.
   */
  /**
   * There are no crumbs any more (human, revision 3 of the nav mock,
   * 2026-09-08): the shared header's wordmark and its marked country say where
   * you are, and the h1 names the page. The case that pinned the separator's
   * placement now pins the absence of the row it belonged to — a rule that
   * loses its subject should lose it visibly.
   */
  it("no page carries a crumb row: the header says where you are", () => {
    for (const page of pages) {
      expect(page.html, page.path).not.toContain('class="crumbs');
      expect(page.html, page.path).toContain('class="site-head"');
      // And the header marks this page's country as the one it sits under.
      expect(page.html, page.path).toContain('aria-current="true"');
    }
    expect(stringPagesSheet(ds), "the crumb styles outlived the crumbs").not.toContain(".crumbs");
  });
});
