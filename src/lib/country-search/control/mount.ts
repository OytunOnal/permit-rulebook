// @level presentation
import type { CountrySearch } from "./controller.js";
import type { SearchView } from "./view.js";

/**
 * The search's DOM: three listeners that hand typing, a key and a click to the
 * controller and apply the view it returns to the box, the list and the
 * page's live region. Nothing is decided here.
 */
export function mountCountrySearch(root: Element, search: CountrySearch): void {
  const box = root.querySelector<HTMLInputElement>("#cfilter")!;
  const list = root.querySelector<HTMLElement>("#clist")!;
  const status = root.ownerDocument.getElementById("cstatus");
  const apply = (view: SearchView) => {
    box.setAttribute("aria-expanded", String(view.expanded));
    list.innerHTML = view.listHtml;
    if (view.activeRowId) box.setAttribute("aria-activedescendant", view.activeRowId);
    else box.removeAttribute("aria-activedescendant");
    if (status) status.textContent = view.status;
    list.querySelector<HTMLElement>(".copt.on")?.scrollIntoView({ block: "nearest" });
  };
  box.addEventListener("input", () => apply(search.typeQuery(box.value)));
  box.addEventListener("keydown", (e) => {
    const outcome = search.pressKey({ key: e.key, isComposing: e.isComposing });
    if (!outcome.handled) return;
    e.preventDefault();
    if (outcome.view) apply(outcome.view);
  });
  list.addEventListener("click", (e) => {
    const row = (e.target as Element).closest<HTMLElement>(".copt");
    if (row?.dataset.value) search.clickRow(row.dataset.value);
  });
  apply(search.typeQuery(box.value));
}
