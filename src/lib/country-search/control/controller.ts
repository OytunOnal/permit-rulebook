// @level presentation
import type { FieldOption } from "permit-rulebook-data";
import { onKey, stateFor, type ListboxKey, type ListboxState } from "./listbox.js";
import { viewOf, type RowMarks, type SearchView } from "./view.js";

/** A key as the search reads it: an IME's composing Enter is the IME's. */
export interface SearchKey {
  key: string;
  isComposing: boolean;
}

/** Whether the search took the key, and the view to apply; no view when the
 * key was not the search's, or when it committed and the next screen draws. */
export interface KeyOutcome {
  handled: boolean;
  view: SearchView | null;
}

export interface CountrySearch {
  typed(value: string): SearchView;
  key(event: SearchKey): KeyOutcome;
  clicked(value: string): void;
}

const LISTBOX_KEYS: readonly ListboxKey[] = ["ArrowDown", "ArrowUp", "Home", "End", "Enter", "Escape"];

/** The list's key this event is, or null when it is the box's. Home and End
 * inside a text box move the caret; they are the list's only once a row is
 * highlighted, so typing still behaves like typing. */
function listKeyOf({ key, isComposing }: SearchKey, state: ListboxState): ListboxKey | null {
  const listKey = LISTBOX_KEYS.find((k) => k === key);
  if (isComposing || listKey === undefined) return null;
  const movesCaret = state.active < 0 && (listKey === "Home" || listKey === "End");
  return movesCaret ? null : listKey;
}

export function countrySearchOf(
  options: FieldOption[], marks: RowMarks, onCommit: (value: string, label: string) => void,
): CountrySearch {
  const list = { options, marks };
  let state: ListboxState = stateFor("");
  return {
    typed(value) {
      state = stateFor(value);
      return viewOf(list, state);
    },
    key(event) {
      const listKey = listKeyOf(event, state);
      if (listKey === null) return { handled: false, view: null };
      const result = onKey(options, state, listKey);
      state = result.state;
      if (!result.commit) return { handled: true, view: viewOf(list, state) };
      onCommit(result.commit.value, result.commit.label);
      return { handled: true, view: null };
    },
    clicked(value) {
      const option = options.find((o) => o.value === value);
      if (option) onCommit(option.value, option.label);
    },
  };
}
