import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { SITUATION_FIELD, remainingQuestions, type Dataset, type Profile } from "permit-rulebook-data";
import { questionCardHtml } from "../src/lib/question.js";
import { url } from "../src/lib/site.js";
import { verdictFor } from "./verdict-cards.js";

const ds = dataset as unknown as Dataset;

/** The written state as a reader meets it: the headline, the subline as
 * text, and the words of the subline that are its door, with where it goes. */
interface WrittenState {
  headline: string;
  subline: string;
  door?: { text: string; href: string };
}

/**
 * The written state the verdict for these answers reads, where it reads one:
 * its masthead is the only one whose subline is drawn in markup, for the door
 * in it.
 */
function unscoredOf(answers: Profile): WrittenState | undefined {
  const m = verdictFor(answers).action.masthead;
  if (m.sublineHtml === undefined) return undefined;
  const door = /<a href="([^"]*)">([^<]*)<\/a>/.exec(m.sublineHtml);
  return { headline: m.announced, subline: m.subline, ...(door ? { door: { text: door[2]!, href: door[1]! } } : {}) };
}

const situationQuestion = () => remainingQuestions(ds, { destination: "fr" }).find((q) => q.field === SITUATION_FIELD)!;

/** The situation screen, drawn by the one renderer, for a reader who declared this destination. */
const situationScreen = (destination: string): string =>
  questionCardHtml({
    dataset: ds, question: situationQuestion(), answers: { destination }, asked: ["destination"],
    editing: null, total: 12,
  });

/** The marks on a drawn situation screen, keyed by the option they sit under. */
function marksOn(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<small class="opt-mark"[^>]*data-for="([^"]+)"[^>]*>([\s\S]*?)<\/small>/g;
  for (let m = re.exec(html); m; m = re.exec(html)) out[m[1]!] = m[2]!;
  return out;
}

/**
 * The guard ruling 19 changed the mark's shape under: the not-checked mark's
 * markup as question 2 draws it, whole, and the written state's door to the
 * same page. It sat in s19 and has its own file since ruling 21, under the
 * same name.
 */
describe("s19 — the interview knows which situations a destination's scored routes ask", () => {
  it("the mark's markup on question 2, whole, and the written state's door to the same page (guard, ruling 19)", () => {
    expect(marksOn(situationScreen("fr")).research).toBe(
      "Not checked for France yet — Talent — researcher (chercheur) is quoted, not checked: "
      + `<a href="${url("/france/talent-researcher")}">read it here</a>.`,
    );
    expect(unscoredOf({ destination: "fr", situation: "research" })?.door?.href).toBe(url("/france/talent-researcher"));
  });
});
