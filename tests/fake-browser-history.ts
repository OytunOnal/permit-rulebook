import type { BrowserHistory } from "../src/lib/interview-history/index.js";

/**
 * A browser tab's history, in memory: the `BrowserHistory` the interview's
 * history is tested against in Node.
 *
 * It keeps what a browser keeps: a list of entries with their states and the
 * index of the one shown. An entry belongs to a document group: the entries
 * one page's script pushed or replaced, which a reload keeps. A move between
 * entries of one group is the page's own, and calls the move listener as a
 * browser's `popstate` does; a move onto another group's entry loads that
 * document, which drops the listeners and runs no script of ours. A reload
 * drops the listeners and keeps every entry with its state.
 */
interface Entry {
  path: string;
  state: unknown;
  group: number;
}

export class FakeTab implements BrowserHistory {
  private entries: Entry[] = [];
  private index = -1;
  private groups = 0;
  private listeners: ((state: unknown) => void)[] = [];

  /** Where the tab stands: the shown entry's path, `""` before anything is open. */
  get path(): string {
    return this.entries[this.index]?.path ?? "";
  }

  /** The document group of the entry shown: it changes where a move loaded another document. */
  get group(): number {
    return this.entries[this.index]?.group ?? 0;
  }

  /** How many entries the tab holds, as `history.length` counts them. */
  get length(): number {
    return this.entries.length;
  }

  /** A navigation to `path`, typed or followed: a new entry and a new document. */
  open(path: string): void {
    this.groups += 1;
    this.entries.length = this.index + 1;
    this.entries.push({ path, state: null, group: this.groups });
    this.index += 1;
    this.listeners = [];
  }

  /** The same entry, a new document: every entry and its state is kept. */
  reload(): void {
    this.listeners = [];
  }

  state(): unknown {
    return this.entries[this.index]?.state ?? null;
  }

  push(state: unknown): void {
    const { path, group } = this.entries[this.index]!;
    this.entries.length = this.index + 1;
    this.entries.push({ path, state, group });
    this.index += 1;
  }

  replace(state: unknown): void {
    this.entries[this.index]!.state = state;
  }

  back(): void {
    this.go(-1);
  }

  forward(): void {
    this.go(1);
  }

  onMove(listener: (state: unknown) => void): void {
    this.listeners.push(listener);
  }

  private go(delta: number): void {
    const to = this.entries[this.index + delta];
    if (!to) return;
    const sameDocument = to.group === this.entries[this.index]!.group;
    this.index += delta;
    if (!sameDocument) {
      this.listeners = [];
      return;
    }
    for (const listener of this.listeners) listener(to.state);
  }
}

/** The step the shown entry names, as a test reads `history.state.step`. */
export const stepOf = (tab: FakeTab): unknown => (tab.state() as { step?: unknown } | null)?.step ?? null;
