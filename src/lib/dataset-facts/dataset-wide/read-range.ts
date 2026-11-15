// @level application
import { noticeSources, routeProvenance, type Dataset } from "permit-rulebook-data";

/**
 * The read range: the span of days every sentence the site quotes was read
 * on, values and notices alike (#323, rulings 1 and 6). Its newest day is the
 * dataset's one newest read day, which the "Rules read" stamp and the end of
 * the footer's range both print, so they cannot disagree; a notice re-read
 * alone moves it, since a notice is a rule read.
 *
 * The footer says the range rather than the newest date alone: "read
 * 2026-09-08" is the flattering end of a set that starts earlier, and a reader
 * deciding whether to trust a number deserves both ends of it (footer critique,
 * 2026-09-08).
 */
export interface ReadRange {
  oldest: string;
  newest: string;
}

/** The day every value in the dataset was read on, oldest first. */
function valueReadDays(dataset: Dataset): string[] {
  const days: string[] = [];
  for (const country of dataset.countries)
    for (const route of country.routes)
      for (const entry of routeProvenance(route)) days.push(entry.value.retrieved_at);
  return days.sort();
}

/** The day every sentence the site quotes was read on, every value's and every notice's, oldest first. */
function quotedSentenceReadDays(dataset: Dataset): string[] {
  const days = valueReadDays(dataset);
  for (const notice of dataset.notices ?? [])
    for (const value of noticeSources(notice)) days.push(value.retrieved_at);
  return days.sort();
}

/** The read range: the oldest and the newest day a quoted sentence was read on. */
export function readRangeOf(dataset: Dataset): ReadRange {
  const days = quotedSentenceReadDays(dataset);
  return { oldest: days[0] ?? "", newest: days[days.length - 1] ?? "" };
}

/**
 * The newest `retrieved_at` among VALUES and nothing else, which is the only
 * date the word "changed" allows: re-reading a notice is not a value moving
 * (Spec review, 2026-09-15).
 */
export function newestValueChangedOf(dataset: Dataset): string {
  return valueReadDays(dataset).at(-1) ?? "";
}
