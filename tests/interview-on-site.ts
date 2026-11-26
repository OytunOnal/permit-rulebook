import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { remainingQuestions, type Dataset, type Profile } from "permit-rulebook-data";
import { DESK, walkSite, type Screen } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page.mjs";

/**
 * What `InterviewPage`'s suites share: the built site walked with an
 * interview on its page, and the first question a cold interview asks.
 */
export const ds = rawDataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/** The question a cold interview asks first. */
export const first = remainingQuestions(ds, {})[0]!;
/** The first answer that question offers, as a record holds it: a real answer the dataset gives. */
export const FIRST_ANSWER: Profile = { [first.field]: first.options[0]!.value };

/** Walks the built site on `screen` (the desk by default), handing `run` an interview on its page. */
export async function withInterview<T>(run: (interview: InterviewPage) => Promise<T>, screen: Screen = DESK): Promise<T> {
  const { returned } = await walkSite({ site: { folder: dist }, screen }, (site) => run(new InterviewPage(site)));
  return returned;
}
