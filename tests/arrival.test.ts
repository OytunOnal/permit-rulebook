import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { deriveBands, evaluate } from "permit-rulebook-data";
import {
  arrivalFrom, countryArrivalFrom, destinationFor, destinationForCountry, rescopedFor,
} from "../src/lib/scope.js";
import { RECORD_VERSION, serialize } from "../src/lib/record.js";
import type { Dataset, Profile } from "permit-rulebook-data";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/**
 * A reader who has answered before, arriving from a country or a route page.
 *
 * The pre-scoped "Check yours" is the one call to action on 27 of the 29 pages,
 * and for anyone with a saved record it was dead: `/?country=fr` rendered the
 * German answers unchanged, with the word France nowhere on the screen
 * (isolated v1-gate critique, 2026-09-08, B2). "A link is not louder than a
 * declaration" was the old rule; it is louder than a STALE one, which is what a
 * record for another country becomes the moment the reader asks about this one.
 */
const germanRecord: Profile = {
  destination: "de", citizenship: "IN", situation: "offer", qualification: "degree",
  recognition_de: "recognized", occupation_shortage: "yes", experience: "y3in7",
  // band_5 on the pooled ladder = €45,934.20 – under €50,700.
  salary_eur_year: "band_5", german: "b1", english: "c1", funds_eur_month: "band_1",
};

describe("an arrival that names a country re-scopes the record", () => {
  it("the country in the link replaces the destination on the record", () => {
    expect(destinationForCountry(countryArrivalFrom(ds, "?country=fr"), germanRecord)).toBe("fr");
    expect(destinationFor(arrivalFrom(ds, "?route=fr-talent-blue-card"), germanRecord)).toBe("fr");
    // Nothing to re-scope when the reader is already there.
    expect(destinationForCountry(countryArrivalFrom(ds, "?country=de"), germanRecord)).toBe("de");
  });

  it("every other answer is kept, amounts included", () => {
    const moved = rescopedFor(ds, "fr", germanRecord);
    expect(moved.answers).toEqual({ ...germanRecord, destination: "fr" });
    expect(moved.changed).toBe(true);
    // The ladder is one pooled list for all four countries (human ruling,
    // 2026-09-08), so the band she declared names the same euros in France.
    const bands = deriveBands(ds, "salary_eur_year");
    expect(bands.find((b) => b.id === moved.answers["salary_eur_year"])!.label)
      .toBe("€45,934.20 – under €50,700");
    // And the French verdicts are French: no German route survives the switch.
    expect(evaluate(ds, moved.answers).filter((r) => r.status !== "hold").every((r) => r.country === "FR"))
      .toBe(true);
  });

  it("arriving where the record already is changes nothing", () => {
    const moved = rescopedFor(ds, "de", germanRecord);
    expect(moved.changed).toBe(false);
    expect(moved.answers).toEqual(germanRecord);
  });

  it("the stored record keeps its version: nothing about what an answer means moved", () => {
    // The ladder is the one it always was, so a record written yesterday still
    // names the amounts it named. Seeded from the module's own constant, so a
    // future format change cannot leave these tests reading a dead contract.
    expect(JSON.parse(serialize({ destination: "de" }, ["destination"])).version).toBe(RECORD_VERSION);
  });
});

const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

const SEED = `localStorage.setItem("permit-rulebook.record.v1", ${
  JSON.stringify(serialize(germanRecord, Object.keys(germanRecord)))})`;

/**
 * The page's own call to action, not the header's: both say "Check yours", and
 * the header's is the unscoped one.
 */
const CLICK_CHECK_YOURS = '(() => { const a = [...document.querySelectorAll("a")]'
  + '.find((x) => /[?](country|route)=/.test(x.getAttribute("href") || ""));'
  + ' if (!a) throw new Error("no pre-scoped call to action on this page");'
  + ' a.click(); return a.getAttribute("href"); })()';

describe.skipIf(skipped !== null)("the walk the critique took, with a record in the browser", () => {
  it("a German record, /france/, Check yours: French verdicts and a line saying so", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/france/"), 500);
        await page.evaluate(SEED);
        await page.evaluate(CLICK_CHECK_YOURS);
        await new Promise((r) => setTimeout(r, 1500));
        return page.evaluate(
          'JSON.stringify({ url: location.search,'
          + ' countries: [...document.querySelectorAll("#main .country")].map((c) => c.textContent.trim()),'
          + ' recorded: [...document.querySelectorAll(".recorded")].map((p) => p.textContent.trim()),'
          + ' text: (document.getElementById("main").textContent || "").split(/\\s+/).join(" ").slice(0, 300) })',
        );
      }, { viewport: { width: 1100, height: 1000 }, mobile: false }) as string) as
        { url: string; countries: string[]; recorded: string[]; text: string };

      expect(seen.url).toBe("?country=fr");
      // Not one German verdict on a screen the reader asked about France.
      expect(seen.countries.filter((c) => /German/i.test(c)), seen.countries.join(" | ")).toEqual([]);
      expect(seen.recorded.join(" "), seen.text).toContain("France");
    } finally {
      server.close();
    }
  }, 180000);

  it("a route arrival scrolls to that route's card and marks it", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/germany/researcher/"), 500);
        await page.evaluate(SEED);
        await page.evaluate(CLICK_CHECK_YOURS);
        await new Promise((r) => setTimeout(r, 1800));
        return page.evaluate(
          '(() => { const el = document.querySelector("[data-came-from]");'
          + ' const r = el ? el.getBoundingClientRect() : null;'
          + ' const open = el ? [...document.querySelectorAll("details")]'
          + '   .filter((d) => d.contains(el)).every((d) => d.open) : false;'
          + ' return JSON.stringify({ found: !!el,'
          + '   name: el ? (el.textContent || "").split(/\\s+/).join(" ").slice(0, 80) : "",'
          + '   inView: r ? r.top > -240 && r.top < window.innerHeight : false, open,'
          + '   marked: el ? (el.textContent || "").includes("came from") : false }); })()',
        );
      }, { viewport: { width: 1100, height: 1000 }, mobile: false }) as string) as
        { found: boolean; name: string; inView: boolean; open: boolean; marked: boolean };

      expect(seen.found, "no card is marked as the one the reader came from").toBe(true);
      expect(seen.name).toContain("Researcher");
      expect(seen.open, "the group holding it is still collapsed").toBe(true);
      expect(seen.inView, `the card is out of view: ${seen.name}`).toBe(true);
      expect(seen.marked, seen.name).toBe(true);
    } finally {
      server.close();
    }
  }, 180000);
});
