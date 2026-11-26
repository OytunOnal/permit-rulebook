import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { remainingQuestions, type Dataset, type Profile } from "permit-rulebook-data";
import { DESK, walkSite, type BrowserPage, type Screen } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page/interview-page.mjs";

/**
 * What `InterviewPage`'s suites share: the built site walked with an
 * interview on its page, and the first question a cold interview asks.
 */
export const ds = rawDataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/** The question a cold interview asks first. */
export const firstQuestion = remainingQuestions(ds, {})[0]!;
/** The first answer that question offers, as a record holds it: a real answer the dataset gives. */
export const FIRST_ANSWER: Profile = { [firstQuestion.field]: firstQuestion.options[0]!.value };
/** Answers that bring the passport question next: the search. */
export const BEFORE_PASSPORT: Profile = { destination: "de", situation: "offer", qualification: "degree", occupation_it: "no" };

/** Finds the label of `field`'s question, as the dataset words it. */
export const findLabel = (field: string): string => ds.fields.find((f) => f.id === field)!.label;

/** Catches what `run` threw: its message, or null where it threw nothing. */
export const catchMessage = (run: Promise<unknown>): Promise<string | null> => run.then(() => null, (e: Error) => e.message);

/** Walks the built site on `screen` (the desk by default), handing `run` an interview on its page, and the page
 * for a gesture or a read the interview does not make. */
export async function withInterview<T>(run: (interview: InterviewPage, page: BrowserPage) => Promise<T>, screen: Screen = DESK): Promise<T> {
  const { returned } = await walkSite({ site: { folder: dist }, screen }, (site) => run(new InterviewPage(site), site.page));
  return returned;
}
