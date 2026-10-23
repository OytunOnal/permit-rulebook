// @level presentation
/**
 * The passport search: a long list asked as a filter over its options rather
 * than as a wall of buttons, and still a choice from the dataset's own
 * options — no free text, no guessing at spellings.
 *
 * The question card draws the box with `countrySearchHtml`. The controller,
 * `countrySearchOf`, holds no DOM, so what typing, a key and a click do is
 * read by a test in Node; `mountCountrySearch` only applies the views it
 * returns.
 */
export { countrySearchOf, type CountrySearch, type KeyOutcome, type SearchKey } from "./controller.js";
export { QUERY_MAX_LENGTH } from "./listbox.js";
export { countrySearchHtml, hasClasses } from "./markup.js";
export { mountCountrySearch } from "./mount.js";
export type { ClassedField, RowMarks, SearchView } from "./view.js";
