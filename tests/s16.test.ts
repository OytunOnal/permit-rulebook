import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { proseProvenance, type Dataset } from "permit-rulebook-data";
import { dataPage, routeCounts } from "../src/lib/data-page.js";
import { routePages } from "../src/lib/route-page.js";
import {
  DATA_LEDE_CLOSE_TAIL, DATA_LEDE_OPEN, FEEDBACK_DOORS, FRESHNESS_HUMAN_HAND, PROSE_OURS_TAIL, WRONG_DOOR_LABEL,
  dataLedeClose, dataMetaDescription,
} from "../src/lib/copy.js";
import { REPO_DATA, TRACKER_URL, url } from "../src/lib/site.js";
import { FEEDBACK_PATH } from "../src/lib/identity.js";

/**
 * s16 — `/data/` in the reader's words, and the last two tracker doors.
 *
 * The light critique of s12 walked `/data/` as the persona and found a label
 * in the provenance gate's own vocabulary ("declared and shown as ours") and a
 * sentence naming a tracker the reader has not met ("files an issue in the
 * tracker"). The same day s13 made e-mail the reader's door and moved the
 * tracker to `/feedback/` — and left two doors pointing the old way: the
 * *Report a wrong value* link in `/data/`'s Take it section and the same link
 * in every route page's data door. So the freshness sentence's "tracker" was
 * not only unintroduced but wrong about where a reader goes.
 *
 * Every place the site tells a reader where to say something is wrong now
 * points at the same door, in the same words: the first door on `/feedback/`.
 * The contributor's door — the dataset on GitHub — stays where it was.
 */

const ds = dataset as unknown as Dataset;
const readerSees = (html: string): string =>
  html.replace(/<[^>]*>/g, "").split(/\s+/).join(" ").split(String.fromCharCode(160)).join(" ").trim();

/** The page as a reader meets it: the body, without its styles and scripts. */
const bodyText = (html: string): string =>
  readerSees(html.slice(html.indexOf("<body")).replace(/<(style|script)[\s\S]*?<\/\1>/g, ""));

/** The whole document but its styles and scripts — the head's descriptions included. */
const wholeDocument = (html: string): string => html.replace(/<(style|script)[\s\S]*?<\/\1>/g, "");

/** The rows of "What it holds today", whichever list holds them. */
const facts = (html: string): [string, string][] =>
  [...html.matchAll(/<dt>(.*?)<\/dt><dd>(.*?)<\/dd>/g)].map((row) => [readerSees(row[1]!), readerSees(row[2]!)]);

/** Every `<a>` in a `<nav>` of the given label, as [href, attributes, text]. */
function doorsOf(html: string, navLabel: string): { href: string; tag: string; text: string }[] {
  const nav = new RegExp(`<nav aria-label="${navLabel}">([\\s\\S]*?)</nav>`).exec(html);
  expect(nav, `no <nav aria-label="${navLabel}">`).toBeTruthy();
  return [...nav![1]!.matchAll(/<a ([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    href: /href="([^"]*)"/.exec(m[1]!)?.[1] ?? "",
    tag: m[1]!,
    text: readerSees(m[2]!),
  }));
}

/** The site's own door, exactly as it stands on `/feedback/`. */
const feedbackDoor = { href: url(FEEDBACK_PATH), text: FEEDBACK_DOORS[0]!.button };

describe("/data/ in the reader's words", () => {
  const html = dataPage(ds).html;

  it("counts our sentences in words that stand on their own", () => {
    // The number is derived, as it was; only the words beside it move.
    const ours = proseProvenance(ds).ours;
    expect(facts(html)).toContainEqual(["Sentences of ours", `${ours}, ${PROSE_OURS_TAIL}`]);
    expect(facts(html)).toContainEqual(["Sentences of ours", `${ours}, written by us and marked as ours`]);
    expect(bodyText(html)).not.toContain("declared and shown as ours");
    // The gate's own line further down keeps its own vocabulary.
    expect(bodyText(html)).toContain("and what is ours is declared ours");
  });

  it("says what happens when a source moves without naming a tracker", () => {
    // Through the constant, and spelled out once so the constant cannot drift
    // without this case knowing.
    expect(bodyText(html)).toContain(FRESHNESS_HUMAN_HAND);
    expect(FRESHNESS_HUMAN_HAND).toBe(
      "A source that has moved raises a flag and a person reads it: the values on this site, and the dates beside "
      + "them, change when a person changes them, never on their own.");
    // The exception clause before it is s11's and is untouched: the sentence
    // still opens with the claim and the run, on the same line.
    expect(bodyText(html)).toMatch(/Every source is re-read daily — last run \d{4}-\d{2}-\d{2}\.( .*?)? A source that has moved raises a flag/);
    expect(bodyText(html)).not.toContain("files an issue in the tracker");
    // Nowhere in the document, the head's descriptions included: the meta
    // description said "the downloads, the checks and the tracker" for a day
    // after the page had stopped offering one (the s16 build's own finding).
    expect(wholeDocument(html).toLowerCase()).not.toContain("tracker");
  });

  it("describes itself to a search result without the door it no longer offers", () => {
    const { scored, quotedOnly } = routeCounts(ds);
    const desc = dataMetaDescription(scored, quotedOnly, ds.countries.length);
    expect(desc).toBe(`What Permit Rulebook holds today: ${scored} routes scored against your answers and ${
      quotedOnly} quoted and dated but not scored, across ${ds.countries.length} countries, every value carrying `
      + "its source and the day it was read — with the downloads and the checks.");
    expect(dataPage(ds).description).toBe(desc);
    expect(html).toContain(`<meta name="description" content="${desc}">`);
  });

  it("no door on the page opens the tracker", () => {
    expect(html).not.toContain("issues/new");
    expect(html).not.toContain(TRACKER_URL);
  });

  it("Take it: the reader's door is the site's door, and the contributor's door stays", () => {
    const doors = doorsOf(html, "Downloads");
    const door = doors.find((d) => d.text === feedbackDoor.text);
    expect(door, `no "${feedbackDoor.text}" link in Take it`).toBeTruthy();
    expect(door!.href).toBe(feedbackDoor.href);
    expect(door!.href).toBe("/feedback/");
    // Internal, and said so: no new tab, no referrer policy, no outbound mark.
    expect(door!.tag).not.toContain("target=");
    expect(door!.tag).not.toContain("rel=");
    expect(door!.tag).not.toMatch(/class="[^"]*\bout\b/);
    expect(door!.tag).toMatch(/class="[^"]*\btap-min\b/);
    expect(doors.map((d) => d.text)).not.toContain("Report a wrong value");
    // The dataset on GitHub is the contributor's door and belongs here.
    const repo = doors.find((d) => d.text === "The dataset on GitHub");
    expect(repo?.href).toBe(REPO_DATA);
    expect(doors.map((d) => d.text)).toEqual([
      "The whole dataset as JSON", "countries.json — the passport vocabulary", "The dataset on GitHub", feedbackDoor.text,
    ]);
  });

  /**
   * The masthead's lede ended "Take it, check it, or tell us it is wrong." —
   * as plain text with no door, which the human's walk of the preview found
   * (2026-09-16); and once the door was there, the human's read found the
   * sentence presupposed a wrong ("1" of three, the same day). So it ends
   * "Take it, check it, and if something is wrong, tell us." with the door on
   * the last two words. Composed in copy.ts the way the results line is: the
   * words arrive already wrapped, and the copy closes the sentence.
   */
  it("the lede's last sentence does not presuppose a wrong, and its last words are the door", () => {
    const lede = /<p class="lede">([\s\S]*?)<\/p>/.exec(html)![1]!;
    expect(readerSees(lede)).toMatch(/\. Take it, check it, and if something is wrong, tell us\.$/);
    expect(readerSees(lede)).not.toContain("tell us it is wrong");
    expect(readerSees(lede).startsWith(DATA_LEDE_OPEN)).toBe(true);
    const link = /<a ([^>]*)>([^<]*)<\/a>/.exec(lede);
    expect(link, "the lede has no link").toBeTruthy();
    expect(link![2]).toBe("tell us");
    expect(link![1]).toContain(`href="${feedbackDoor.href}"`);
    expect(link![1]).not.toContain("target=");
    expect(link![1]).not.toContain("rel=");
    // Prose, so the inline tap class and not the button's.
    expect(link![1]).toMatch(/class="tap"/);
    expect(lede.endsWith(dataLedeClose(link![0]))).toBe(true);
    expect(dataLedeClose("X")).toBe("Take it, check it, and if something is wrong, X.");
    expect(DATA_LEDE_CLOSE_TAIL).toBe("tell us");
  });

  it("the two dates stay: Dataset version and Newest value changed are two facts that coincide today", () => {
    const terms = facts(html).map(([t]) => t);
    expect(terms).toContain("Dataset version");
    expect(terms).toContain("Newest value changed");
  });
});

describe("every route page's data door", () => {
  const pages = routePages(ds);

  it("is the site's door, in the site's words, and never the tracker", () => {
    expect(pages.length).toBeGreaterThan(20);
    for (const page of pages) {
      const doors = doorsOf(page.html, "The data behind this page");
      expect(doors.map((d) => d.text), page.path).toEqual(["This route as JSON", "The dataset on GitHub", feedbackDoor.text]);
      const door = doors[2]!;
      expect(door.href, page.path).toBe(feedbackDoor.href);
      expect(door.tag, page.path).not.toContain("target=");
      expect(door.tag, page.path).not.toContain("rel=");
      expect(door.tag, page.path).not.toMatch(/class="[^"]*\bout\b/);
      expect(door.tag, page.path).toMatch(/class="[^"]*\btap-min\b/);
      expect(page.html, page.path).not.toContain("issues/new");
      expect(page.html, page.path).not.toContain(TRACKER_URL);
    }
  });
});

describe("where the words live", () => {
  it("the door's label is the first door's button on /feedback/, not a second copy", () => {
    expect(WRONG_DOOR_LABEL).toBe(FEEDBACK_DOORS[0]!.button);
    expect(WRONG_DOOR_LABEL).toBe("Report what is wrong");
  });

  it("the counts row's tail is one constant", () => {
    expect(PROSE_OURS_TAIL).toBe("written by us and marked as ours");
  });
});
