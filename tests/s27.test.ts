import { describe, expect, it } from "vitest";
import { evaluate } from "permit-rulebook-data";
import { MENU, MENU_CLOSE, PRODUCT_NAME } from "../src/lib/copy/frame.js";
import { NOT_FOUND_START, NOT_FOUND_START_NOTE } from "../src/lib/copy/not-found.js";
import { ROUTE_DOOR } from "../src/lib/copy/verdict.js";
import { ROUTE_TAGLINE } from "../src/lib/copy/route-page.js";
import { notFoundPage } from "../src/lib/not-found.js";
import { declarationHtml } from "../src/lib/question.js";
import { routePage } from "../src/lib/route-page/route-page.js";
import { routeAddresses } from "../src/lib/slug.js";
import { url } from "../src/lib/site.js";
import { frameAlone, headerIn, interviewFrameAlone } from "./frame-alone.js";
import { blocksIn, countryNamed, drawnRouteOn, everyDrawnRouteIn, verdictFor } from "./verdict-cards.js";
import { OPENED, SENTENCE, WALKED_TO_FOUR, ds, headerOf, mastheadOf, nameOf } from "./s27-slips.js";

const textOf = (html: string): string =>
  html.replace(/<[^>]*>/g, " ").split("&nbsp;").join(" ").split(/\s+/).join(" ").split(String.fromCharCode(160)).join(" ").trim();

/**
 * s27 — five small slips (v1.1 gate critique, P8).
 *
 * Five things the critic saw on the live build and the walks confirmed: the
 * phone's Menu button says Menu while open; the disclosure mark on a country
 * section sits at the far left of the line with the name in the middle; the
 * 404 says "start from your own situation" twice to a screen reader and once
 * to a sighted one; the ledger's pencil wraps alone to a second line; a route
 * page's H1 is a name, a full stop and a sentence. Each is a decision below.
 */

describe("1 — the menu button says what it does", () => {
  it("the two words live in the copy module and reach the button as attributes; the script carries neither", () => {
    expect(MENU).toBe("Menu");
    expect(MENU_CLOSE).toBe("Close");
    const header = headerIn(frameAlone(ds));
    const menuScript = interviewFrameAlone(ds).menuScript;
    const button = /<button class="menu[^"]*"([^>]*)>([^<]*)<\/button>/.exec(header);
    expect(button, "no menu button in the header").not.toBeNull();
    // Closed at rest, and says so.
    expect(button![2]).toBe(MENU);
    expect(button![1]).toContain('aria-expanded="false"');
    expect(button![1]).toContain(`data-word-closed="${MENU}"`);
    expect(button![1]).toContain(`data-word-open="${MENU_CLOSE}"`);
    // The script reads the words off the button: no user-facing string is
    // typed into it, so a change of word is one edit in the copy module.
    expect(menuScript).toContain("dataset.wordOpen");
    expect(menuScript).toContain("dataset.wordClosed");
    for (const word of [MENU, MENU_CLOSE])
      expect(menuScript, `the script carries the word ${word}`).not.toMatch(new RegExp(`\\b${word}\\b`));
  });
});

describe("3 — the 404 says it once", () => {
  it("the sentence is the section's heading, the section is labelled by it, and nothing else on the page carries it", () => {
    const { html } = notFoundPage(ds);
    const section = /<section class="cta" aria-labelledby="([^"]+)">([\s\S]*?)<\/section>/.exec(html);
    expect(section, "no call-to-action section").not.toBeNull();
    const [, labelledBy, inner] = section!;
    const heading = new RegExp(`<h2([^>]*) id="${labelledBy}"([^>]*)>([^<]*)</h2>`).exec(inner);
    expect(heading, "the section's label is not an h2").not.toBeNull();
    expect(heading![3]).toBe(NOT_FOUND_START);
    // Not hidden: it is the sentence the sighted reader sees.
    expect(`${heading![1]}${heading![2]}`).not.toContain("visually-hidden");
    // Once on the whole page, whatever the case or the punctuation: the
    // hidden heading it replaces spelled the words without the "Or" and the
    // full stop, and a check that read them back verbatim would pass its
    // return.
    const text = textOf(html.replace(/<style>[\s\S]*?<\/style>/g, " "));
    expect(text.toLowerCase().split(SENTENCE).length - 1).toBe(1);
    expect(inner).not.toContain("<strong>");
    // And the privacy line after it is the copy's, not the template's.
    expect(inner).toContain(`<p>${NOT_FOUND_START_NOTE}</p>`);
  });
});

describe("4 — the pencil never stands alone", () => {
  it("the row binds the pen to the last word of the answer with a space that cannot break", () => {
    const html = declarationHtml(ds, { answers: { qualification: "degree" }, asked: ["qualification"], currentField: null });
    expect(html).toContain(`University degree&nbsp;<span class="pen" aria-hidden="true">✎</span>`);
    // The words are what they were: the label, then the pen.
    expect(textOf(html)).toContain("University degree ✎");
  });
});

describe("5 — a route's H1 is its name", () => {
  it("on every route page the H1 is the name the data gives it — no full stop after it — and the tagline follows as a line of its own", () => {
    const addresses = routeAddresses(ds);
    expect(addresses.length).toBeGreaterThan(20);
    for (const address of addresses) {
      const page = routePage(ds, address);
      const header = headerOf(page.html);
      expect(header, `${page.path}: the H1 is not a name followed by the tagline`).not.toBeNull();
      expect(header!.h1, page.path).toBe(nameOf(address.route));
      expect(header!.h1, page.path).not.toMatch(/\.$/);
      expect(header!.next).toBe(ROUTE_TAGLINE);
      expect(mastheadOf(page.html), page.path).not.toContain("<em>");
    }
  });

  it("the <title> and the social preview do not move", () => {
    for (const address of routeAddresses(ds)) {
      const page = routePage(ds, address);
      const title = `${address.route.name} · ${address.country.name} · ${PRODUCT_NAME}`;
      expect(page.title, page.path).toBe(title);
      expect(page.html).toContain(`<title>${title}</title>`);
      expect(page.html).toContain(`<meta property="og:title" content="${title}">`);
    }
  });
});

describe("7 — the tagline ends in a colon", () => {
  it("it introduces what follows; only the tagline, the title and the preview unmoved (asserted under 5)", () => {
    expect(ROUTE_TAGLINE.endsWith(":")).toBe(true);
  });
});

describe("8 — the card's door is a door", () => {
  it("the scope line stands alone, no separator after it; the door follows as its own element, the copy's words, an internal href", () => {
    const address = routeAddresses(ds).find((a) => a.route.id === "de-chancenkarte")!;
    const html = blocksIn(drawnRouteOn(verdictFor(OPENED), "de-chancenkarte"), "scoped");
    const m = /^<div class="scoped">([^<]*)<a class="door route-link" href="([^"]+)">([^<]*)<\/a><\/div>$/.exec(html);
    expect(m, html).not.toBeNull();
    const [, scope, href, words] = m!;
    expect(scope!.trim()).not.toMatch(/[·:—-]$/);
    expect(scope).toBe(scope!.trim());
    expect(words).toBe(ROUTE_DOOR);
    expect(href).toBe(url(address.path));
    expect(href!.startsWith("/")).toBe(true);
    expect(html).not.toContain(" · <a");
    // And that card is one the walk below draws: the first whole card on its screen.
    expect(evaluate(ds, OPENED).find((r) => r.route.id === "de-chancenkarte")!.status).toBe("met");
    expect(everyDrawnRouteIn(verdictFor(OPENED)).find((c) => c.html.includes('<article class="route"'))?.route).toBe("de-chancenkarte");
  });
});

describe("2 — the four-country result's sections, from the verdict", () => {
  it("France leads, then the others in the dataset's order; France's line is the one that says the s21 sentence", () => {
    const { layout } = verdictFor(WALKED_TO_FOUR);
    if (layout.kind !== "countries") throw new Error("the four-country verdict draws no country sections");
    expect(layout.sections.map((s) => countryNamed(s.country))).toEqual(["France", "Germany", "Spain", "Netherlands"]);
    expect(layout.sections.filter((s) => s.tally.mark !== null).map((s) => countryNamed(s.country))).toEqual(["France"]);
  });
});
