import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  criterionPhrase, evaluate, isLocalization,
  type Criterion, type Dataset, type Profile, type Route,
} from "permit-rulebook-data";
import { ANY_PATH, EITHER_PATH } from "../src/lib/copy/route-page.js";
import { routePage } from "../src/lib/route-page.js";
import { routeAddresses } from "../src/lib/slug.js";
import { DESK, type BrowserPage } from "../scripts/browser/browser.mjs";
import { recordSeedScript, skipReason, warnNotWalked, withSite } from "./browser-walk.js";
import { walkFrom } from "./reader-pages.js";
import { PAINTED_AS_COMPOSED, everyDrawnRouteIn, paintedAsComposedScript, verdictFor } from "./verdict-cards.js";

/**
 * #155 (rulings 12–13 of #92): a criterion with paths is named by its own
 * label, capitalised at a heading's start, and its card lists each path on a
 * line of its own under the path's label. A results card names it by the same
 * label. The labels are the dataset's; the lead-in is the copy module's.
 */

const ds = dataset as unknown as Dataset;
type Disjunction = Extract<Criterion, { op: "any" }>;

const SHORTAGE = "de-blue-card-shortage";
const capitalised = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const unescaped = (html: string): string =>
  html.replace(/<[^>]*>/g, "").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();

/** A criterion that names a figure is headed by the fact it measures. */
function statesFigure(c: Criterion): boolean {
  let found = false;
  const look = (x: Criterion) => {
    if (x.op === "gte" || x.op === "points") found = true;
    if (x.op === "any") for (const p of x.paths) p.criteria.forEach(look);
  };
  look(c);
  return found;
}

/** The criteria with paths a route's page draws as cards of their own. */
const criteriaWithPathsOf = (route: Route): Disjunction[] =>
  route.criteria.filter((c): c is Disjunction => c.op === "any" && !isLocalization(c));

/** Each rule card on a rendered route page: its heading, and its markup. */
function ruleCards(html: string): { heading: string; html: string }[] {
  return html.split('<article class="rule">').slice(1).map((part) => {
    const card = part.slice(0, part.indexOf("</article>"));
    return { heading: unescaped(/<h2>([\s\S]*?)<\/h2>/.exec(card)?.[1] ?? ""), html: card };
  });
}

const pageOf = (routeId: string): string => {
  const address = routeAddresses(ds).find((a) => a.route.id === routeId);
  if (!address) throw new Error(`precondition: ${routeId} has a page`);
  return routePage(ds, address).html;
};

describe("#155 a criterion with paths on its route page", () => {
  it("every such card is headed by the criterion's label, capitalised, where it names no figure", () => {
    let seen = 0;
    for (const { route } of routeAddresses(ds))
      for (const c of criteriaWithPathsOf(route).filter((x) => !statesFigure(x))) {
        seen++;
        const headings = ruleCards(pageOf(route.id)).map((card) => card.heading);
        expect(headings, `${route.id}: ${c.label}`).toContain(capitalised(c.label));
      }
    expect(seen, "precondition: some page draws a criterion with paths").toBeGreaterThan(0);
  });

  it("the shortage route's card is headed by its label and lists one line per path under the path's label", () => {
    const route = routeAddresses(ds).find((a) => a.route.id === SHORTAGE)!.route;
    const [choice] = criteriaWithPathsOf(route).filter((c) => !statesFigure(c));
    expect(choice, "precondition: the shortage route carries its degree-or-IT criterion").toBeDefined();
    const card = ruleCards(pageOf(SHORTAGE)).find((x) => x.heading === capitalised(choice!.label));
    expect(card, "no card is headed by the criterion's label").toBeDefined();
    expect(unescaped(/<p class="plain">([\s\S]*?)<\/p>/.exec(card!.html)?.[1] ?? "")).toBe(EITHER_PATH);
    const lines = [...card!.html.matchAll(/<ul class="paths">([\s\S]*?)<\/ul>/g)]
      .flatMap((m) => [...m[1]!.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((li) => unescaped(li[1]!)));
    expect(lines).toHaveLength(choice!.paths.length);
    choice!.paths.forEach((path, i) => {
      expect(lines[i]!.startsWith(`${capitalised(path.label)}: `), lines[i]).toBe(true);
      for (const pc of path.criteria) expect(lines[i]).toContain(criterionPhrase(ds, pc));
    });
  });

  it("a criterion with more than two paths is not introduced as 'either'", () => {
    let seen = 0;
    for (const { route } of routeAddresses(ds))
      for (const c of criteriaWithPathsOf(route).filter((x) => x.paths.length > 2)) {
        seen++;
        const card = ruleCards(pageOf(route.id)).find((x) => x.html.includes('<ul class="paths">') &&
          c.paths.every((p) => x.html.includes(`<li>${capitalised(p.label)}: `)));
        expect(card, `${route.id}: ${c.label}`).toBeDefined();
        expect(card!.html, `${route.id}: ${c.label}`).toContain(`<p class="plain">${ANY_PATH}</p>`);
      }
    expect(seen, "precondition: some page draws a criterion with three paths").toBeGreaterThan(0);
  });
});

/** A reader for whom no path of the shortage card's degree-or-IT criterion is
 * open: no qualification and no IT work. Every other question the interview
 * would ask takes its first option, so the record lands on the verdict. */
function readerFailingEveryPath(): Profile {
  const start: Profile = {
    destination: "de", citizenship: "IN", situation: "offer", qualification: "none", occupation_it: "no",
  };
  return walkFrom(start, (q) => q.options[0]!.value).answers;
}

describe("#155 a results card names a failed criterion with paths by its label, from the verdict", () => {
  it("the shortage card's verdict line, for a reader no path is open to, says the criterion's label", () => {
    const reader = readerFailingEveryPath();
    const result = evaluate(ds, reader).find((r) => r.route.id === SHORTAGE)!;
    const choice = result.criteria.find((cr) => cr.criterion.op === "any" && !isLocalization(cr.criterion))!;
    expect(choice.outcome, "precondition: the criterion fails").toBe("fail");
    expect(choice.path, "precondition: no path decided it").toBeUndefined();
    const label = (choice.criterion as Disjunction).label;
    const name = result.route.name.split(" (")[0]!;

    // Each card the verdict draws whose title names the route, and its
    // verdict line: a row's reason, or a card's sentence under its title.
    const lines = everyDrawnRouteIn(verdictFor(reader))
      .filter((c) => unescaped(/<(?:h3|span class="hold-name")>([\s\S]*?)<\/(?:h3|span)>/.exec(c.html)?.[1] ?? "").includes(name))
      .map((c) => unescaped(/<(?:span class="hold-why"|p class="why")>([\s\S]*?)<\/(?:span|p)>/.exec(c.html)?.[1] ?? ""));
    expect(lines, "the shortage card is not on the results").toHaveLength(1);
    expect(lines[0]).toContain(label);
  });
});

const skipped = skipReason();
if (skipped) warnNotWalked("#155's results card", skipped);

describe.skipIf(skipped !== null)("#155 a results card names a failed criterion with paths by its label", () => {
  it("the shortage card's verdict line, for a reader no path is open to, says the criterion's label", async () => {
    // The card and its line are the verdict's (the case above); the page
    // paints the verdict the reader's record composes.
    const reader = readerFailingEveryPath();
    const seen = await withSite(async ({ page, url }: { page: BrowserPage; url: (p: string) => string }) => {
      await page.goto(url("/404.html"));
      await page.evaluate(recordSeedScript(reader));
      await page.goto(url("/"));
      return {
        state: await page.evaluate('document.getElementById("app").dataset.state'),
        painted: JSON.parse(await page.evaluate(paintedAsComposedScript(verdictFor(reader)))),
      };
    }, DESK) as { state: string; painted: typeof PAINTED_AS_COMPOSED };

    expect(seen.state).toBe("results");
    expect(seen.painted).toEqual(PAINTED_AS_COMPOSED);
  }, 120000);
});
