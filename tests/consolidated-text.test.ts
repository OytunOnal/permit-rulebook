import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  CONSOLIDATED_TEXT_HOSTS, deriveQuestions, isScored, routeStatements, scopeLine,
  type Dataset, type Profile, type Route,
} from "permit-rulebook-data";
import { OFFICIAL_PAGE, consolidatedTextOn } from "../src/lib/copy/quotes.js";
import { questionCardHtml } from "../src/lib/question.js";
import { routePage } from "../src/lib/route-page/route-page.js";
import { routeAddresses } from "../src/lib/slug.js";
import type { PageOnSite } from "../scripts/browser/browser.mjs";
import { recordSeedScript, skipReason, warnNotWalked, withSite } from "./browser-walk.js";
import { builtPages } from "./reader-pages.js";
import { blocksIn, drawnRouteOn, verdictFor, verdictOn } from "./verdict-cards.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/**
 * #158 — a link to a consolidated text says so.
 *
 * A quote read at buzer.de is not the authority's page, and its link may not
 * say "Official page". The labels are the copy module's: the authority label,
 * and "Consolidated text on <host>"; the hosts that take the second are the
 * data package's consolidated-text list. Every link a reader page prints to
 * such a host carries that label, and none carries the authority label.
 */

interface Link { href: string; text: string; where: string }

/** The bare host a consolidated-text link names, or undefined for any other link. */
function consolidatedHostOf(href: string): string | undefined {
  let host: string;
  try { host = new URL(href.split("&amp;").join("&")).host; } catch { return undefined; }
  return CONSOLIDATED_TEXT_HOSTS.includes(host) ? host.replace(/^www\./, "") : undefined;
}

/** Every link in a piece of markup, its text with the tags inside it dropped. */
const linksIn = (html: string, where: string): Link[] =>
  [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    href: /href="([^"]*)"/.exec(m[1])?.[1] ?? "", text: m[2].replace(/<[^>]*>/g, ""), where,
  }));

/** The decision, over every link given: the ones to a consolidated text, each
 * carrying its label and not the authority's. Hands back how many it held. */
function checkedConsolidatedLinkCount(links: Link[]): number {
  const held = links.flatMap((l) => {
    const host = consolidatedHostOf(l.href);
    return host ? [{ ...l, host }] : [];
  });
  for (const l of held) {
    expect(l.text, `${l.where}: ${l.href}`).toContain(consolidatedTextOn(l.host));
    expect(l.text, `${l.where}: ${l.href}`).not.toContain(OFFICIAL_PAGE);
  }
  return held.length;
}

const skipped = skipReason();
if (skipped) warnNotWalked("#158's pages", skipped);

describe.skipIf(!existsSync(dist))("every page the build draws", () => {
  it("every link to a consolidated text carries that label, and none the authority's", () => {
    const pages = builtPages();
    expect(pages.length, "no built page").toBeGreaterThan(0);
    const held = checkedConsolidatedLinkCount(pages.flatMap((p) => linksIn(p.html, p.where)));
    // The German statutes are read at buzer.de, so the route pages link there.
    expect(held, "no built page links to a consolidated text").toBeGreaterThan(0);
  });
});

describe("every question card", () => {
  it("a learn link to a consolidated text carries that label, and not the authority's", () => {
    const links = deriveQuestions(ds).flatMap((question) => linksIn(questionCardHtml({
      dataset: ds, question, answers: {}, asked: [], editing: null, total: 10,
    }), question.field));
    // The shortage question's learn link opens the statute at buzer.de.
    expect(checkedConsolidatedLinkCount(links), "no question card links to a consolidated text").toBeGreaterThan(0);
  });
});

describe("a notice that names no page of its own links its source by its kind", () => {
  /** The shipped dataset with one route's notice quoted from a consolidated
   * text and given no learn link: the label must come from the source's host. */
  const datasetWithConsolidatedNotice = (): { dataset: Dataset; route: string } => {
    const altered = JSON.parse(JSON.stringify(ds)) as Dataset;
    const notice = altered.notices!.find((n) => (n.routes ?? []).length > 0)!;
    notice.source.source_url = `https://${CONSOLIDATED_TEXT_HOSTS[0]}/18g_AufenthG.htm`;
    delete notice.learn;
    return { dataset: altered, route: notice.routes![0]! };
  };

  it("on the results card", () => {
    const { dataset: altered } = datasetWithConsolidatedNotice();
    // Every notice the dataset carries, on the verdict of a passport it stands for.
    const links = ["TR", "DZ", "IT"].flatMap((citizenship) =>
      linksIn(verdictOn(altered, { destination: "all", citizenship }).notices, citizenship));
    expect(checkedConsolidatedLinkCount(links)).toBeGreaterThan(0);
  });

  it("on the route page it stands on", () => {
    const { dataset: altered, route } = datasetWithConsolidatedNotice();
    const address = routeAddresses(altered).find((a) => a.route.id === route)!;
    expect(checkedConsolidatedLinkCount(linksIn(routePage(altered, address).html, route))).toBeGreaterThan(0);
  });
});

describe("a card's foot links the route's page by its kind", () => {
  it("on the row of a route the authority closes, where the route's page is a consolidated text", () => {
    // The intra-corporate transfer, closed to an Algerian passport; its page
    // moved, in this written result, to a consolidated-text host.
    const answers: Profile = { destination: "fr", citizenship: "DZ", situation: "ict", situation_country: "fr" };
    const altered = structuredClone(ds);
    altered.countries.flatMap((c) => c.routes).find((x) => x.id === "fr-ict")!.info_url =
      `https://${CONSOLIDATED_TEXT_HOSTS[0]}/21_AufenthG.htm`;
    const html = drawnRouteOn(verdictOn(altered, answers), "fr-ict");
    expect(html, "fr-ict is not closed to this reader").not.toBe("");
    expect(checkedConsolidatedLinkCount(linksIn(html, "fr-ict"))).toBe(1);
  });
});

/**
 * #151's fix round, ruling 1: the words that introduce quotes claim no
 * "official" page where the quotes stand on a consolidated text (GLOSSARY,
 * Consolidated text: "never 'Official page'").
 */
const CLAIMS_OFFICIAL = /\bofficial\b/i;

/** Each caveat a route quotes from a consolidated text. */
const consolidatedCaveats = (route: Route) => routeStatements(route)
  .filter((s) => s.kind === "caveat" && s.source && consolidatedHostOf(s.source.source_url));

describe("no word claims an official page over a consolidated text (#151's fix round, ruling 1)", () => {
  const pages = routeAddresses(ds).map((address) => ({ address, html: routePage(ds, address).html }));
  const quotingConsolidated = pages.filter(({ html }) => linksIn(html, "").some((l) => consolidatedHostOf(l.href)));

  it("a route page that quotes a consolidated text says in its scope paragraph where its quotes come from without 'official'", () => {
    expect(quotingConsolidated.length, "precondition: a route page quotes a consolidated text").toBeGreaterThan(0);
    for (const { address, html } of quotingConsolidated) {
      const section = /<section class="scope"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
      expect(section, `${address.path}: no scope paragraph`).not.toBe("");
      // Our own words in it: without the route's scope line and its authored reason.
      const ours = section.replace(/<[^>]*>/g, " ")
        .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
        .split(address.route.scope.reason).join(" ")
        .split(scopeLine(address.route, { reader: "not-answered" })).join(" ");
      expect(ours, address.path).not.toMatch(CLAIMS_OFFICIAL);
    }
  });

  it("a route page's block of quotes from a consolidated text is headed without 'official'", () => {
    let held = 0;
    for (const { address, html } of quotingConsolidated) {
      const blocks = [...html.matchAll(/<div class="precond"><b>([^<]*)<\/b>/g)];
      blocks.forEach((m, i) => {
        const body = html.slice(m.index!, blocks[i + 1]?.index ?? html.length);
        if (!linksIn(body, "").some((l) => consolidatedHostOf(l.href))) return;
        held++;
        expect(m[1], address.path).not.toMatch(CLAIMS_OFFICIAL);
      });
    }
    expect(held, "precondition: a route page heads a block of consolidated-text quotes").toBeGreaterThan(0);
  });

  it("a results card's caveats quoted from a consolidated text are headed without 'official'", () => {
    // A route the checker quotes but does not score is never a results card.
    const routes = ds.countries.flatMap((c) => c.routes).filter((r) => isScored(r) && consolidatedCaveats(r).length > 0);
    expect(routes.length, "precondition: a route quotes a caveat from a consolidated text").toBeGreaterThan(0);
    // Each card as the verdict of a reader who has answered nothing draws it.
    const blank = verdictFor({});
    for (const route of routes) {
      const heading = /<div class="caveat"><b>([^<]*)<\/b>/.exec(blocksIn(drawnRouteOn(blank, route.id), "caveat"))?.[1];
      expect(heading, route.id).toBeDefined();
      expect(heading, route.id).not.toMatch(CLAIMS_OFFICIAL);
    }
  });
});

/** Deniz, unsure whether his occupation is on Germany's shortage list: his
 * shortage Blue Card is on hold with the learn link to the statute open. */
const UNSURE: Profile = {
  destination: "de", citizenship: "TR", situation: "offer", situation_country: "de", qualification: "degree",
  recognition_de: "recognized", occupation_it: "no", occupation_shortage: "unknown", experience_5y: "lt2",
  experience_7y: "lt3", salary_eur_year: "band_0", german: "none", english: "none", funds_eur_month: "band_0",
  age_band: "a30to35", de_stay6m: "no", partner_ck: "no",
};

const RESULT_LINKS = 'JSON.stringify([...document.querySelectorAll("#main a")].map((a) => ({'
  + ' href: a.getAttribute("href"), text: a.textContent })))';

describe.skipIf(skipped !== null)("the results screen, as drawn", () => {
  it("every link to a consolidated text carries that label, and none the authority's", async () => {
    const seen = await withSite(async ({ page, url }: PageOnSite) => {
      await page.goto(url("/"));
      await page.evaluate(recordSeedScript(UNSURE));
      await page.goto(url("/"));
      return {
        state: await page.evaluate('document.getElementById("app").dataset.state'),
        links: (JSON.parse(await page.evaluate(RESULT_LINKS)) as Link[]).map((l) => ({ ...l, where: "results" })),
        problems: page.problems(),
      };
    }, { viewport: { width: 1100, height: 1200 }, mobile: false });

    expect(seen.problems).toEqual([]);
    expect(seen.state).toBe("results");
    expect(checkedConsolidatedLinkCount(seen.links), "the results screen links to no consolidated text").toBeGreaterThan(0);
  }, 180000);
});
