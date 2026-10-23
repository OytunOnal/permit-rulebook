import { openInterviewHistory, type InterviewHistory } from "../src/lib/interview-history/index.js";
import { FakeTab, stepOf } from "./fake-browser-history.js";

/**
 * `history-corners.test.ts`' helper, in a file of its own because the two
 * together pass the lint's 400 lines a file.
 *
 * The interview page in a browser tab, in Node: as much of it as the history
 * sees. It draws the next unanswered question, or the one being edited, and
 * tells the history what each gesture drew as the page does; a browser move
 * redraws the question it names, which tells the history again, as the
 * page's render does.
 */

/** The questions, in the order a walk answers them. */
export const QUESTIONS = [
  "destination", "citizenship", "situation", "qualification", "occupation_it", "salary", "age", "experience",
];

/** The record every tab on the device shares: the answered questions, in order. */
export interface Store {
  asked: string[];
}

/** Where a tab stands: the page's path, the question on screen, and the browser's history. */
export interface Where {
  path: string;
  question: string | null;
  step: unknown;
  length: number;
}

class Page {
  readonly history: InterviewHistory;
  shown: string | null;
  private asked: string[];
  private editing: string | null = null;

  constructor(private readonly store: Store, tab: FakeTab) {
    this.asked = [...store.asked];
    this.shown = this.next();
    this.history = openInterviewHistory(tab, { asked: this.asked, showing: this.shown });
    this.history.onMove((move) => {
      this.editing = move.field;
      this.shown = move.field;
      this.history.replaceScreen(move.field);
    });
  }

  /** Whether the screen offers its "← Back": the first question does not. */
  get hasBack(): boolean {
    return this.editing ? this.asked.indexOf(this.editing) > 0 : this.asked.length > 0;
  }

  answer(): void {
    if (this.editing) this.editing = null;
    else this.asked.push(this.shown!);
    this.store.asked = [...this.asked];
    this.shown = this.next();
    this.history.pushScreen(this.shown);
  }

  screenBack(): void {
    const move = this.history.back({ asked: this.asked, editing: this.editing });
    if (move.kind !== "in-place") return;
    this.editing = move.field;
    this.shown = move.field;
    this.history.replaceScreen(move.field);
  }

  restart(): void {
    this.asked = [];
    this.store.asked = [];
    this.editing = null;
    this.history.startOver();
    this.shown = this.next();
    this.history.replaceScreen(this.shown);
  }

  private next(): string | null {
    return this.editing ?? QUESTIONS.find((field) => !this.asked.includes(field)) ?? null;
  }
}

/** A tab, and the interview page in it while it stands on `/`. Every gesture returns where it left the tab. */
export class InterviewTab {
  readonly tab = new FakeTab();
  private page: Page | null = null;

  constructor(private readonly store: Store) {}

  /** Whether the screen offers its "← Back". */
  get hasBack(): boolean {
    return this.page?.hasBack ?? false;
  }

  at(): Where {
    const { path, length } = this.tab;
    return { path, question: this.page?.shown ?? null, step: stepOf(this.tab), length };
  }

  /** `/` opened onto the record as it is: an outside entrance. */
  open(): Where {
    this.tab.open("/");
    this.page = new Page(this.store, this.tab);
    return this.at();
  }

  /** `/` opened from `/data/` onto a record of the first `answers` questions. */
  openFromOutside(answers: number): Where {
    this.tab.open("/data/");
    this.store.asked = QUESTIONS.slice(0, answers);
    return this.open();
  }

  /** A fresh record, opened from `/data/`, and `n` questions answered in the tab. */
  live(n: number): Where[] {
    const seen = [this.openFromOutside(0)];
    for (let i = 0; i < n; i++) seen.push(this.answer());
    return seen;
  }

  reload(): Where {
    this.tab.reload();
    this.page = new Page(this.store, this.tab);
    return this.at();
  }

  answer(): Where {
    this.page!.answer();
    return this.at();
  }

  screenBack(): Where {
    this.page!.screenBack();
    return this.at();
  }

  restart(): Where {
    this.page!.restart();
    return this.at();
  }

  browserBack(): Where {
    return this.moved(() => this.tab.back());
  }

  browserForward(): Where {
    return this.moved(() => this.tab.forward());
  }

  /** A move that loads another document runs the page afresh on `/` and leaves it anywhere else. */
  private moved(move: () => void): Where {
    const group = this.tab.group;
    move();
    if (this.tab.group !== group) this.page = this.tab.path === "/" ? new Page(this.store, this.tab) : null;
    return this.at();
  }
}
