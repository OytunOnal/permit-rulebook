import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  phraseOf, countryVocabulary, fieldOptions, findTerritory, matchOptions, territoryPhraseAtStartOf, territoryPhraseOf,
  type Dataset,
} from "permit-rulebook-data";
import { NO_COUNTRY_MATCHES, NO_COUNTRY_MATCHES_STATUS, territoryLine } from "../src/lib/copy.js";
import { composeNoMatchLine } from "../src/lib/listbox.js";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";

const ds = dataset as unknown as Dataset;
const passports = fieldOptions(ds, "citizenship");
const dist = fileURLToPath(new URL("../dist", import.meta.url));

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

describe("the passport search's no-match decision", () => {
  it("a territory's name: the territory line, naming its passport's country, and no row", () => {
    const typed = "Puerto Rico";
    expect(matchOptions(passports, typed)).toEqual([]);
    const said = composeNoMatchLine(typed);
    expect(said.line).toBe(expectedTerritoryLine(typed));
    expect(said.line).not.toBe(NO_COUNTRY_MATCHES);
    // The live region reads the same sentence the list shows.
    expect(said.status).toBe(said.line);
  });

  it("an alias: the territory line under the territory's own name, and no row", () => {
    const territory = (countryVocabulary.territories ?? []).find((t) => t.aliases?.length)!;
    const alias = territory.aliases![0];
    expect(matchOptions(passports, alias)).toEqual([]);
    expect(composeNoMatchLine(alias).line).toBe(expectedTerritoryLine(territory.name));
  });

  it("a name that is neither a country nor a territory: today's line, and no row", () => {
    const typed = "Narnia";
    expect(matchOptions(passports, typed)).toEqual([]);
    expect(findTerritory(typed)).toBeUndefined();
    expect(composeNoMatchLine(typed)).toEqual({ line: NO_COUNTRY_MATCHES, status: NO_COUNTRY_MATCHES_STATUS });
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
const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write(`\n  !! THE TERRITORY LINE WAS NOT READ IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  type(text: string): Promise<void>;
  problems(): string[];
}

/** Answers that bring the passport question next. */
const BEFORE_PASSPORT = { destination: "de", situation: "offer", qualification: "degree", occupation_it: "no" };
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LIST = `JSON.stringify({
  rows: document.querySelectorAll("#clist [role=option]").length,
  line: (document.querySelector("#clist .cnone")?.textContent || "").trim(),
  status: (document.getElementById("cstatus")?.textContent || "").trim(),
})`;

describe.skipIf(skipped !== null)("#160 — in the browser at 390×844", () => {
  it("typing \"Puerto Rico\" into the passport search shows the territory line and no row", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 300);
        await page.evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(
          serialize(BEFORE_PASSPORT, Object.keys(BEFORE_PASSPORT)))})`);
        await page.goto(server.url("/"), 900);
        await page.evaluate('document.getElementById("cfilter").focus()');
        await page.type("Puerto Rico");
        await settle(300);
        return { ...JSON.parse(await page.evaluate(LIST)), problems: page.problems() };
      }, { viewport: { width: 390, height: 844 }, mobile: true }) as { rows: number; line: string; status: string; problems: string[] };

      expect(seen.problems).toEqual([]);
      expect(seen.rows).toBe(0);
      expect(seen.line).toBe(expectedTerritoryLine("Puerto Rico"));
      expect(seen.status).toBe(seen.line);
    } finally {
      server.close();
    }
  }, 120000);
});
