import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  scopeLine, forEachCriterion, formatEUR, formatEURPer, provenancedValuesOf, quoteLanguage,
  routeStatements, type Dataset, type Route,
} from "permit-rulebook-data";
import {
  PAGE_CSS, TAP_CLASSES, audienceNotice, audienceSentence, routePage, routePages,
  stampDate,
} from "../src/lib/route-page.js";
import { datasetDay } from "../src/lib/copy.js";
import { esc } from "../src/lib/reason.js";
import { routeAddresses, routePath } from "../src/lib/slug.js";
// The frame round a quote lives with the quote, not with the page that shows
// one: the results card puts the same words round the same sentence.
import { separatorNote } from "../src/lib/quote.js";

const ds = dataset as unknown as Dataset;
const pages = routePages(ds);

/** The rendered text, with the markup taken away — what a reader actually reads. */
const textOf = (html: string): string =>
  html.replace(/<style>[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#8599;/g, " ")
    .replace(/\s+/g, " ");

/** Every `<a>` and `<button>` a page ships, with the classes it carries. */
const controlsOf = (html: string): string[][] =>
  [...html.matchAll(/<(?:a|button)\b([^>]*)>/g)]
    .map((m) => (/class="([^"]*)"/.exec(m[1])?.[1] ?? "").split(/\s+/).filter(Boolean));

describe("s6 — one page per route, generated from the dataset", () => {
  it("renders a page for every route, at an address a person can read", () => {
    expect(pages.length).toBe(23);
    expect(routeAddresses(ds).length).toBe(23);
    const germany = ds.countries.find((c) => c.code === "DE")!;
    const blueCard = germany.routes.find((r) => r.id === "de-blue-card-general")!;
    // The address the scenario walks: the country as a person names it, the
    // route as the authority names it — never the dataset's own keys.
    expect(routePath(germany, blueCard)).toBe("/germany/eu-blue-card-general");
    expect(new Set(pages.map((p) => p.path)).size).toBe(23);
    for (const p of pages) expect(p.path, p.path).toMatch(/^\/[a-z-]+\/[a-z0-9-]+$/);
  });

  /**
   * INVARIANT 1 — every amount and every quote on every generated page equals
   * the dataset's, over all routes. The page cannot drift from the source of
   * truth, because nothing on it is typed.
   */
  it("every amount and every quote on every page is the dataset's", () => {
    for (const address of routeAddresses(ds)) {
      const page = routePage(ds, address);
      const text = textOf(page.html);
      const route = address.route;
      let checked = 0;
      forEachCriterion(route.criteria, (c) => {
        for (const entry of provenancedValuesOf(c)) {
          expect(text, `${route.id}: quote missing`).toContain(entry.value.quote.replace(/\s+/g, " "));
          expect(text, `${route.id}: read date missing`).toContain(entry.value.retrieved_at);
          checked++;
          // `continue`, not `return`: this is a callback, and returning from it
          // abandoned every later value of the same criterion — a points
          // criterion's table quote was never checked (Standards review).
          if (entry.amount === undefined) continue;
          const field = "field" in c ? c.field : "";
          const period = ds.fields.find((f) => f.id === field)?.period;
          expect(text, `${route.id}: amount missing`).toContain(formatEURPer(entry.amount, period));
        }
      });
      for (const s of routeStatements(route))
        if (s.source) {
          expect(text, `${route.id}: statement quote missing`).toContain(s.source.quote.replace(/\s+/g, " "));
          checked++;
        }
      expect(checked, route.id).toBeGreaterThan(0);
    }
  });

  it("a changed threshold changes the page — the test only passes when they agree", () => {
    const moved = JSON.parse(JSON.stringify(dataset)) as Dataset;
    const germany = moved.countries.find((c) => c.code === "DE")!;
    const route = germany.routes.find((r) => r.id === "de-blue-card-general")!;
    const salary = route.criteria.find((c) => c.op === "gte")!;
    if (salary.op !== "gte") throw new Error("unreachable");
    salary.threshold.amount = 51234;
    const address = routeAddresses(moved).find((a) => a.route.id === "de-blue-card-general")!;
    const text = textOf(routePage(moved, address).html);
    expect(text).toContain("€51,234/year");
    expect(text).not.toContain("€50,700/year");
  });

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

  it("no page rules on the reader, in colour", () => {
    // The two uses the tokens define for every screen, and nothing else. The
    // first mock framed a badge in --color-met and the critique called it a
    // verdict delivered without a verdict word (B3).
    const met = [...PAGE_CSS.matchAll(/([^;{}\n]*var\(--color-met\)[^;{}\n]*)/g)].map((m) => m[1].trim());
    const near = [...PAGE_CSS.matchAll(/([^;{}\n]*var\(--color-near\)[^;{}\n]*)/g)].map((m) => m[1].trim());
    // One declaration each, in the token block's own definitions plus the one
    // place the page uses it.
    // Three uses now, and all three are a read date: the quote's own date on a
    // route page, the date on a country-index card, and the date beside a
    // route's JSON on the data page (2026-09-08). The colour still says
    // "when this was read" and never "how you did".
    expect(met.filter((d) => !d.startsWith("--color-met")))
      .toEqual(["color: var(--color-met)", "color: var(--color-met)", "color: var(--color-met)"]);
    expect(near.filter((d) => !d.startsWith("--color-near"))).toEqual(["color: var(--color-near)"]);
    // And they belong to the read-date emphasis and the hero accent.
    expect(PAGE_CSS).toContain(".src b { color: var(--color-met);");
    expect(PAGE_CSS).toContain(".masthead-with-stamps h1 em { font-style: normal; color: var(--color-near);");
    // The soft verdict tints are never painted at all.
    for (const token of ["--color-met-soft", "--color-near-soft"]) {
      const uses = [...PAGE_CSS.matchAll(new RegExp(`var\\(${token}\\)`, "g"))];
      expect(uses.length, token).toBe(0);
    }
    // Nor are their hex values, anywhere in a page.
    for (const page of pages)
      for (const hex of ["#2e5b3f", "#8a5a19", "#e4efe7", "#f4ecd8"]) {
        const body = page.html.slice(page.html.indexOf("</style>"));
        expect(body.toLowerCase(), `${page.path}: ${hex}`).not.toContain(hex);
      }
  });

  /**
   * INVARIANT 3 — every route carries exactly one scope statement, and the page
   * says it in the plain words rather than the dataset's key.
   */
  it("every page states its scope in plain words, ink on card", () => {
    for (const page of pages) {
      const text = textOf(page.html);
      const route = routeAddresses(ds).find((a) => a.path === page.path)!.route;
      // The reader's words, counted for this route (decision 3 amended, 2026-09-08).
      expect(text, page.path).toContain(scopeLine(route));
      expect(text, page.path).toContain(route.scope.reason);
      // The key never reaches a reader.
      expect(text, page.path).not.toContain(route.scope.value);
      expect(text.toLowerCase(), page.path).not.toContain("fully modelled");
    }
    // The scope block is ink on card — no new colour, no verdict colour.
    expect(PAGE_CSS).toContain(".scope { margin: 0; padding: var(--space-3) var(--space-4); background: var(--color-card); border-left: 4px solid var(--color-ink); }");
  });

  /**
   * INVARIANT 4 — every interactive element on every generated page reaches the
   * tap minimum. This is a build-time check over the rendered markup and the
   * page's own stylesheet, not a computed-style measurement: every control
   * carries one of the two declared tap classes, and each class is defined in
   * `PAGE_CSS` in terms of `--tap-min`. A real measurement at 390 px is
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
    expect(PAGE_CSS).toContain(".tap-min { display: inline-flex; align-items: center; min-height: var(--tap-min); }");
    expect(PAGE_CSS).toContain("a.tap { display: inline-block; padding: calc((var(--tap-min) - 1.6em) / 2) 0;");
    // The token itself, so a rule written against a hard-coded 44px fails.
    expect(PAGE_CSS).toContain("--tap-min: 44px;");
  });

  it("the rail's labels are a list, at every width — they cannot collide", () => {
    const withRail = pages.filter((p) => p.html.includes("rail-list"));
    expect(withRail.length).toBeGreaterThan(10);
    // No positioned label survives anywhere: the class the collision lived on
    // is not rendered and not styled.
    for (const page of pages) expect(page.html, page.path).not.toContain('class="lbl"');
  });

  it("every quote is tagged with the language it is in, and framed", () => {
    for (const page of pages) {
      const quotes = [...page.html.matchAll(/<q([^>]*)>/g)].map((m) => m[1]);
      expect(quotes.length, page.path).toBeGreaterThan(0);
      for (const attrs of quotes) expect(attrs, page.path).toMatch(/lang="[a-z]{2}"/);
    }
    // And the frame says which language, in the reader's words.
    const de = pages.find((p) => p.path === "/germany/eu-blue-card-general")!;
    expect(textOf(de.html)).toContain("German, from arbeitsagentur.de.");
  });

  it("says once where the source spells a number differently from the page", () => {
    expect(separatorNote(50700, "welches im Jahr 2026 50.700 Euro beträgt"))
      .toBe("The source writes 50.700 where this page writes 50,700 — the same number.");
    // No note where the source agrees with the page, or never spells it.
    expect(separatorNote(50700, "at least 50,700 euro")).toBe("");
    expect(separatorNote(50700, "the general threshold applies")).toBe("");
    const de = pages.find((p) => p.path === "/germany/eu-blue-card-general")!;
    expect(textOf(de.html)).toContain("The source writes 50.700 where this page writes 50,700");
  });

  it("the stamp is the newest read date on the page, and every date is ISO", () => {
    for (const address of routeAddresses(ds)) {
      const page = routePage(ds, address);
      expect(page.readDate, page.path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const onPage = [...page.html.matchAll(/datetime="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);
      expect(onPage, page.path).toContain(page.readDate);
      // Nothing on the page was read later than the stamp claims.
      for (const d of onPage) expect(d <= page.readDate, `${page.path}: ${d}`).toBe(true);
      // Never a second date format beside it.
      expect(textOf(page.html), page.path).not.toMatch(/\d{2}\s*·\s*\d{2}\s*·\s*\d{4}/);
      expect(textOf(page.html), page.path).not.toMatch(/\d{4}\.\d{2}\.\d{2}/);
    }
  });

  it("the door to the data is on every page, and so is the way back in", () => {
    for (const page of pages) {
      expect(page.html, page.path).toContain(`href="${page.jsonPath}"`);
      expect(page.html, page.path).toContain("permit-rulebook-data");
      expect(page.html, page.path).toContain("issues/new/choose");
      expect(page.json.route, page.path).toBeDefined();
    }
  });

  it("one call to action, pre-scoped to this route", () => {
    for (const address of routeAddresses(ds)) {
      const page = routePage(ds, address);
      const ctas = [...page.html.matchAll(/href="\/\?route=([a-z0-9-]+)"/g)].map((m) => m[1]);
      expect(ctas, page.path).toEqual([address.route.id]);
    }
  });

  it("says who the page is for before the first rule", () => {
    for (const address of routeAddresses(ds)) {
      const page = routePage(ds, address);
      const text = textOf(page.html);
      const audience = audienceSentence(address.country);
      expect(text, page.path).toContain(audience);
      // Before the first rule card, not after the last.
      expect(page.html.indexOf(audience.slice(0, 40))).toBeLessThan(page.html.indexOf('<article class="rule">'));
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

  it("the disclaimer is one sentence, from one source, on every page", () => {
    for (const page of pages) {
      const text = textOf(page.html);
      expect(text, page.path).toContain(
        "Permit Rulebook makes no immigration decision and authorities won't consider these results",
      );
      expect(text, page.path).toContain("This page describes the rules; it does not decide on you.");
    }
  });

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

  it("the stamp aggregates the page's own dates and nothing else", () => {
    const route = ds.countries.flatMap((c) => c.routes).find((r) => r.id === "de-blue-card-general")!;
    const dates: string[] = [];
    forEachCriterion(route.criteria, (c) => {
      for (const e of provenancedValuesOf(c)) dates.push(e.value.retrieved_at);
    });
    for (const s of routeStatements(route)) if (s.source) dates.push(s.source.retrieved_at);
    // The notice's own read date is on the page too, so the stamp aggregates
    // both — it is the newest of everything printed, not merely no older.
    const notice = audienceNotice(ds)!;
    dates.push(notice.source.retrieved_at);
    expect(stampDate(route, notice)).toBe([...dates].sort().at(-1)!);
  });

  /**
   * R5 — the token block on the page is `tokens.css`, not a copy of it.
   */
  it("inlines the token file itself, not a retyping of it", () => {
    const tokens = readFileSync(new URL("../tokens.css", import.meta.url), "utf8")
      .split("\r\n").join("\n");
    expect(PAGE_CSS).toContain(tokens);
    // And it really is the file: a token only the file carries is on the page.
    expect(tokens).toContain("--tap-min: 44px;");
    for (const page of pages) expect(page.html, page.path).toContain("--tap-min: 44px;");
  });

  /**
   * INVARIANT 1, the other direction — nothing on a page is a number or a
   * sentence somebody typed. `toContain` only proves the dataset reached the
   * page; this proves nothing else did (Standards review, 2026-09-07).
   */
  it("every amount printed on a page is an amount the dataset holds for it", () => {
    for (const address of routeAddresses(ds)) {
      const page = routePage(ds, address);
      const body = page.html.slice(page.html.indexOf("</style>"));
      // A digit has to follow the sign: French writes the sign after the number
      // ("39 582 \u20ac."), and a pattern that allows no digit matches the full stop.
      const printed = new Set([...body.matchAll(/\u20ac\d[\d.,]*\d|\u20ac\d/g)].map((m) => m[0]));
      // What this route may print: its own thresholds, and the neighbouring
      // amounts its rail places it against — every one of them a dataset value.
      const allowed = new Set<string>();
      for (const r of address.country.routes)
        forEachCriterion(r.criteria, (c) => {
          if (c.op !== "gte") return;
          allowed.add(formatEUR(c.threshold.amount));
        });
      // Everything the dataset itself says in words, for this route. An amount
      // inside a quote is the authority's and verbatim; one inside a statement,
      // a reading or the scope reason is the curator's, written beside the
      // value it talks about. Both are dataset content under the other
      // repository's gates. What may NOT appear is a number this template made.
      const prose = [
        address.route.summary ?? "", address.route.scope.reason,
        ...routeStatements(address.route).flatMap((st) => [st.text, st.source?.quote ?? ""]),
        ...(address.route.readings ?? []).map((r) => r.text),
        audienceNotice(ds)?.body ?? "", audienceNotice(ds)?.source.quote ?? "",
      ].join(" ");
      for (const amount of printed) {
        if (prose.includes(amount)) continue;
        expect(allowed, `${page.path} prints ${amount}, which the dataset does not hold for it`)
          .toContain(amount.replace(/\/(year|month)$/, ""));
      }
      expect(printed.size, page.path).toBeGreaterThanOrEqual(0);
    }
  });

  it("every quoted sentence on a page is a quote the dataset holds for it", () => {
    for (const address of routeAddresses(ds)) {
      const page = routePage(ds, address);
      const quoted = [...page.html.matchAll(/<q[^>]*>([\s\S]*?)<\/q>/g)].map((m) => m[1]);
      const held = new Set<string>();
      forEachCriterion(address.route.criteria, (c) => {
        for (const e of provenancedValuesOf(c)) held.add(esc(e.value.quote));
      });
      for (const st of routeStatements(address.route)) if (st.source) held.add(esc(st.source.quote));
      const notice = audienceNotice(ds);
      if (notice) held.add(esc(notice.source.quote));
      expect(quoted.length, page.path).toBeGreaterThan(0);
      for (const q of quoted)
        expect(held, `${page.path} quotes a sentence the dataset does not hold for it`).toContain(q);
    }
  });

  /**
   * S2 — an attribute value carrying a quotation mark does not close the
   * attribute. Nothing in the dataset carries one today, which is exactly why
   * this is pinned before something does.
   */
  it("a quotation mark in a name or a URL cannot break out of an attribute", () => {
    const hostile = JSON.parse(JSON.stringify(dataset)) as Dataset;
    const country = hostile.countries[0];
    const route = country.routes[0];
    route.name = 'EU Blue Card "general" <b>';
    const gte = route.criteria.find((c) => c.op === "gte");
    if (gte && gte.op === "gte") gte.threshold.source_url = 'https://example.org/a"b';
    const page = routePage(hostile, routeAddresses(hostile)[0]);
    // The name reaches the attributes escaped, and no bare quote survives inside one.
    for (const attr of [...page.html.matchAll(/(?:href|content|title|aria-label)="([^"]*)"/g)])
      expect(attr[1], attr[0]).not.toContain("<");
    expect(page.html).toContain("&quot;");
    expect(page.html).not.toContain('href="https://example.org/a"b"');
    expect(page.html).toContain("&lt;b&gt;");
  });

  /**
   * A reader on a phone asked what "§" means (human walk, 2026-09-08). It is
   * in the name of every German route, so it greets a stranger before any
   * prose does — and the name is where the page must answer.
   */
  it("says the section symbol in words the first time a page uses it", () => {
    const german = pages.filter((x) => x.path.startsWith("/germany/"));
    expect(german.length).toBeGreaterThan(0);
    for (const page of german) {
      const text = textOf(page.html);
      expect((text.match(/§/g) ?? []).length, page.path).toBeGreaterThan(0);
      // Exactly one gloss on the page, however many citations it carries.
      // Singular or plural: a name that cites two sections is glossed once,
      // after the whole citation ("§ 19c / § 6 BeschV; sections 19c and 6").
      const glosses = text.match(/sections? [0-9]+[a-z]?/g) ?? [];
      expect(glosses.length, page.path).toBe(1);
      // Never inside a quote: what a source said is verbatim by contract.
      for (const q of page.html.matchAll(/<blockquote[^>]*>([^]*?)<[/]blockquote>/g))
        expect(q[1], page.path).not.toContain("section ");
    }
    // A route whose own name carries the citation is glossed in the name, and
    // the name's own brackets are not doubled to do it.
    const academic = pages.find((x) => x.path === "/germany/skilled-worker-academic")!;
    expect(textOf(academic.html)).toContain("Skilled worker — academic (§ 18b, section 18b)");
    expect(textOf(academic.html)).not.toContain("(§ 18b (section");
    // Afterwards the short form stands — including in the list of neighbours.
    expect(textOf(academic.html)).toContain("Skilled worker — vocational (§ 18a)");
    // Nothing outside Germany grows a section gloss it has no citation for.
    for (const page of pages.filter((x) => !x.path.startsWith("/germany/")))
      expect(textOf(page.html), page.path).not.toMatch(/sections? [0-9]/);
  });

  /**
   * R8 — no abbreviation goes unexplained on first use (scenario step 1).
   */
  it("expands an abbreviation the first time a page uses it, and not after", () => {
    const de = pages.find((x) => x.path === "/germany/eu-blue-card-general")!;
    const text = textOf(de.html);
    // Where the page's first section citation names its act, both are said in
    // one breath rather than two abutting brackets.
    expect(text).toContain("§ 18g AufenthG (section 18g of the Residence Act)");
    // Once, not on every citation on the page: the short form stands afterwards.
    expect(text.split("section 18g of the Residence Act").length - 1).toBe(1);
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

  /**
   * R9 — a rule card never restates its own heading and stops.
   */
  it("no rule card is one sentence that only restates its heading", () => {
    for (const page of pages) {
      const cards = [...page.html.matchAll(/<article class="rule">([\s\S]*?)<\/article>/g)].map((m) => m[1]);
      expect(cards.length, page.path).toBeGreaterThan(0);
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

  /**
   * R11 — one guarded formatter for the dataset's version.
   */
  it("prints the dataset version as a date and the schema version as a version", () => {
    expect(datasetDay("2026.09.07")).toBe("2026-09-07");
    expect(datasetDay("0.5.0")).toBe("0.5.0");
    for (const page of pages) {
      const text = textOf(page.html);
      expect(text, page.path).toContain(`dataset ${datasetDay(ds.dataset_version)}`);
      expect(text, page.path).toContain(`schema ${ds.schema_version}`);
    }
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
    expect(PAGE_CSS, "the crumb styles outlived the crumbs").not.toContain(".crumbs");
  });

  it("every source on every page can name its language", () => {
    for (const address of routeAddresses(ds)) {
      const route: Route = address.route;
      forEachCriterion(route.criteria, (c) => {
        for (const e of provenancedValuesOf(c))
          expect(quoteLanguage(e.value.source_url), `${route.id}: ${e.value.source_url}`).toBeTruthy();
      });
    }
  });
});
