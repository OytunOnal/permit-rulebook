import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { scopeLine, isScored, type Dataset } from "permit-rulebook-data";
import { audienceSentence, routePage, routePages } from "../src/lib/route-page/route-page.js";
import { esc } from "../src/lib/reason.js";
import { routeAddresses } from "../src/lib/slug.js";
import { stringPagesSheet, styleIn } from "./frame-alone.js";
import { textOf } from "./text-of.js";

/**
 * What a reader reads on a route page: it describes and never rules on them,
 * says whom it is for and what it covers, and spells its rules and citations
 * in the reader's words.
 */

const ds = dataset as unknown as Dataset;
const pages = routePages(ds);

/**
 * The pages for routes the product states and does not score. They are route
 * pages in every other respect, and a handful of cases below are about the
 * results-shaped furniture they deliberately lack (s9).
 */
const unscoredPaths = new Set(
  routeAddresses(ds).filter((a) => !isScored(a.route)).map((a) => a.path),
);

// The title these cases have always sat under; every block below repeats it, so each case keeps its id.
const ONE_PAGE_PER_ROUTE = "s6 — one page per route, generated from the dataset";

describe(ONE_PAGE_PER_ROUTE, () => {
  /**
   * INVARIANT 2 — no generated page contains a verdict word, and no element
   * outside the read-date emphasis and the hero accent resolves to a verdict
   * colour. A route page describes; it never rules on the reader.
   */
  it("no page rules on the reader, in word", () => {
    /**
     * The vocabulary a verdict is delivered in — the three status words the
     * results screen uses, and the second person applied to any of them.
     *
     * Not every occurrence of "approved" is a verdict: Spain's Blue Card
     * summary says that an application the large-companies unit does not answer
     * in twenty working days "counts as approved", which is a fact about an
     * administrative silence and not a judgement of the reader. What may never
     * appear is the product ruling: this page has no answers behind it, so it
     * has nothing to rule with.
     */
    const forbidden = [
      "criteria met", "criteria are met", "within reach", "not yet", "you qualify",
      "you may qualify", "you do not qualify", "you are eligible", "you are not eligible",
      "looks open", "your eligibility", "you appear to meet",
    ];
    for (const page of pages) {
      const said = `${textOf(page.html)} ${page.title} ${page.description}`.toLowerCase();
      for (const word of forbidden)
        expect(said, `${page.path}: "${word}"`).not.toContain(word);
    }
  });
});

describe(ONE_PAGE_PER_ROUTE, () => {
  it("no page rules on the reader, in colour", () => {
    // The two uses the tokens define for every screen, and nothing else. The
    // first mock framed a badge in --color-met and the critique called it a
    // verdict delivered without a verdict word (B3).
    const met = [...stringPagesSheet(ds).matchAll(/([^;{}\n]*var\(--color-met\)[^;{}\n]*)/g)].map((m) => m[1].trim());
    const near = [...stringPagesSheet(ds).matchAll(/([^;{}\n]*var\(--color-near\)[^;{}\n]*)/g)].map((m) => m[1].trim());
    // One declaration each, in the token block's own definitions plus the one
    // place the page uses it.
    // Four uses now, and every one of them is a read date: the quote's own
    // date on a route page, the date on a country-index card, the date beside a
    // route's JSON on the data page, and the span in the shared footer
    // (2026-09-08). The colour still says "when this was read" and never "how
    // you did".
    expect(met.filter((d) => !d.startsWith("--color-met")))
      .toEqual(Array(4).fill("color: var(--color-met)"));
    expect(near.filter((d) => !d.startsWith("--color-near"))).toEqual(["color: var(--color-near)"]);
    // And they belong to the read-date emphasis and the hero accent — the
    // accent shared by the H1's em and, on a route page, the tagline line
    // under the H1 (s27): one declaration, two selectors.
    expect(stringPagesSheet(ds)).toContain(".src b { color: var(--color-met);");
    expect(stringPagesSheet(ds)).toContain(".masthead-with-stamps h1 em, .masthead-with-stamps .tagline { font-style: normal; color: var(--color-near);");
    // The soft verdict tints are never painted at all.
    for (const token of ["--color-met-soft", "--color-near-soft"]) {
      const uses = [...stringPagesSheet(ds).matchAll(new RegExp(`var\\(${token}\\)`, "g"))];
      expect(uses.length, token).toBe(0);
    }
    // Nor are their hex values, anywhere in a page.
    for (const page of pages)
      for (const hex of ["#2e5b3f", "#8a5a19", "#e4efe7", "#f4ecd8"]) {
        const body = page.html.slice(page.html.indexOf("</style>"));
        expect(body.toLowerCase(), `${page.path}: ${hex}`).not.toContain(hex);
      }
  });
});

describe(ONE_PAGE_PER_ROUTE, () => {
  /**
   * INVARIANT 3 — every route carries exactly one scope statement, and the page
   * says it in the plain words rather than the dataset's key.
   */
  it("every page states its scope in plain words, ink on card", () => {
    for (const page of pages) {
      const text = textOf(page.html);
      const route = routeAddresses(ds).find((a) => a.path === page.path)!.route;
      // The reader's words, counted for this route, in the form for a page
      // with no answers (#151).
      expect(text, page.path).toContain(scopeLine(route, { reader: "not-answered" }));
      expect(text, page.path).toContain(route.scope.reason);
      // The key never reaches a reader.
      expect(text, page.path).not.toContain(route.scope.value);
      expect(text.toLowerCase(), page.path).not.toContain("fully modelled");
    }
    // The scope block is ink on card — no new colour, no verdict colour.
    expect(styleIn(pages[0]!.html)).toContain(".scope { margin: 0; padding: var(--space-3) var(--space-4); background: var(--color-card); border-left: 4px solid var(--color-ink); }");
  });

  it("one call to action, pre-scoped to this route — and none at all where there is nothing to check", () => {
    for (const address of routeAddresses(ds)) {
      const page = routePage(ds, address);
      const ctas = [...page.html.matchAll(/href="\/\?route=([a-z0-9-]+)"/g)].map((m) => m[1]);
      // A route the interview never offers is a route no page may offer to
      // check: the way on from one of these is the country's own interview,
      // which the shared header and footer carry (s9).
      expect(ctas, page.path).toEqual(isScored(address.route) ? [address.route.id] : []);
    }
  });
});

describe(ONE_PAGE_PER_ROUTE, () => {
  it("says who the page is for before the first rule", () => {
    for (const address of routeAddresses(ds)) {
      const page = routePage(ds, address);
      const text = textOf(page.html);
      const audience = audienceSentence(address.country);
      expect(text, page.path).toContain(audience);
      // Before the rules, not after the last of them. Anchored on the section
      // rather than on the first rule card, because a route the product does
      // not score has statements and no cards (s9).
      expect(page.html.indexOf(audience.slice(0, 40))).toBeLessThan(page.html.indexOf('<section class="rules"'));
    }
  });

  it("the disclaimer is one sentence, from one source, on every page", () => {
    for (const page of pages) {
      const text = textOf(page.html);
      expect(text, page.path).toContain(
        "Permit Rulebook makes no immigration decision and no authority is bound by these results",
      );
      // Each page carries the addendum written for what it is: the scored
      // pages say they describe rather than decide, and the ones the checker
      // does not ask about say it never rules on them at all (s9).
      expect(text, page.path).toContain(
        unscoredPaths.has(page.path)
          ? "This route is one the checker does not ask about"
          : "This page describes the rules; it does not decide on you.",
      );
    }
  });
});

describe(ONE_PAGE_PER_ROUTE, () => {
  it("no modelling vocabulary reaches a reader, in our own words", () => {
    // A verbatim quote is the authority's sentence and may not be edited — the
    // Dutch immigration service writes "the reduced salary criterion applies in
    // these 3 cases", and rewriting that to suit our glossary would be
    // inventing a source. The rule is about OUR words, so the quotes come out
    // before the scan.
    for (const page of pages) {
      const ours = textOf(page.html.replace(/<q[^>]*>[\s\S]*?<\/q>/g, " ")).toLowerCase();
      for (const word of ["modelled", "modeled", "modelling", "criterion", "criteria", "field id", "pipeline"])
        expect(ours, `${page.path}: ${word}`).not.toContain(word);
    }
  });
});

describe(ONE_PAGE_PER_ROUTE, () => {
  /**
   * A reader on a phone asked what "§" means (human walk, 2026-09-08). It is
   * in the name of every German route, so it greets a stranger before any
   * prose does — and the name is where the page must answer.
   */
  it("prints the section symbol bare, and never restates a citation's number", () => {
    const german = pages.filter((x) => x.path.startsWith("/germany/"));
    expect(german.length).toBeGreaterThan(0);
    for (const page of german) {
      const text = textOf(page.html);
      expect((text.match(/§/g) ?? []).length, page.path).toBeGreaterThan(0);
      // The explainer read "§ = section" once per page from s23's P1 until
      // s32's amendment 6 (the human's walk, 2026-09-18): the sign is read
      // as a reader reads it, so no page carries the words.
      expect(text, page.path).not.toContain("§ = section");
      // The stutter is a § citation followed by its own number restated in
      // words — "(§ 18b, section 18b)" and "§ 18g AufenthG (section 18g of the
      // Residence Act)", the two forms s23 P1 retired. Prose may say "section
      // 18g of the Residence Act" on its own — the shortage page's door does,
      // a link naming the law without the symbol (s28) — so the shape is the
      // citation's number, then that same number after "section", close by.
      expect(text, page.path).not.toMatch(/§ ([0-9]+[a-z]?)\b[^§]{0,24}\bsections? \1\b/);
      // Never inside a quote: what a source said is verbatim by contract.
      for (const q of page.html.matchAll(/<blockquote[^>]*>([^]*?)<[/]blockquote>/g))
        expect(q[1], page.path).not.toContain("section ");
    }
    // A route's name is the name it is known by: the citation in it stands
    // as written, in the H1 and in the list of neighbours alike.
    const academic = pages.find((x) => x.path === "/germany/skilled-worker-academic")!;
    expect(textOf(academic.html)).toContain("Skilled worker — academic (§ 18b)");
    expect(textOf(academic.html)).not.toContain("(§ 18b;");
    expect(textOf(academic.html)).not.toContain("(§ 18b (section");
    expect(textOf(academic.html)).toContain("Skilled worker — vocational (§ 18a)");
  });
});

describe(ONE_PAGE_PER_ROUTE, () => {
  /**
   * R8 — no abbreviation goes unexplained on first use.
   */
  it("expands an abbreviation the first time a page uses it, and not after", () => {
    const de = pages.find((x) => x.path === "/germany/eu-blue-card-general")!;
    const text = textOf(de.html);
    // Where a section citation names its act, the act is said after it, in
    // the one form an abbreviation takes (s23, P1; #151, story 25) — and
    // without the sign's words since s32's amendment 6.
    expect(text).toContain("§ 18g AufenthG (the Residence Act)");
    // Once, not on every citation on the page: the short form stands afterwards.
    expect(text.split("AufenthG (the Residence Act)").length - 1).toBe(1);
    expect(text.split("AufenthG").length - 1).toBeGreaterThan(1);
    const beschv = pages.find((x) => x.path === "/germany/experienced-worker")!;
    expect(textOf(beschv.html)).toContain("BeschV (the Employment Ordinance)");
    // One page of each country carries the licence spelled out before its short form.
    for (const path of [
      "/germany/eu-blue-card-general", "/france/eu-blue-card",
      "/spain/eu-blue-card", "/netherlands/orientation-year",
    ]) {
      const page = pages.find((x) => x.path === path)!;
      const said = textOf(page.html);
      expect(said, path).toContain("Creative Commons Attribution 4.0 (CC BY 4.0)");
      expect(said.indexOf("Creative Commons Attribution 4.0"), path)
        .toBeLessThan(said.lastIndexOf("CC BY 4.0"));
    }
    // And the seal says what it stands for.
    for (const page of pages) {
      expect(page.html, page.path).toContain('title="Permit Rulebook"');
      expect(page.html, page.path).toContain('aria-label="Permit Rulebook"');
    }
  });
});

describe(ONE_PAGE_PER_ROUTE, () => {
  /**
   * R9 — a rule card never restates its own heading and stops.
   */
  it("no rule card is one sentence that only restates its heading", () => {
    for (const page of pages) {
      const cards = [...page.html.matchAll(/<article class="rule">([\s\S]*?)<\/article>/g)].map((m) => m[1]);
      // A rule card is what a criterion renders as, so a route with no
      // criteria has none — and must have none (s9).
      if (unscoredPaths.has(page.path)) expect(cards.length, page.path).toBe(0);
      else expect(cards.length, page.path).toBeGreaterThan(0);
      for (const card of cards) {
        const heading = /<h2>([^<]*)<\/h2>/.exec(card)?.[1] ?? "";
        const hasEvidence = card.includes("<q") || card.includes("rail-list") || card.includes('class="asks"');
        expect(hasEvidence, `${page.path}: "${heading}" says nothing its heading did not`).toBe(true);
      }
    }
    // The block that carries it names the question the interview will ask.
    const de = pages.find((x) => x.path === "/germany/eu-blue-card-general")!;
    expect(textOf(de.html)).toContain("Which best describes your situation?");
  });

  it("the rail's labels are a list, at every width — they cannot collide", () => {
    const withRail = pages.filter((p) => p.html.includes("rail-list"));
    expect(withRail.length).toBeGreaterThan(10);
    // No positioned label survives anywhere: the class the collision lived on
    // is not rendered and not styled.
    for (const page of pages) expect(page.html, page.path).not.toContain('class="lbl"');
  });
});

describe(ONE_PAGE_PER_ROUTE, () => {
  /**
   * A quoted card whose disjunction has an unquoted path lists that path's
   * question under "What the checker asks": a quote on one path does not
   * quote the rules of another. The Spanish and Dutch Blue Cards' salary
   * rules each have a path that asks a question no quote covers.
   */
  it("a quoted card lists the unquoted rules of its disjunction's paths: the Spanish and Dutch Blue Cards", () => {
    const pathQuestions = [
      { path: "/spain/eu-blue-card", field: "qualification_recent" },
      { path: "/netherlands/eu-blue-card", field: "qualification" },
    ];
    for (const { path, field } of pathQuestions) {
      const page = pages.find((p) => p.path === path);
      expect(page, `no page at ${path}`).toBeDefined();
      const listed = `<li>${esc(ds.fields.find((f) => f.id === field)!.label)}</li>`;
      const asking = [...page!.html.matchAll(/<article class="rule">([\s\S]*?)<\/article>/g)]
        .map((m) => m[1])
        .filter((card) => (/<div class="asks">([\s\S]*?)<\/div>/.exec(card)?.[1] ?? "").includes(listed));
      expect(asking.length, `${path}: cards that ask ${field}`).toBe(1);
      // The card that asks it is quoted: the block speaks for its path.
      expect(asking[0]!.includes("<q") || asking[0]!.includes("rail-list"), path).toBe(true);
    }
  });
});
