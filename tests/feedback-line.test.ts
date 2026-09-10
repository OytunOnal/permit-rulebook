import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { feedbackLineHtml } from "../src/lib/card.js";
import { NEW_NEED_URL, TRACKER_URL } from "../src/lib/site.js";

/**
 * The results screen says where a disagreement goes.
 *
 * A reader suggested a prompt — something that opens, or an icon always on
 * screen (relayed by the human, site #6). Two shapes that open were drawn and
 * neither survived. What ships is a line at the end of the answer: nothing
 * opens, nothing is dismissed, nothing is remembered on the device, and the
 * product still has not interrupted anybody.
 */
const page = readFileSync(fileURLToPath(new URL("../src/pages/index.astro", import.meta.url)), "utf8");

describe("the line that says where a disagreement goes", () => {
  const html = feedbackLineHtml();

  it("names both doors, and where each one leads", () => {
    expect(html).toContain(TRACKER_URL);
    expect(html).toContain(NEW_NEED_URL);
    expect(html).toContain("report a wrong value");
    expect(html).toContain("suggest a change");
  });

  it("says the account requirement out loud, before the click", () => {
    // A link that ends at a login screen is a trap rather than a door
    // (site #7 — this line does not close it, it stops it surprising anyone).
    expect(html).toContain("Both open GitHub, where filing needs an account.");
  });

  it("opens nothing, remembers nothing, and asks for no opinion", () => {
    expect(html).not.toMatch(/dialog|modal|popup|localStorage|setTimeout/i);
    // No rating, no "how are we doing": the two things the product can act on
    // are a wrong value and a missing capability, and it asks for those.
    expect(html).not.toMatch(/rate|rating|star|feedback\?|how (was|did)/i);
  });

  it("is one paragraph, and every link leaves safely", () => {
    expect((html.match(/<p /g) ?? []).length).toBe(1);
    for (const anchor of html.match(/<a [^>]*>/g) ?? []) {
      expect(anchor, anchor).toContain('target="_blank"');
      expect(anchor, anchor).toContain('rel="noopener"');
    }
  });

  it("the page calls it on both layouts — one country and several", () => {
    // A block the page forgets to call is a block that does not exist (s5e).
    expect((page.match(/feedbackLineHtml\(\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("is on the results screen only — never beside a question", () => {
    // The moment it belongs to is the one where the reader has an answer to
    // disagree with; the interview is not that moment.
    const questions = page.slice(page.indexOf("function renderQuestion"), page.indexOf("function renderResults"));
    expect(questions).not.toContain("feedbackLineHtml");
  });
});
