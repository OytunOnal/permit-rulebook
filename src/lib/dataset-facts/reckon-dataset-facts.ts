// @level application
/**
 * The dataset's facts, reckoned once, with no words and no markup: the dates,
 * the counts and the watch run every page prints (#323). A page takes its
 * facts from one call and only draws what it is handed, so two pages cannot
 * print two newest days. Only `reckonDatasetFacts` and the types leave this
 * entry.
 *
 * It reads no file: whoever builds a page reads the watch's state and passes
 * it in, so the facts can be reckoned on any dataset and any state.
 */
import type { Dataset, WatchState } from "permit-rulebook-data";
import { datasetCountsOf, type DatasetCounts } from "./dataset-wide/dataset-counts.js";
import { newestValueChangedOf, readRangeOf, type ReadRange } from "./dataset-wide/read-range.js";
import { watchRunOf, type WatchRun } from "./dataset-wide/watch-run.js";

export type { DatasetCounts } from "./dataset-wide/dataset-counts.js";
export type { ReadRange } from "./dataset-wide/read-range.js";
export type { WatchRun } from "./dataset-wide/watch-run.js";
export {
  audienceNotice, cardValues, noticesOn, ownUnread, pageStamp, printedNotices, routeSourceUrls, ruleCriteria,
  valuesUnder,
} from "./per-page/printed-quotes.js";

/** What a page prints about the dataset as a whole. */
export interface DatasetFacts {
  /** The read range: the footer's two days. */
  readRange: ReadRange;
  /** The newest day a value was read: `/data/`'s "Newest value changed". */
  newestValueChanged: string;
  /** The watch's last run and the sources it could not read. */
  watchRun: WatchRun;
  /** The dataset-wide counts. */
  counts: DatasetCounts;
}

/** Every fact a page prints about the dataset, on the watch's `watchState`. */
export function reckonDatasetFacts(dataset: Dataset, watchState: WatchState): DatasetFacts {
  return {
    readRange: readRangeOf(dataset),
    newestValueChanged: newestValueChangedOf(dataset),
    watchRun: watchRunOf(dataset, watchState),
    counts: datasetCountsOf(dataset),
  };
}
