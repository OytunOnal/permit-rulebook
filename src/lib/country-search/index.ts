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
export { countrySearchOf, type CountrySearch, type KeyOutcome, type SearchKey } from "./control/controller.js";
export { QUERY_MAX_LENGTH } from "./control/listbox.js";
export { countrySearchHtml, hasClasses } from "./control/markup.js";
export { mountCountrySearch } from "./control/mount.js";
export type { ClassedField, RowMarks, SearchView } from "./control/view.js";
