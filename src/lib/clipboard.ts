/**
 * The address on `/feedback/`, which copies itself when tapped.
 *
 * On the human's walk the address was a `mailto:` link, and on their desktop a
 * `mailto:` opens nothing — so the one thing a reader in that position needs,
 * the address on their clipboard, took a careful drag-select. The line is
 * plain text now, with a button that copies it ("tamamdır", 2026-09-16).
 *
 * The script is generic: it reads the text of the element the button's
 * `aria-controls` names (the address span inside it), and on success writes
 * the button's own `data-done` word into the element right after the button
 * — the `.done` span the page puts there, which is why it is the next
 * sibling and not an id: the word belongs to the button it follows. It names
 * no address, no word and no page; it stores nothing and sends nothing. It is a string, like the menu script, because
 * the page is built as one — and it is hashed into the site's one policy
 * beside the other two.
 *
 * Where the clipboard is not offered (an insecure context, an old browser) or
 * the write is refused, the address is selected in place instead, so Ctrl+C
 * does what the button could not.
 */
export const COPY_SCRIPT = `
  (() => {
    for (const button of document.querySelectorAll("[data-copy]")) {
      const target = document.getElementById(button.getAttribute("aria-controls"));
      if (!target) continue;
      const said = button.nextElementSibling;
      if (!said || !said.classList.contains("done")) continue;
      let timer = 0;
      const select = () => {
        const range = document.createRange();
        range.selectNodeContents(target);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      };
      button.addEventListener("click", () => {
        const text = target.textContent.trim();
        const write = navigator.clipboard && navigator.clipboard.writeText
          ? navigator.clipboard.writeText(text)
          : Promise.reject(new Error("no clipboard"));
        write.then(() => {
          said.textContent = button.getAttribute("data-done");
          clearTimeout(timer);
          timer = setTimeout(() => { said.textContent = ""; }, 2000);
        }, select);
      });
    }
  })();
`;
