// @level presentation
/**
 * The page the interview draws on: the dataset, the elements it writes into,
 * the breakpoints it reads at the moment of a gesture, the beat, and the
 * hands a drawn control gives its gesture to.
 */
import { datasetMeta, type Dataset, type Question } from "permit-rulebook-data";
import { WIDE_QUERY } from "../../../first-paint.js";
import type { Gesture } from "../../flow/interview-after.js";
import { beatOf, type Beat } from "./beat.js";

/** Where a drawn control's gesture goes. */
export interface GestureHands {
  /** A gesture the interview decides on. */
  makeGesture(gesture: Gesture): void;
  /** The screen's "← Back", which the history answers before the interview does. */
  pressBack(): void;
}

/** The elements the interview writes into, found once. */
export interface PageElements {
  /** Where the pre-paint script left what it read about this reader. */
  root: HTMLElement;
  app: HTMLElement;
  main: HTMLElement;
  decl: HTMLDetailsElement;
  declList: HTMLElement;
  declSetAside: HTMLElement;
  declSetAsideFolded: HTMLElement;
  declCount: HTMLElement;
  restart: HTMLElement;
  headline: HTMLElement;
  subline: HTMLElement;
  masthead: HTMLElement;
  /** The site header, whose height a narrow landing goes under. */
  head: HTMLElement | null;
  stampLabel: HTMLElement;
  stampDate: HTMLElement;
  stampTime: HTMLElement;
}

export interface InterviewPage {
  ds: Dataset;
  questions: Question[];
  els: PageElements;
  /** The dataset's newest read date, which the stamp says on the questions. */
  rulesRead: string;
  /** The width the ledger stops being a disclosure at, said once (`first-paint.ts`). */
  wide: MediaQueryList;
  reducedMotion: MediaQueryList;
  beat: Beat;
  hands: GestureHands;
}

const byId = (id: string): HTMLElement => document.getElementById(id)!;

function pageElementsOf(): PageElements {
  return {
    root: document.documentElement,
    app: byId("app"),
    main: byId("main"),
    decl: byId("decl") as HTMLDetailsElement,
    declList: byId("decl-list"),
    declSetAside: byId("decl-set-aside"),
    declSetAsideFolded: byId("decl-set-aside-folded"),
    declCount: byId("decl-count"),
    restart: byId("restart"),
    headline: byId("headline"),
    subline: byId("subline"),
    masthead: document.querySelector<HTMLElement>(".masthead-with-stamps")!,
    head: document.querySelector<HTMLElement>(".site-head"),
    stampLabel: byId("stamp-label"),
    stampDate: byId("stamp-date"),
    stampTime: byId("stamp-time"),
  };
}

export function interviewPageOf(ds: Dataset, questions: Question[], hands: GestureHands): InterviewPage {
  const els = pageElementsOf();
  return {
    ds, questions, els, hands,
    rulesRead: datasetMeta(ds).newest_retrieved_at ?? "",
    wide: window.matchMedia(WIDE_QUERY),
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)"),
    beat: beatOf(els.main),
  };
}
