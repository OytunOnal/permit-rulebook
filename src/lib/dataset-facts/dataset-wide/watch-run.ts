// @level application
import { unreadSources, type Dataset, type UnreadSource, type WatchState } from "permit-rulebook-data";

/**
 * The watch's last run as a page prints it: its day, and the sources it could
 * not read.
 *
 * The day is the one date on this site that moves without a person: every run
 * of the watch writes it, changed or not. The newest `retrieved_at` only a
 * person writes, so this is the one printed beside "re-read daily"
 * (devils-advocate, 2026-09-08).
 */
export interface WatchRun {
  /** The day the watch last ran — empty where it never has. */
  lastRun: string;
  unread: UnreadSource[];
}

/**
 * The run `state` records: its day, and the sources that pass could not read,
 * of the ones a reader is looking at. A render about another run is handed a
 * state that carries that run (#382, ruling 22).
 */
export function watchRunOf(dataset: Dataset, state: WatchState): WatchRun {
  return { lastRun: state.last_run ?? "", unread: unreadSources(dataset, state) };
}
