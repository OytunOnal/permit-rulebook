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
 *
 * The words changed in s23: "(§ 18d, section 18d)" restated the citation and
 * read as a stutter on whichever heading it landed on (v1.1 gate critique,
 * P1); the gloss then explained the sign — "§ = section" — once per page. And
 * they went in s32's amendment 6 (the human's walk, 2026-09-18): the sign is
 * read as a reader reads it, and carries no explainer anywhere. What a
 * citation still explains, on first use, is the act it names — in its own
 * form, in its own bracket, the number standing once in the citation.
 */

/** The words that are gone (amendment 6) — pinned absent, never present. */
const RETIRED_EXPLAINER = "§ = section";

const dist = fileURLToPath(new URL("../dist", import.meta.url));

describe("the section sign carries no explainer; the act it names is said once per page", () => {
  it("a citation naming no act is left exactly as written, first use or not", () => {
    // Amendment 6: "Researcher (§ 18d; § = section)" until the human's walk;
    // the sign is read as a reader reads it.
    const seen: Glossary = new Set();
    expect(glossed("Researcher (§ 18d)", seen)).toBe("Researcher (§ 18d)");
    expect(glossed("Skilled worker — academic (§ 18b)", seen)).toBe("Skilled worker — academic (§ 18b)");
    expect(glossed("Skilled worker — academic (§ 18b)", new Set())).toBe("Skilled worker — academic (§ 18b)");
    expect(glossSection("§ 18d states it", new Set())).toBe("§ 18d states it");
    expect(glossSection("Opportunity Card (Chancenkarte, § 20a)", new Set())).toBe("Opportunity Card (Chancenkarte, § 20a)");
    // And nothing is spent by it: no key for the sign exists any more.
    expect(seen.size).toBe(0);
  });

  it("says the act where the citation names one, in the citation's own bracket, without the sign's words", () => {
    const seen: Glossary = new Set();
    expect(glossed("§ 18g AufenthG", seen)).toBe("§ 18g AufenthG (AufenthG = the Residence Act)");
    // And does not then explain AufenthG a second time.
    expect(glossed("§ 18g AufenthG", seen)).toBe("§ 18g AufenthG");
    expect(glossed("§ 6 BeschV", new Set())).toBe("§ 6 BeschV (BeschV = the Employment Ordinance)");
    // Inside a name's own bracket the words follow the citation there.
    expect(glossSection("Card (§ 6 BeschV)", new Set())).toBe("Card (§ 6 BeschV; BeschV = the Employment Ordinance)");
    for (const text of ["§ 18g AufenthG", "§ 6 BeschV", "Card (§ 6 BeschV)"])
      expect(glossed(text, new Set()), text).not.toContain(RETIRED_EXPLAINER);
  });

  it("expands nothing inside a citation, and a run of several sections is left whole", () => {
    // A route is known by its name, and a citation is a string a person pastes
    // into a search box: "§ 19c / § 6 BeschV" has to survive whole (Spec
    // review, 2026-09-08; it used to cut the run in half). The act is named
    // only where one section cites it; a run of several adds nothing and
    // leaves the act for the prose after it.
    expect(glossSection("Experienced worker (§ 19c / § 6 BeschV)", new Set()))
      .toBe("Experienced worker (§ 19c / § 6 BeschV)");
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
    expect(glossed("ICT Card — intra-corporate transfer (§ 19)", seen)).toBe("ICT Card — intra-corporate transfer (§ 19)");
  });
});

/** And the results card carries the sign bare, in the route names that cite it. */
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
    `  !! THE SECTION SIGN WAS NOT SEEN ON THE RESULTS CARD: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join("\n"));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

/** A German profile that opens German routes, so the cards carry § names.
 * A real passport: the record keeps only answers a question offers (s25), and
 * the class the rules reason with was never one (Spec review, 2026-09-08). */
const GERMAN = {
  destination: "de", citizenship: "IN", situation: "offer",
  qualification: "degree", recognition_de: "recognized", occupation_shortage: "yes",
  experience_5y: "2plus", experience_7y: "3to5", german: "b1", funds_eur_month: "band_1", salary_eur_year: "band_4",
};

describe.skipIf(skipped !== null)("the results card carries the sign without an explainer", () => {
  it("prints the § names bare — no explainer, no number restated (amendment 6)", async () => {
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
      // The explainer read once per screen from s23 to s32's amendment 6;
      // the sign is read as a reader reads it now.
      expect(text).not.toContain(RETIRED_EXPLAINER);
      expect(text).not.toMatch(/section [0-9]/);
      expect(text).not.toMatch(/\(§ [0-9]+[a-z]? \(section/);
    } finally {
      server.close();
    }
  }, 180000);
});
