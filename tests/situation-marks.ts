import dataset from "permit-rulebook-data/data/dataset.json";
import { SITUATION_FIELD, remainingQuestions, type Dataset, type Profile } from "permit-rulebook-data";
import { questionCardHtml } from "../src/lib/question.js";
import { verdictFor } from "./verdict-cards.js";

/**
 * The situation question's marks and the written state they lead to, as the
 * s19 cases and the mark's markup guard read them (ruling 22 on #312).
 */

const ds = dataset as unknown as Dataset;

/** The written state as a reader meets it: the headline, the subline as
 * text, and the words of the subline that are its door, with where it goes. */
export interface WrittenState {
  headline: string;
  subline: string;
  door?: { text: string; href: string };
}

/**
 * The written state the verdict for these answers reads, where it reads one:
 * its masthead is the only one whose subline is drawn in markup, for the door
 * in it.
 */
export function unscoredOf(answers: Profile): WrittenState | undefined {
  const m = verdictFor(answers).action.masthead;
  if (m.sublineHtml === undefined) return undefined;
  const door = /<a href="([^"]*)">([^<]*)<\/a>/.exec(m.sublineHtml);
  return { headline: m.announced, subline: m.subline, ...(door ? { door: { text: door[2]!, href: door[1]! } } : {}) };
}

const situationQuestion = () => remainingQuestions(ds, { destination: "fr" }).find((q) => q.field === SITUATION_FIELD)!;

/** The situation screen, drawn by the one renderer, for a reader who declared this destination. */
export const situationScreen = (destination: string): string =>
  questionCardHtml({
    dataset: ds, question: situationQuestion(), answers: { destination }, asked: ["destination"],
    editing: null, total: 12,
  });

/** The marks on a drawn situation screen, keyed by the option they sit under.
 * The mark carries an id since s21 (its button is described by it); what is
 * read here is the mark, whatever else it carries. */
export function marksOn(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<small class="opt-mark"[^>]*data-for="([^"]+)"[^>]*>([\s\S]*?)<\/small>/g;
  for (let m = re.exec(html); m; m = re.exec(html)) out[m[1]!] = m[2]!;
  return out;
}
