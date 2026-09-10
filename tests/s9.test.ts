import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { isScored, scopeLine, routeStatements, type Dataset } from "permit-rulebook-data";
import { routePage, routePages } from "../src/lib/route-page.js";
import { countryPage, countryAddresses } from "../src/lib/country-page.js";
import { dataPage } from "../src/lib/data-page.js";
import { indexedPaths } from "../src/lib/sitemap.js";
import { routeAddresses, routePath } from "../src/lib/slug.js";
import { arrivalFrom, countryArrivalFrom } from "../src/lib/scope.js";

const ds = dataset as unknown as Dataset;
const pages = routePages(ds, "2026-09-10");

const textOf = (html: string): string =>
  html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#8599;/g, " ")
    .replace(/&middot;/g, "·").replace(/&#183;/g, "·")
    .replace(/\s+/g, " ");

const unscoredAddresses = () => routeAddresses(ds).filter((a) => !isScored(a.route));

/**
 * s9 — the five routes this product states and will not score, on the site.
 *
 * A page in this state looks like every other route page — the name, the rules
 * as the authority states them, each with its quote, its source and the day it
 * was read, the same header and the same footer — and carries none of the
 * results-shaped furniture it has no answers for. What it adds is the sentence
 * saying why, before the first rule, so a reader knows what they are reading
 * before they read it.
 */
describe("s9 — a route page that quotes the rules and offers no verdict", () => {
  it("there are five of them, each with a page at an address a person can read", () => {
    const unscored = unscoredAddresses();
    expect(unscored.length).toBe(5);
    expect(pages.length).toBe(28);
    for (const a of unscored) expect(a.path, a.route.id).toMatch(/^\/[a-z-]+\/[a-z0-9-]+$/);
    expect(unscored.map((a) => a.path).sort()).toEqual([
      "/france/employee-card",
      "/germany/self-employment-and-freelance-work",
      "/netherlands/single-permit-for-paid-employment",
      "/spain/employee-general-regime",
      "/spain/international-teleworker",
    ]);
  });

  it("its scope line says quoted and dated, not scored", () => {
    for (const a of unscoredAddresses()) {
      const text = textOf(routePage(ds, a, "2026-09-10").html);
      expect(scopeLine(a.route), a.route.id).toBe("quoted and dated · not scored");
      expect(text, a.route.id).toContain("quoted and dated · not scored");
    }
  });

  it("says why, in our own words, under the heading and before any rule", () => {
    for (const a of unscoredAddresses()) {
      const page = routePage(ds, a, "2026-09-10");
      const reason = a.route.scope.reason;
      expect(textOf(page.html), a.route.id).toContain(reason.replace(/\s+/g, " "));
      // Before the first thing the authority says, not after the last.
      const said = page.html.indexOf(reason.slice(0, 40));
      const rules = page.html.indexOf('<section class="rules"');
      expect(said, a.route.id).toBeGreaterThan(-1);
      expect(said, a.route.id).toBeLessThan(rules);
      // And after the page's own name — this is the sentence under the
      // heading, not a banner above it.
      expect(said, a.route.id).toBeGreaterThan(page.html.indexOf("<h1>"));
    }
  });

  it("every rule on it is quoted, sourced and dated", () => {
    for (const a of unscoredAddresses()) {
      const text = textOf(routePage(ds, a, "2026-09-10").html);
      const quoted = routeStatements(a.route).filter((s) => s.source);
      expect(quoted.length, a.route.id).toBeGreaterThan(0);
      for (const s of quoted) {
        expect(text, `${a.route.id}:${s.id}`).toContain(s.source!.quote.replace(/\s+/g, " "));
        expect(text, `${a.route.id}:${s.id}`).toContain(s.source!.retrieved_at);
      }
    }
  });

  /**
   * Step 4 of the scenario: nothing on the page invites a verdict. The
   * interview never offers these routes, so the page must not either — and a
   * reader who does walk on from here lands where every other arrival lands,
   * on the interview scoped to this country.
   */
  it("nothing on it invites a verdict on this route", () => {
    for (const a of unscoredAddresses()) {
      const html = routePage(ds, a, "2026-09-10").html;
      const text = textOf(html);
      expect(html, a.route.id).not.toContain(`?route=${a.route.id}`);
      expect(text, a.route.id).not.toContain("Where do you stand on this route?");
      expect(text, a.route.id).not.toContain("What this route asks for");
      expect(text, a.route.id).not.toContain("No salary or points threshold");
      // No rule cards: a rule card is what a criterion renders as, and this
      // route has none.
      expect(html.includes('<article class="rule">'), a.route.id).toBe(false);
      // The way on is the country's own interview, as it is from anywhere else.
      expect(html, a.route.id).toContain(`?country=${a.country.code.toLowerCase()}`);
    }
  });

  /**
   * No page links `?route=` for one of these, but a stale or hand-typed one
   * would otherwise name the route in the interview's opening sentence and sort
   * it first among results it can never appear in.
   */
  it("the interview does not take a scoped arrival from a route it never scores", () => {
    for (const a of unscoredAddresses()) {
      expect(arrivalFrom(ds, `?route=${a.route.id}`), a.route.id).toBe(null);
      // The country arrival the page actually offers still works.
      expect(countryArrivalFrom(ds, `?country=${a.country.code.toLowerCase()}`)?.code, a.route.id)
        .toBe(a.country.code);
    }
    // And a route it does score is still taken.
    expect(arrivalFrom(ds, "?route=de-blue-card-general")?.route.id).toBe("de-blue-card-general");
  });

  it("it is the same document every other route page is", () => {
    for (const a of unscoredAddresses()) {
      const page = routePage(ds, a, "2026-09-10");
      const html = page.html;
      for (const tag of [
        'property="og:title"', 'property="og:description"', 'rel="canonical"', 'rel="icon"',
      ]) expect(html, `${a.route.id}: ${tag}`).toContain(tag);
      expect(html, a.route.id).toContain("Permit Rulebook");
      expect(html, a.route.id).toContain("last run");
      expect(page.readDate, a.route.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(page.json.route, a.route.id).toEqual(a.route);
      expect(indexedPaths(ds), a.route.id).toContain(a.path);
    }
  });
});

/**
 * The country page. The heading over them promises nothing: they are listed,
 * not offered.
 */
describe("s9 — a country page lists them, below the ones it scores", () => {
  const pageFor = (code: string) => {
    const address = countryAddresses(ds).find((a) => a.country.code === code)!;
    return { address, page: countryPage(ds, address) };
  };

  it("lists 23 scored routes and five that are quoted and not scored", () => {
    let scored = 0;
    let quotedOnly = 0;
    for (const { country } of countryAddresses(ds)) {
      const { page } = pageFor(country.code);
      for (const route of country.routes) {
        expect(page.html, `${country.code}: ${route.id}`)
          .toContain(`href="${routePath(country, route)}/"`);
        if (isScored(route)) scored++; else quotedOnly++;
      }
    }
    expect(scored).toBe(23);
    expect(quotedOnly).toBe(5);
  });

  it("the heading over them promises nothing, and sits below the scored ones", () => {
    for (const { country } of countryAddresses(ds)) {
      const unscored = country.routes.filter((r) => !isScored(r));
      const { page } = pageFor(country.code);
      const heading = page.html.indexOf("Quoted here, not scored");
      expect(heading, country.code).toBeGreaterThan(-1);
      // Below every route the page does score.
      for (const route of country.routes.filter(isScored))
        expect(page.html.indexOf(`href="${routePath(country, route)}/"`), `${country.code}: ${route.id}`)
          .toBeLessThan(heading);
      // And above every route it does not.
      for (const route of unscored)
        expect(page.html.indexOf(`href="${routePath(country, route)}/"`), `${country.code}: ${route.id}`)
          .toBeGreaterThan(heading);
      // The line under the heading carries the scope line's own words, so the
      // section and the cards inside it say the same thing.
      expect(textOf(page.html), country.code).toContain("quoted and dated · not scored");
    }
  });

  it("an unscored card offers no figure it has no rule for", () => {
    const { page } = pageFor("DE");
    const after = page.html.slice(page.html.indexOf("Quoted here, not scored"));
    expect(after).not.toContain("no salary threshold");
    expect(after).not.toContain("salary threshold");
  });
});

/** Step 6: `/data` counts them for what they are. */
describe("s9 — the data page states both counts", () => {
  const page = dataPage(ds);
  const text = textOf(page.html);

  it("says 23 scored and five quoted but not scored", () => {
    expect(text).toContain("23 routes scored against your answers");
    expect(text).toContain("5 more quoted and dated but not scored");
    expect(text).toContain("23 scored, 5 quoted and dated but not scored");
  });

  it("the counts come from the dataset, not from a number somebody typed", () => {
    const routes = ds.countries.flatMap((c) => c.routes);
    const scored = routes.filter(isScored).length;
    const quotedOnly = routes.length - scored;
    expect(text).toContain(`${scored} routes scored against your answers`);
    expect(text).toContain(`${quotedOnly} more quoted and dated but not scored`);
    expect(page.description).toContain(`${scored} routes scored`);
    expect(page.description).toContain(`${quotedOnly} quoted and dated but not scored`);
  });
});
