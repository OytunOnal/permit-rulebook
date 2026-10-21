// @level presentation
import {
  countryPhrase, findTerritory, matchOptions, territoryPhrase, territoryPhraseAtStart, type FieldOption,
} from "permit-rulebook-data";
import { NO_COUNTRY_MATCHES, NO_COUNTRY_MATCHES_STATUS, territoryLine } from "./copy.js";

/**
 * The selection semantics of the country control, as a pure state machine.
 *
 * The control used to have none: ↓ left the highlight where it was, Enter took
 * the first row, and the first row was not the exact match — so typing "sudan"
 * and pressing Enter recorded South Sudan, computed a whole eligibility record
 * for the wrong nationality, and said nothing about it (product-critique v0.7,
 * blocker B1). The rule the page now keeps is one sentence: **Enter commits the
 * highlighted option and nothing else.** It lives here, away from the DOM,
 * because that sentence is a promise with a property test behind it.
 */
export interface ListboxState {
  /** What is in the search box. */
  query: string;
  /** Index into the shown rows; -1 when nothing is highlighted. */
  active: number;
  /** Whether the list is on screen. Escape closes it without committing. */
  open: boolean;
}

export type ListboxKey = "ArrowDown" | "ArrowUp" | "Home" | "End" | "Enter" | "Escape";

/** How many rows the list draws at once. */
export const SHOWN_LIMIT = 60;

/**
 * The longest query the search takes. Every name a country is found by is
 * shorter; past that, each keystroke would fold and match text no name can
 * hold (#25).
 */
export const QUERY_MAX_LENGTH = 64;

/**
 * A fresh state for a query — which is the whole of what typing does: the
 * list is re-ranked and the highlight returns to the top of it. An untouched
 * box highlights nothing: on an empty
 * needle the first row is the first country in the alphabet, and a habitual
 * Enter would answer "Afghanistan" for someone who never chose it.
 */
export function stateFor(query: string): ListboxState {
  const bounded = query.slice(0, QUERY_MAX_LENGTH);
  return { query: bounded, active: bounded.trim() ? 0 : -1, open: true };
}

/** The rows on screen, in the order the matcher ranks them (exact name first). */
export function shownOptions(options: FieldOption[], state: ListboxState, limit = SHOWN_LIMIT): FieldOption[] {
  if (!state.query.trim()) return [];
  return matchOptions(options, state.query).slice(0, limit);
}

/** The row the highlight is on — the only row Enter can ever commit. */
export function activeOption(
  options: FieldOption[], state: ListboxState, limit = SHOWN_LIMIT,
): FieldOption | undefined {
  if (!state.open || state.active < 0) return undefined;
  return shownOptions(options, state, limit)[state.active];
}

export interface KeyResult {
  state: ListboxState;
  /** Set only by Enter, and only ever to the option that was highlighted. */
  commit?: FieldOption;
}

export function onKey(
  options: FieldOption[], state: ListboxState, key: ListboxKey, limit = SHOWN_LIMIT,
): KeyResult {
  const rows = shownOptions(options, state, limit);
  const last = rows.length - 1;
  switch (key) {
    case "ArrowDown":
      if (rows.length === 0) return { state };
      return { state: { ...state, open: true, active: Math.min(state.active + 1, last) } };
    case "ArrowUp":
      if (rows.length === 0) return { state };
      return { state: { ...state, open: true, active: Math.max(state.active - 1, 0) } };
    case "Home":
      if (rows.length === 0) return { state };
      return { state: { ...state, open: true, active: 0 } };
    case "End":
      if (rows.length === 0) return { state };
      return { state: { ...state, open: true, active: last } };
    case "Escape":
      // Closes, and commits nothing — the answer on file is untouched.
      return { state: { ...state, open: false, active: -1 } };
    case "Enter": {
      const option = activeOption(options, state, limit);
      return option ? { state, commit: option } : { state };
    }
  }
}

/**
 * What the list says when the query matches no row. A dependent territory is
 * never a row — its people hold another country's passport — so typing one
 * is answered with that passport, named by the dataset; any other query is
 * told how to search. The live region reads the territory's line whole, since
 * it is the answer, and the short form of the other.
 */
export function composeNoMatchLine(query: string): { line: string; status: string } {
  const found = findTerritory(query);
  if (!found) return { line: NO_COUNTRY_MATCHES, status: NO_COUNTRY_MATCHES_STATUS };
  const line = territoryLine(
    { atStart: territoryPhraseAtStart(found.territory), inSentence: territoryPhrase(found.territory) },
    countryPhrase(found.country.code), found.country.name,
  );
  return { line, status: line };
}

/** The DOM id of a row, for `aria-activedescendant`. */
export const rowId = (index: number): string => `copt-${index}`;
