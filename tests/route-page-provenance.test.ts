import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  forEachCriterion, formatEUR, formatEURPer, noticeSources, provenancedValuesOf, quoteLanguage,
  routeStatements, statementSources, type Dataset, type Route,
} from "permit-rulebook-data";
import { audienceNotice, noticesOn, routePage, routePages } from "../src/lib/route-page/route-page.js";
import { esc } from "../src/lib/reason.js";
import { routeAddresses, routePath } from "../src/lib/slug.js";
// The frame round a quote lives with the quote, not with the page that shows
// one: the results card puts the same words round the same sentence.
import { separatorNote } from "../src/lib/quote.js";
import { textOf } from "./text-of.js";

/**
 * A route page holds the dataset's figures and sentences, each as the dataset
 * holds it, and nothing typed beside them.
 */

const ds = dataset as unknown as Dataset;
const pages = routePages(ds);

describe("s6 — one page per route, generated from the dataset", () => {
  it("renders a page for every route, at an address a person can read", () => {
    // 28 since s9: the 23 the product scores, plus the five it quotes, dates
    // and does not score; 29 since s19, when France's researcher card joined
    // the quoted ones. Every one of them is a page like any other.
    expect(pages.length).toBe(29);
    expect(routeAddresses(ds).length).toBe(29);
    const germany = ds.countries.find((c) => c.code === "DE")!;
    const blueCard = germany.routes.find((r) => r.id === "de-blue-card-general")!;
    // The address names the country as a person names it and the route as
    // the authority names it — never the dataset's own keys.
    expect(routePath(germany, blueCard)).toBe("/germany/eu-blue-card-general");
    expect(new Set(pages.map((p) => p.path)).size).toBe(29);
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

  it("every quote is tagged with the language it is in, and framed", () => {
    for (const page of pages) {
      const quotes = [...page.html.matchAll(/<q([^>]*)>/g)].map((m) => m[1]);
      expect(quotes.length, page.path).toBeGreaterThan(0);
      for (const attrs of quotes) expect(attrs, page.path).toMatch(/lang="[a-z]{2}"/);
    }
    // And the frame says which language, in the reader's words.
    const de = pages.find((p) => p.path === "/germany/eu-blue-card-general")!;
    expect(textOf(de.html)).toContain("German, from arbeitsagentur.de.");
    // And it is separated from the date it follows, wherever a quote renders (F2).
    expect(textOf(de.html)).toMatch(/read [0-9]{4}-[0-9]{2}-[0-9]{2} · German, from/);
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
      // Both halves of a statement: its own words, and — where the authority
      // names the passports it does not bind — the carve-out's (s7). A page
      // with no reader shows both, so it holds both.
      for (const st of routeStatements(address.route))
        for (const value of statementSources(st)) held.add(esc(value.quote));
      const notice = audienceNotice(ds);
      if (notice) held.add(esc(notice.source.quote));
      // And every side of a notice the dataset says is about THIS route: the
      // Algerian talent question stands on two authorities disagreeing and on
      // the page that says what the reader gets instead, and all three are
      // printed on the four pages that raise it — a page is never quieter
      // than a card (s8). The scoping is the dataset's, not the page's: a
      // notice held for another route is still a sentence this page may not
      // print.
      for (const n of noticesOn(ds, address.route))
        for (const value of noticeSources(n)) held.add(esc(value.quote));
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
    // On a listed host: a source's host is on a list, or the data gate refuses it (#158).
    if (gte && gte.op === "gte") gte.threshold.source_url = 'https://www.bamf.de/a"b';
    const page = routePage(hostile, routeAddresses(hostile)[0]);
    // The name reaches the attributes escaped, and no bare quote survives inside one.
    for (const attr of [...page.html.matchAll(/(?:href|content|title|aria-label)="([^"]*)"/g)])
      expect(attr[1], attr[0]).not.toContain("<");
    expect(page.html).toContain("&quot;");
    expect(page.html).not.toContain('href="https://www.bamf.de/a"b"');
    expect(page.html).toContain("&lt;b&gt;");
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
