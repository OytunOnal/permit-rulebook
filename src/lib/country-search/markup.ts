// @level presentation
import type { FieldOption, Question } from "permit-rulebook-data";
import { ANSWER_ON_FILE, PASSPORT_CLASSES_HINT, SEARCH_BOX_LABEL, SEARCH_BOX_PLACEHOLDER } from "../copy/interview.js";
import { esc, escAttr } from "../reason.js";
import { QUERY_MAX_LENGTH } from "./listbox.js";

/** Whether this question's options carry a country class. The card says so
 * once in a hint; the list the search draws says it row by row. */
export const hasClasses = (question: Question): boolean => question.options.some((o) => o.implies !== undefined);

/**
 * The box and its empty list, as the question card draws them: the passport on
 * file stands in the box and is named under it. The indentation is the card's,
 * so the card reads the same whichever file drew it.
 */
export function countrySearchHtml(question: Question, declared: FieldOption | undefined): string {
  const hint = hasClasses(question) ? `<p class="hint">${esc(PASSPORT_CLASSES_HINT)}</p>` : "";
  return `
            <div class="csearch">
              <span class="mag" aria-hidden="true">⌕</span>
              <input type="text" id="cfilter" autocomplete="off" spellcheck="false" maxlength="${escAttr(String(QUERY_MAX_LENGTH))}"
                role="combobox" aria-expanded="false" aria-autocomplete="list"
                aria-label="${escAttr(SEARCH_BOX_LABEL)}" aria-controls="clist" placeholder="${escAttr(SEARCH_BOX_PLACEHOLDER)}"
                value="${escAttr(declared?.label ?? "")}">
            </div>
            <div class="clist" id="clist" role="listbox" aria-label="${escAttr(question.label)}"></div>
            <p class="recorded" id="crecorded"${declared ? "" : " hidden"}>${esc(ANSWER_ON_FILE)} <b>${esc(declared?.label ?? "")}</b></p>
            ${hint}`;
}
