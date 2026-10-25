import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  phraseOf, countryVocabulary, fieldOptions, findTerritory, matchOptions, territoryPhraseAtStartOf, territoryPhraseOf,
  type Dataset,
} from "permit-rulebook-data";
import { NO_COUNTRY_MATCHES, NO_COUNTRY_MATCHES_STATUS, territoryLine } from "../src/lib/copy/interview.js";
import { countrySearchOf } from "../src/lib/country-search/index.js";
import {
  PHONE, recordSeedScript, skipReason, warnNotWalked, withSite, type BrowserPage, type PageOnSite,
} from "./browser-walk.js";

const ds = dataset as unknown as Dataset;
const passports = fieldOptions(ds, "citizenship");

/**
 * #160 — a territory typed in the passport search names its passport.
 *
 * A dependent territory is no row of the list: its people hold the passport of
 * the country it belongs to. When what the reader typed is a territory's name
 * or alias, the search's no-match line says whose passport that is, in the
 * copy module's template and the dataset's names; anything else that matches
 * nothing keeps the line that says how to search. No row matches either way.
 */

/** The line the search should draw for a territory, from the dataset's names. */
const expectedTerritoryLine = (typed: string): string => {
  const found = findTerritory(typed)!;
  return territoryLine(
    { atStart: territoryPhraseAtStartOf(found.territory), inSentence: territoryPhraseOf(found.territory) },
    phraseOf(found.country.code), found.country.name,
  );
};

/** What the passport search draws for `typed`: its rows, the line the list
 * shows in their place, and what the live region reads. */
function searchFor(typed: string) {
  const view = countrySearchOf(passports, { chosen: undefined, classed: null }, () => {}).typeQuery(typed);
  return {
    rows: (view.listHtml.match(/role="option"/g) ?? []).length,
    line: view.listHtml.replace(/<[^>]*>/g, ""),
    status: view.status,
  };
}

describe("the passport search's no-match decision", () => {
  it("a territory's name: the territory line, naming its passport's country, and no row", () => {
    const typed = "Puerto Rico";
    expect(matchOptions(passports, typed)).toEqual([]);
    const said = searchFor(typed);
    expect(said.rows).toBe(0);
    expect(said.line).toBe(expectedTerritoryLine(typed));
    expect(said.line).not.toBe(NO_COUNTRY_MATCHES);
    // The live region reads the same sentence the list shows.
    expect(said.status).toBe(said.line);
  });

  it("an alias: the territory line under the territory's own name, and no row", () => {
    const territory = (countryVocabulary.territories ?? []).find((t) => t.aliases?.length)!;
    const alias = territory.aliases![0];
    expect(matchOptions(passports, alias)).toEqual([]);
    expect(searchFor(alias)).toMatchObject({ rows: 0, line: expectedTerritoryLine(territory.name) });
  });

  it("a name that is neither a country nor a territory: today's line, and no row", () => {
    const typed = "Narnia";
    expect(matchOptions(passports, typed)).toEqual([]);
    expect(findTerritory(typed)).toBeUndefined();
    expect(searchFor(typed)).toEqual({ rows: 0, line: NO_COUNTRY_MATCHES, status: NO_COUNTRY_MATCHES_STATUS });
  });

  it("the template reads no country's or territory's name of its own", () => {
    const line = territoryLine({ atStart: "T1", inSentence: "t1" }, "c1", "C1");
    const names = [
      ...passports.flatMap((o) => [o.label, ...(o.aliases ?? [])]),
      ...(countryVocabulary.territories ?? []).flatMap((t) => [t.name, ...(t.aliases ?? [])]),
    ];
    for (const name of names) expect(line, name).not.toContain(name);
  });
});

/**
 * The browser: a reader at the passport question types "Puerto Rico" with
 * the keyboard and reads the territory's line, with no row under it.
 */
const skipped = skipReason();
if (skipped) warnNotWalked("the territory line in a browser", skipped);

/** Answers that bring the passport question next. */
const BEFORE_PASSPORT = { destination: "de", situation: "offer", qualification: "degree", occupation_it: "no" };
const LIST = `JSON.stringify({
  query: document.getElementById("cfilter")?.value ?? "",
  rows: document.querySelectorAll("#clist [role=option]").length,
  line: (document.querySelector("#clist .cnone")?.textContent || "").trim(),
  status: (document.getElementById("cstatus")?.textContent || "").trim(),
})`;
interface Listed { query: string; rows: number; line: string; status: string }

/** The list once the search has drawn its line for `typed`. */
async function listFor(page: BrowserPage, typed: string): Promise<Listed> {
  const drawn = `(() => {
    const listed = JSON.parse(${LIST});
    return listed.query === ${JSON.stringify(typed)} && listed.line ? JSON.stringify(listed) : false;
  })()`;
  return JSON.parse(String(await page.waitUntil(drawn, `the search drew no line for "${typed}"`))) as Listed;
}

describe.skipIf(skipped !== null)("#160 — in the browser at 390×844", () => {
  it("typing \"Puerto Rico\" into the passport search shows the territory line and no row", async () => {
    const seen = await withSite(async ({ page, url }: PageOnSite) => {
      await page.goto(url("/"));
      await page.evaluate(recordSeedScript(BEFORE_PASSPORT));
      await page.goto(url("/"));
      await page.evaluate('document.getElementById("cfilter").focus()');
      await page.type("Puerto Rico");
      return { ...(await listFor(page, "Puerto Rico")), problems: page.problems() };
    }, PHONE);

    expect(seen.problems).toEqual([]);
    expect(seen.rows).toBe(0);
    expect(seen.line).toBe(expectedTerritoryLine("Puerto Rico"));
    expect(seen.status).toBe(seen.line);
  }, 120000);
});
