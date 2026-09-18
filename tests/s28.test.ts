import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { deriveQuestions, evaluate, type Dataset, type Profile } from "permit-rulebook-data";
import { learnBoxHtml } from "../src/lib/card.js";
import { questionCardHtml } from "../src/lib/question.js";
import { RECORD_VERSION } from "../src/lib/record.js";
import { esc, escAttr } from "../src/lib/reason.js";
import { routePages } from "../src/lib/route-page.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/**
 * s28 — a learn link says what the reader does there (v1.2 fix from the
 * human's walk, 2026-09-17).
 *
 * The dataset's `learn` label is the text of a link on three surfaces: under
 * the question, in the result card's box, on the route page. Two of the three
 * glossed it, so the shortage link read "§ 18g AufenthG (§ = section;
 * AufenthG = the Residence Act) lists …" — an explainer inside a link,
 * (the sign's own words have since gone everywhere, s32 amendment 6; what
 * these cases hold is that a link is never glossed, so the absence pinned
 * below is the act's expansion)
 * underlined end to end. The labels are the data's (their own test holds them
 * to the contract); what the site decides is that link text is never glossed
 * and that the three surfaces agree.
 */

/** The shortage field: the one door whose label carried the symbol. */
const SHORTAGE = "occupation_shortage";

/** A label that would be glossed if anything still glossed it. */
const SYMBOL_LABEL = "§ 18g AufenthG lists the shortage groups";
/** What glossing the label would add — the act on first use (the sign's own
 * explainer is gone from every screen since s32's amendment 6). */
const ACT_EXPANSION = "AufenthG = the Residence Act";

/** The dataset with one door's label swapped: the decision is about the
 * renderer, not about the words the data ships today. */
const withLabel = (field: string, label: string): Dataset => ({
  ...ds,
  fields: ds.fields.map((f) => (f.id === field && f.learn ? { ...f, learn: { ...f.learn, label } } : f)),
});

/** Deniz with the shortage question answered "I don't know": the box on the
 * shortage Blue Card carries that door and no other. */
const UNSURE: Profile = {
  destination: "de", citizenship: "TR", situation: "offer", situation_country: "de", qualification: "degree",
  recognition_de: "recognized", occupation_shortage: "unknown", experience_5y: "lt2", salary_eur_year: "band_0",
  german: "none", english: "none", funds_eur_month: "band_0",
};

/** Every link in a piece of markup: where it goes and the text between its tags. */
const anchorsOf = (html: string): { href: string; text: string }[] =>
  [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    href: /href="([^"]*)"/.exec(m[1])?.[1] ?? "", text: m[2],
  }));

describe("2 — link text is never glossed", () => {
  it("the card's box prints a label carrying the symbol verbatim, on a screen that has explained nothing", () => {
    const seen = withLabel(SHORTAGE, SYMBOL_LABEL);
    const result = evaluate(seen, UNSURE).find((r) => r.route.id === "de-blue-card-shortage")!;
    const html = learnBoxHtml(seen, result, UNSURE);
    const [link, ...rest] = anchorsOf(html);
    expect(rest, "the box carries more than the one door").toEqual([]);
    expect(link.text).toBe(esc(SYMBOL_LABEL));
    expect(html).not.toContain(ACT_EXPANSION);
  });

  it("the question line prints the same label verbatim", () => {
    const seen = withLabel(SHORTAGE, SYMBOL_LABEL);
    const question = deriveQuestions(seen).find((q) => q.field === SHORTAGE)!;
    const html = questionCardHtml({
      dataset: seen, question, answers: {}, asked: [], editing: null, total: 10,
    });
    const line = /<p class="qlearn">([\s\S]*?)<\/p>/.exec(html);
    expect(line, "no help line under the shortage question").not.toBeNull();
    const [link, ...rest] = anchorsOf(line![1]);
    expect(rest).toEqual([]);
    expect(link.text).toBe(esc(SYMBOL_LABEL));
    expect(html).not.toContain(ACT_EXPANSION);
  });
});

describe("3 — the three surfaces agree", () => {
  const doors = ds.fields.flatMap((f) => (f.learn ? [{ field: f.id, ...f.learn }] : []));
  const pages = routePages(ds, "1970-01-01");

  it("there are doors to agree on", () => {
    expect(doors.length).toBeGreaterThan(0);
  });

  /** Every "What the checker asks" block on every route page — the block's
   * own links only: a route's "Official page" may share a door's address, and
   * that link is the route's, not the door's. */
  const asks = pages.flatMap((p) =>
    [...p.html.matchAll(/<div class="asks">([\s\S]*?)<\/div>/g)].map((m) => ({ path: p.path, html: m[1] })));

  for (const door of doors) {
    it(`${door.field}: the question line and every route page that asks it carry one label and one href`, () => {
      const question = deriveQuestions(ds).find((q) => q.field === door.field)!;
      const qhtml = questionCardHtml({ dataset: ds, question, answers: {}, asked: [], editing: null, total: 10 });
      const qline = /<p class="qlearn">([\s\S]*?)<\/p>/.exec(qhtml)![1];
      expect(anchorsOf(qline)).toEqual([{ href: escAttr(door.url), text: esc(door.label) }]);

      // A route page draws the block only under a rule with no quote to show,
      // so a door reaches this surface only where its rule is unquoted: the
      // two German doors do, the French and the Dutch do not (corrected
      // 2026-09-17). Where it is drawn, it agrees — label and href both. A
      // block is found by the question it lists, never by the href it is
      // then held to.
      const asked = `<li>${esc(ds.fields.find((f) => f.id === door.field)!.label)}</li>`;
      for (const b of asks.filter((b) => b.html.includes(asked))) {
        // The route page draws its own external mark after the label.
        const links = anchorsOf(b.html).map((a) => ({ href: a.href, text: a.text.replace(/\s*&#8599;$/, "") }));
        expect(links.filter((a) => a.text === esc(door.label) || a.href === escAttr(door.url)), b.path)
          .toEqual([{ href: escAttr(door.url), text: esc(door.label) }]);
      }
    });
  }

  it("the shortage door reaches the third surface: the shortage Blue Card's page asks it", () => {
    const door = ds.fields.find((f) => f.id === SHORTAGE)!.learn!;
    const on = asks.filter((b) => b.html.includes(`href="${escAttr(door.url)}"`)).map((b) => b.path);
    expect(on).toEqual(["/germany/eu-blue-card-shortage-occupation"]);
  });

  /** Two cards the doors still bind: the German one from the human's walk and
   * a French one — a reader with a French offer, not sure the employer counts
   * as innovative — so the box is held on a door no route page draws. */
  for (const [field, route, profile] of [
    [SHORTAGE, "de-blue-card-shortage", UNSURE],
    ["fr_innovative_employer", "fr-talent-innovante", {
      destination: "fr", situation: "offer", qualification: "degree", fr_degree: "yes", citizenship: "TR",
      fr_innovative_employer: "unknown", salary_eur_year: "band_0",
    }],
  ] as const) {
    it(`${field}: the box on the card it still binds carries the label and href the other surfaces do`, () => {
      const result = evaluate(ds, profile).find((r) => r.route.id === route)!;
      expect(result.status, `${route} is not on hold`).toBe("hold");
      const door = ds.fields.find((f) => f.id === field)!.learn!;
      expect(anchorsOf(learnBoxHtml(ds, result, profile))).toEqual([{ href: escAttr(door.url), text: esc(door.label) }]);
    });
  }
});

/**
 * The browser: the walk the human made, at the phone. Germany, an offer, a
 * degree, a Turkish passport, "I don't know" on the shortage list, then the
 * rest — a result where the shortage Blue Card is on hold with the door open
 * in its box; and the route page carries the same sentence.
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
  process.stderr.write(`\n  !! THE S28 LINK WAS NOT READ IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  problems(): string[];
}

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;
const tap = (value: string) => `document.querySelector(".qcard .opt[data-value=${value}]").click()`;
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One link read off the page: its text as drawn and where it goes. */
interface Link { text: string; href: string }
const LINKS = (selector: string) =>
  `JSON.stringify([...document.querySelectorAll(${JSON.stringify(selector)})].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href") })))`;
const BOXES = 'JSON.stringify([...document.querySelectorAll(".learn")].map((d) => ({'
  + ' text: d.textContent.trim(),'
  + ' links: [...d.querySelectorAll("a")].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href") })),'
  + ' open: !!d.closest("details") && d.closest("details").open })))';

interface Walk {
  help: Link[]; helpText: string; state: string; boxes: { text: string; links: Link[]; open: boolean }[];
  asks: Link[]; asksText: string; problems: string[];
}

describe.skipIf(skipped !== null)("s28 — in the browser at 390×844", () => {
  it("Germany → offer → degree → Türkiye → not sure on the shortage list → … : the box is the sentence as one link; the route page says the same", async () => {
    const door = ds.fields.find((f) => f.id === SHORTAGE)!.learn!;
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 300);
        await page.evaluate(seed({ destination: "de", situation: "offer", qualification: "degree" }));
        await page.goto(server.url("/"), 900);
        await page.evaluate('(() => { const i = document.querySelector("#cfilter"); i.value = "Turkey"; i.dispatchEvent(new Event("input", { bubbles: true })); })()');
        await settle(300);
        await page.evaluate('document.querySelector(".clist [role=option]").click()');
        await settle(400);
        // The shortage question is next; its help line is the door.
        const help = JSON.parse(await page.evaluate(LINKS(".qlearn a"))) as Link[];
        const helpText = await page.evaluate('document.querySelector(".qlearn") ? document.querySelector(".qlearn").textContent.trim() : ""');
        for (const value of ["unknown", "recognized", "lt2", "band_0", "none", "none", "band_0"]) {
          await page.evaluate(tap(value));
          await settle(400);
        }
        await settle(900);
        const state = await page.evaluate('document.getElementById("app").dataset.state');
        const boxes = JSON.parse(await page.evaluate(BOXES)) as Walk["boxes"];
        await page.goto(server.url("/germany/eu-blue-card-shortage-occupation/"), 600);
        const asks = JSON.parse(await page.evaluate(LINKS(`.asks a[href="${door.url}"]`))) as Link[];
        // The block that carries the door — the page draws one per unquoted rule.
        const asksText = await page.evaluate(
          `(() => { const a = document.querySelector(${JSON.stringify(`.asks a[href="${door.url}"]`)}); return a ? a.closest(".asks").textContent.replace(/\\s+/g, " ").trim() : ""; })()`,
        );
        return { help, helpText, state, boxes, asks, asksText, problems: page.problems() };
      }, { viewport: { width: 390, height: 844 }, mobile: true }) as Walk;

      expect(seen.problems).toEqual([]);
      // Under the question: the sentence as one link, no explainer around it.
      expect(seen.help).toEqual([{ text: door.label, href: door.url }]);
      expect(seen.helpText).not.toContain(ACT_EXPANSION);
      // The result: one box, on the card the unknown still binds, drawn open.
      expect(seen.state).toBe("results");
      expect(seen.boxes.length).toBe(1);
      expect(seen.boxes[0].open, "the hold row with the open question is not drawn open").toBe(true);
      expect(seen.boxes[0].links).toEqual([{ text: door.label, href: door.url }]);
      expect(seen.boxes[0].text).not.toContain(ACT_EXPANSION);
      // The route page: the same sentence, the same address.
      expect(seen.asks.map((a) => ({ text: a.text.replace(/\s*↗$/, ""), href: a.href }))).toEqual([{ text: door.label, href: door.url }]);
      expect(seen.asksText).toContain("You can find this out yourself");
      expect(seen.asksText).not.toContain(ACT_EXPANSION);
    } finally {
      server.close();
    }
  }, 180000);
});
