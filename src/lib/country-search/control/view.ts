// @level presentation
import { countryClasses, matchOptions, notices, type Dataset, type FieldOption } from "permit-rulebook-data";
import {
  NOTE_APPLIES_HINT, countriesToSearchLine, matchesHighlightedLine, moreMatchesLine,
} from "../../copy/interview.js";
import { esc, escAttr } from "../../reason.js";
import { activeOption, composeNoMatchLine, rowId, shownOptions, type ListboxState } from "./listbox.js";

/** The question's field and the dataset its rows' class hints are read from. */
export interface ClassedField {
  dataset: Dataset;
  field: string;
}

/** What the rows mark besides their names: the answer on file, ticked, and
 * each row's country class, where the options carry one. */
export interface RowMarks {
  chosen: string | undefined;
  classed: ClassedField | null;
}

/** What the box and the list show for one state of the search. */
export interface SearchView {
  listHtml: string;
  /** What the live region reads; empty when the list is closed or untouched. */
  status: string;
  /** The highlighted row's id, for `aria-activedescendant`; null when none is. */
  activeRowId: string | null;
  /** Whether the list is open on a query. */
  expanded: boolean;
}

/** What an option's class reads as beside it. Derived from the dataset —
 * the class the option implies, or the fact that a notice would fire on
 * this answer — never a string keyed to one country. A notice that adds
 * rights says so in its own title, so the hint names none. */
function classHint({ dataset, field }: ClassedField, option: FieldOption): string {
  const extra = notices(dataset, { [field]: option.value }).find((n) => n.kind === "extra-rights");
  if (extra) return NOTE_APPLIES_HINT;
  const cls = option.implies?.[0];
  return cls ? (countryClasses[cls]?.label ?? cls) : "";
}

/** The options searched, and what their rows mark. */
export interface SearchedList {
  options: FieldOption[];
  marks: RowMarks;
}

function rowHtml(option: FieldOption, row: { index: number; active: boolean }, marks: RowMarks): string {
  const chosen = marks.chosen === option.value;
  return `<button class="copt${row.active ? " on" : ""}${chosen ? " sel" : ""}" role="option" id="${escAttr(rowId(row.index))}"
                aria-selected="${escAttr(String(row.active))}" data-value="${escAttr(option.value)}"><span>${esc(option.label)}${
                chosen ? ` <span class="tick" aria-hidden="true">✓</span>` : ""}</span>${
                marks.classed ? `<span class="cls">${esc(classHint(marks.classed, option))}</span>` : ""}</button>`;
}

/** The ranked rows, the highlight on one of them, and the count of what the
 * list leaves out. */
function rowsView({ options, marks }: SearchedList, state: ListboxState, matches: number): SearchView {
  const shown = shownOptions(options, state);
  const rows = shown.map((option, index) => rowHtml(option, { index, active: index === state.active }, marks));
  const more = matches > shown.length ? `<p class="cmore">${esc(moreMatchesLine(matches - shown.length))}</p>` : "";
  return {
    listHtml: rows.join("") + more,
    status: matchesHighlightedLine(matches, activeOption(options, state)?.label),
    activeRowId: state.active >= 0 ? rowId(state.active) : null,
    expanded: true,
  };
}

export function viewOf(list: SearchedList, state: ListboxState): SearchView {
  const expanded = state.open && state.query.trim() !== "";
  // An untouched or closed box shows no rows: typing finds a country by any
  // of its names, so opening on sixty rows is noise (tracker #4).
  if (!expanded) {
    const listHtml = `<p class="cnone">${esc(countriesToSearchLine(list.options.length))}</p>`;
    return { listHtml, status: "", activeRowId: null, expanded };
  }
  const matches = matchOptions(list.options, state.query).length;
  if (matches > 0) return rowsView(list, state, matches);
  // An empty list says what to do about it, or, for a territory, whose
  // passport its people hold (#160).
  const said = composeNoMatchLine(state.query);
  return { listHtml: `<p class="cnone">${esc(said.line)}</p>`, status: said.status, activeRowId: null, expanded };
}
