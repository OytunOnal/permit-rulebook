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
 * The watch run of `state`, or of the run `run` asks about: what `run` leaves
 * out is read from the state.
 *
 * A render has to be askable about a run other than the state's own, so a
 * render over a frozen dataset stays frozen (CI 2026-09-09). An unread list
 * belongs to the pass that wrote it, so a run other than the state's has
 * none: that is what keeps the root build's fingerprint frozen, which renders
 * the footer at a day no watch ever ran (2026-09-09).
 */
export function watchRunOf(dataset: Dataset, state: WatchState, run: Partial<WatchRun> = {}): WatchRun {
  const stateRun = state.last_run ?? "";
  const lastRun = run.lastRun ?? stateRun;
  return { lastRun, unread: run.unread ?? (lastRun === stateRun ? unreadSources(dataset, state) : []) };
}
