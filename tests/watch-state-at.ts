import type { WatchState } from "permit-rulebook-data";
import { watchState } from "../src/lib/site.js";

/** A source a run could not read, as the state names it: the watchlist's id and the page. */
type UnreadEntry = NonNullable<WatchState["unread"]>[number];

/**
 * The watch's real state as a run on `run` would record it: that day, and
 * `unread` as the sources that run could not read — none unless named. Every
 * reading stays the state's own, so a date a page prints for an unread source
 * comes off the file, never off the case (#382, ruling 22).
 */
export const watchStateAt = (run: string, unread: UnreadEntry[] = []): WatchState =>
  ({ ...watchState, last_run: run, unread });
