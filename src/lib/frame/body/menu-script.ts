// @level presentation

/**
 * The menu, in the one behaviour the mock walks: toggle, focus the first item
 * on opening, Escape closes it and gives the focus back, and choosing
 * something closes it. Shipped as a string because four of the five pages are
 * built as strings; the interview inlines the same one.
 *
 * s13 gave it a second thing to close: the header's `<details>`. It opens
 * without script and the keyboard reaches it, but a disclosure that opens over
 * the page and closes only by a second tap on its own word is not what a reader
 * expects — so Escape and a tap outside close it here, beside the menu they
 * already close. Everything it does it does by element and by attribute: no
 * country name is written into this script, and nothing it touches is
 * remembered anywhere — the button's own word included, which it reads off
 * the button's `data-word-*` attributes and swaps with `aria-expanded`, so
 * the control says what a tap will do (s27).
 *
 * On a phone the disclosure is not a disclosure: the menu shows the four
 * countries as rows under their heading, so opening the menu opens the groups
 * inside it and closing the menu closes them again.
 */
export const MENU_SCRIPT = `
  (() => {
    const button = document.querySelector(".menu");
    const nav = button && document.getElementById(button.getAttribute("aria-controls"));
    if (!button || !nav) return;
    const groups = [...nav.querySelectorAll("details")];
    const set = (open) => {
      // The groups first: the item the focus moves to is inside one of them.
      for (const group of groups) group.open = open;
      button.setAttribute("aria-expanded", String(open));
      button.textContent = open ? button.dataset.wordOpen : button.dataset.wordClosed;
      nav.classList.toggle("open", open);
      if (open) { const first = nav.querySelector("a"); if (first) first.focus(); }
    };
    const isOpen = () => button.getAttribute("aria-expanded") === "true";
    button.addEventListener("click", () => set(!isOpen()));
    // Escape works from anywhere while the menu is open, not only from inside
    // it: a reader who has tabbed out, or never tabbed in, still has the way
    // out every menu has (Standards review, 2026-09-08). With the menu closed
    // it is the open group it closes, and the focus goes back to the word that
    // opened it.
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (isOpen()) { set(false); button.focus(); return; }
      for (const group of groups) {
        if (!group.open) continue;
        group.open = false;
        const word = group.querySelector("summary");
        if (word) word.focus();
      }
    });
    // And a tap anywhere outside closes it, which is what a reader expects of
    // something that opened over the page.
    document.addEventListener("click", (e) => {
      if (!isOpen()) {
        // The menu is not the thing that is open: a group may be, and a tap
        // anywhere but inside it closes it.
        for (const group of groups)
          if (group.open && !group.contains(e.target)) group.open = false;
        return;
      }
      if (nav.contains(e.target)) { if (e.target.closest("a")) set(false); return; }
      if (button.contains(e.target)) return;
      set(false);
    });
  })();
`;
