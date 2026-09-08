import { describe, expect, it } from "vitest";
import { RECORD_VERSION } from "../src/lib/record.js";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type Glossary, glossSection, glossed } from "../src/lib/gloss.js";

/**
 * A reader on a phone asked what "§" means (human walk, 2026-09-08).
 *
 * It is in the name of every German route, so it reaches a stranger on the
 * results card before any prose does — and the card is the screen most readers
 * see first. One first use per screen says it in words; after that the short
 * form stands, because a name repeated with its gloss stops being a name.
 */

const dist = fileURLToPath(new URL("../dist", import.meta.url));

describe("the section symbol is said in words, once per page", () => {
  it("glosses the first citation and leaves the rest short", () => {
    const seen: Glossary = new Set();
    expect(glossed("Researcher (§ 18d)", seen)).toBe("Researcher (§ 18d, section 18d)");
    // Second use on the same page: untouched.
    expect(glossed("Skilled worker — academic (§ 18b)", seen))
      .toBe("Skilled worker — academic (§ 18b)");
    // A fresh page says it again.
    expect(glossed("Skilled worker — academic (§ 18b)", new Set()))
      .toBe("Skilled worker — academic (§ 18b, section 18b)");
  });

  it("says the act in the same breath where the citation names one", () => {
    const seen: Glossary = new Set();
    expect(glossed("§ 18g AufenthG", seen)).toBe("§ 18g AufenthG (section 18g of the Residence Act)");
    // And does not then explain AufenthG a second time.
    expect(glossed("§ 18g AufenthG", seen)).toBe("§ 18g AufenthG");
    expect(glossed("§ 6 BeschV", new Set())).toBe("§ 6 BeschV (section 6 of the Employment Ordinance)");
  });

  it("expands nothing but the symbol in a name, and never inside the citation", () => {
    // A route is known by its name, and a citation is a string a person pastes
    // into a search box: "§ 19c / § 6 BeschV" has to survive whole. The words
    // follow the whole run, and name every section in it (Spec review,
    // 2026-09-08; it used to cut the run in half).
    expect(glossSection("Experienced worker (§ 19c / § 6 BeschV)", new Set()))
      .toBe("Experienced worker (§ 19c / § 6 BeschV; sections 19c and 6)");
    // One citation in the bracket keeps the shorter form.
    expect(glossSection("Opportunity Card (Chancenkarte, § 20a)", new Set()))
      .toBe("Opportunity Card (Chancenkarte, § 20a, section 20a)");
    // Outside a bracket the gloss brings its own.
    expect(glossSection("§ 18d states it", new Set())).toBe("§ 18d (section 18d) states it");
    // And the citation itself is untouched in every case.
    for (const name of [
      "Experienced worker (§ 19c / § 6 BeschV)",
      "Opportunity Card (Chancenkarte, § 20a)",
      "Skilled worker — academic (§ 18b)",
    ])
      expect(glossSection(name, new Set()), name).toContain(name.slice(name.indexOf("§"), name.indexOf(")")));
  });

  it("leaves text with no citation alone", () => {
    const seen: Glossary = new Set();
    expect(glossed("EU Blue Card — general", seen)).toBe("EU Blue Card — general");
    // Nothing was spent, so the next line still gets its gloss.
    expect(glossed("ICT Card — intra-corporate transfer (§ 19)", seen))
      .toBe("ICT Card — intra-corporate transfer (§ 19, section 19)");
  });
});

/** And the results card actually says it, where a route name is the first use. */
const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE SECTION GLOSS WAS NOT SEEN ON THE RESULTS CARD: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join("\n"));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

/** A German profile that opens German routes, so the cards carry § names. */
const GERMAN = {
  destination: "de", citizenship: "third_country", situation: "offer",
  qualification: "degree", recognition_de: "recognized", occupation_shortage: "yes",
  experience: "y2in5", german: "b1", funds_eur_month: "band_1", salary_eur_year: "band_4",
};

describe.skipIf(skipped !== null)("the results card explains it too", () => {
  it("glosses the first § the screen shows, in the route name it appears in", async () => {
    const server = await serve(dist);
    try {
      const text = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 300);
        await page.evaluate(`localStorage.setItem("permit-rulebook.record.v1", ${
          JSON.stringify(JSON.stringify({
            version: RECORD_VERSION, answers: GERMAN, history: Object.keys(GERMAN),
          }))})`);
        await page.goto(server.url("/"), 1400);
        return page.evaluate('document.querySelector("#app").innerText');
      }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as string;

      expect(text, "no German route name reached the card").toContain("§ 18");
      const glosses = text.match(/section [0-9]+[a-z]?/g) ?? [];
      expect(glosses.length, `glosses seen: ${glosses.join(", ")}`).toBe(1);
      // It lands in a route name, on the first § the screen shows.
      const at = text.indexOf(glosses[0]!);
      expect(text.slice(0, at).split("§").length - 1, "a bare § came first").toBe(1);
      expect(text.slice(at - 14, at)).toContain("§ ");
      // The name's own brackets are not doubled to hold it.
      expect(text).not.toMatch(/\(§ [0-9]+[a-z]? \(section/);
    } finally {
      server.close();
    }
  }, 180000);
});
