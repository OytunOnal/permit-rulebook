import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Profile } from "permit-rulebook-data";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";
import { withSite } from "./browser-walk.js";

const dist = fileURLToPath(new URL("../dist", import.meta.url));

/**
 * What looks like a control on the results, and where the status badge
 * lives (#176; rulings 9 and 10 on #55): measured in Chrome, because both are
 * geometry and computed style.
 *
 * A step heading is ink, its step's name bold ink, never the colour of the
 * card's own link, and so is a country tally's count of its steps (the
 * human's ruling on #178); the strip's counters are a plain line, with no
 * border; a rail's tick carries no margin, so it sits on its amount. The
 * badge is on the card's first line, above the title, at every width and for
 * every title length: beside the country's name where the card carries it,
 * alone on that line where it does not.
 */
const { chromePath } = await import("../scripts/browser/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write(`\n  !! THE VERDICT'S LOOK WAS NOT SEEN IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

/** An offer in Spain, a recognised degree, the middle bands: Spain's two
 * open routes, one titled on one line at 390 and one on two. */
const SPAIN_JOB_OFFER: Profile = {
  destination: "es", citizenship: "IN", situation: "offer", qualification: "degree", qualification_recent: "no",
  recognition_de: "recognized", experience_5y: "2plus", experience_7y: "3to5", occupation_shortage: "yes",
  occupation_it: "no", salary_eur_year: "band_5", salary_eur_month: "band_3", german: "a1", english: "b2",
  age_band: "a30to35", funds_eur_month: "band_1",
};

/** The same reader asking about all four, the offer in Spain: the cards sit in
 * their country's section, which names the country once, on its summary row. */
const FOUR_SPAIN_JOB_OFFER: Profile = {
  ...SPAIN_JOB_OFFER, destination: "all", situation_country: "es", fr_degree: "no", fr_innovative_employer: "no",
  fr_local_contract: "no", nl_recent_grad: "no", top200_grad: "no", de_stay6m: "no", partner_ck: "no",
};

/** An offer in Berlin (persona P1, s23): steps the reader can take —
 * recognition, experience, German. Spain's reader above has none: what would
 * open more there is a hosting agreement, an arranged answer (#175). */
const GERMANY_JOB_OFFER: Profile = {
  destination: "de", citizenship: "TR", situation: "offer", situation_country: "de", qualification: "degree",
  recognition_de: "unknown", occupation_shortage: "yes", occupation_it: "yes", experience_5y: "lt2", experience_7y: "3to5", german: "a1",
  english: "c1", funds_eur_month: "band_1", salary_eur_year: "band_5", age_band: "a30to35", de_stay6m: "no",
  partner_ck: "no",
};

/** The same Berlin offer asking about all four: Germany's section counts its
 * steps on its summary row. */
const FOUR_GERMANY_JOB_OFFER: Profile = { ...GERMANY_JOB_OFFER, destination: "all", nl_recent_grad: "no", top200_grad: "no" };

/** A finished record, so the page draws its verdict on arrival. */
const seed = (answers: Profile): string =>
  `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(serialize(answers, Object.keys(answers), true))})`;

interface Box { top: number; bottom: number }
interface CardGeometry {
  title: Box; titleLines: number; badge: Box;
  /** The country's chip, where the card carries it. */
  chip: Box | null;
}
interface Look {
  state: string;
  cards: CardGeometry[];
  /** Each step heading's colour, and its step name's. */
  steps: { heading: string; name: string }[];
  ink: string;
  /** The colour of the card's own link, "Read the rules of this route". */
  link: string;
  /** Each counter's four border widths, in px. */
  counters: number[][];
  /** The colour of each country tally's unlocking-steps count. */
  tallySteps: string[];
  /** Each rail tick: its left margin, and where it sits on its bar against
   * where its own offset puts it, in px from the bar's left edge. */
  railTicks: { margin: number; at: number; placed: number }[];
}

const READ_LOOK = `JSON.stringify((() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
  const lines = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
  };
  const probe = document.createElement("span");
  probe.style.color = "var(--color-ink)";
  document.getElementById("app").append(probe);
  const ink = getComputedStyle(probe).color;
  probe.remove();
  const door = document.querySelector("#app .scoped .door");
  return {
    state: document.getElementById("app").dataset.state,
    cards: [...document.querySelectorAll("#app article.route")].map((card) => {
      const title = card.querySelector("h3");
      const chip = card.querySelector(".country");
      return { title: box(title), titleLines: lines(title), badge: box(card.querySelector(".st")), chip: chip ? box(chip) : null };
    }),
    steps: [...document.querySelectorAll("#app article.unlock h3")].map((h) => ({
      heading: getComputedStyle(h).color, name: getComputedStyle(h.querySelector("b")).color,
    })),
    ink, link: door ? getComputedStyle(door).color : "",
    counters: [...document.querySelectorAll("#app .strip > span")].map((s) => {
      const c = getComputedStyle(s);
      return [c.borderTopWidth, c.borderRightWidth, c.borderBottomWidth, c.borderLeftWidth].map(parseFloat);
    }),
    tallySteps: [...document.querySelectorAll("#app .tally i")].map((i) => getComputedStyle(i).color),
    railTicks: [...document.querySelectorAll("#app article.route .bar")].flatMap((bar) => {
      const edge = bar.getBoundingClientRect();
      return [...bar.querySelectorAll(".rail-tick")].map((tick) => ({
        margin: parseFloat(getComputedStyle(tick).marginLeft),
        at: tick.getBoundingClientRect().left - edge.left,
        placed: (parseFloat(tick.style.left) / 100) * edge.width,
      }));
    }),
  };
})())`;

/** The results screens these answers draw, read once each is drawn. */
async function looksAt(viewport: { width: number; height: number }, mobile: boolean, profiles: Profile[]): Promise<Look[]> {
  return await withSite(async ({ page, url }) => {
    const out: Look[] = [];
    for (const answers of profiles) {
      await page.goto(url("/"));
      await page.evaluate(seed(answers));
      await page.goto(url("/"));
      expect(page.problems()).toEqual([]);
      out.push(JSON.parse(await page.evaluate(READ_LOOK)) as Look);
    }
    return out;
  }, { viewport, mobile });
}

/** Where a box's vertical centre is. */
const centreOf = (b: Box): number => (b.top + b.bottom) / 2;

describe.skipIf(skipped !== null)("verdict look — in the browser", () => {
  for (const [name, viewport, mobile] of [
    ["390x844", { width: 390, height: 844 }, true],
    ["1280x900", { width: 1280, height: 900 }, false],
  ] as const) {
    it(`${name}: the badge is on the card's first line, above the title — on the country's name's line where the card carries it, alone above the title where it does not`, async () => {
      const [flat, sections] = await looksAt(viewport, mobile, [SPAIN_JOB_OFFER, FOUR_SPAIN_JOB_OFFER]);
      for (const look of [flat!, sections!]) expect(look.state).toBe("results");
      // The precondition: cards with the chip, cards without, and at 390 a
      // one-line and a two-line title among the cards with it.
      const withChip = flat!.cards.filter((c) => c.chip !== null);
      const withoutChip = sections!.cards.filter((c) => c.chip === null);
      expect(withChip.length).toBeGreaterThan(0);
      expect(withoutChip.length).toBeGreaterThan(0);
      if (viewport.width === 390) expect(new Set(withChip.map((c) => Math.min(c.titleLines, 2)))).toEqual(new Set([1, 2]));

      for (const card of [...withChip, ...withoutChip]) {
        expect(card.badge.bottom, "the badge is not above the title").toBeLessThanOrEqual(card.title.top + 0.5);
        if (!card.chip) continue;
        const centre = centreOf(card.badge);
        expect(centre, "the badge's centre is above the country's name's line").toBeGreaterThanOrEqual(card.chip.top);
        expect(centre, "the badge's centre is below the country's name's line").toBeLessThanOrEqual(card.chip.bottom);
      }
    }, 120_000);

    it(`${name}: a step heading and its step's name are ink, not the link's colour`, async () => {
      const [look] = await looksAt(viewport, mobile, [GERMANY_JOB_OFFER]);
      expect(look!.state).toBe("results");
      // The precondition: steps on the screen, and a link whose colour is not ink.
      expect(look!.steps.length).toBeGreaterThan(0);
      expect(look!.link).not.toBe("");
      expect(look!.link).not.toBe(look!.ink);
      for (const step of look!.steps) {
        expect(step.heading).toBe(look!.ink);
        expect(step.name).toBe(look!.ink);
      }
    }, 120_000);

    it(`${name}: the strip's counters have no border`, async () => {
      const [look] = await looksAt(viewport, mobile, [SPAIN_JOB_OFFER]);
      expect(look!.state).toBe("results");
      expect(look!.counters.length).toBeGreaterThan(0);
      for (const widths of look!.counters) expect(widths).toEqual([0, 0, 0, 0]);
    }, 120_000);

    it(`${name}: a country's tally draws its unlocking-steps count in ink, not the link's colour`, async () => {
      const [look] = await looksAt(viewport, mobile, [FOUR_GERMANY_JOB_OFFER]);
      expect(look!.state).toBe("results");
      // The precondition: a tally that counts steps, and a link whose colour is not ink.
      expect(look!.tallySteps.length).toBeGreaterThan(0);
      expect(look!.link).not.toBe(look!.ink);
      for (const colour of look!.tallySteps) expect(colour).toBe(look!.ink);
    }, 120_000);

    it(`${name}: a rail's tick carries no margin, so it sits on the amount it marks`, async () => {
      const [look] = await looksAt(viewport, mobile, [GERMANY_JOB_OFFER]);
      expect(look!.state).toBe("results");
      expect(look!.railTicks.length, "precondition: a card draws a rail").toBeGreaterThan(0);
      for (const tick of look!.railTicks) {
        expect(tick.margin).toBe(0);
        expect(Math.abs(tick.at - tick.placed), `the tick sits ${tick.at}px in, its amount at ${tick.placed}px`)
          .toBeLessThanOrEqual(0.5);
      }
    }, 120_000);
  }
});
