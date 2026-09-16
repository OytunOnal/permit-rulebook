import type { Dataset } from "permit-rulebook-data";
import { esc, escAttr } from "./reason.js";
import { contentSecurityPolicy } from "./csp.js";
import { PAGE_CSS } from "./route-page.js";
import { footerFacts, navCountries, siteReadDate } from "./country-page.js";
import {
  COPIED, COPY_ADDRESS_LABEL,
  FEEDBACK, FEEDBACK_DOORS, FEEDBACK_EYEBROW, FEEDBACK_GITHUB_HEADING, FEEDBACK_GITHUB_LINE,
  FEEDBACK_LEDE, FEEDBACK_META_DESCRIPTION, FEEDBACK_NOTE, FEEDBACK_OWN_APP, FEEDBACK_OWN_APP_LEAD,
  PRODUCT_NAME, TRACKER_NEW_NEED, TRACKER_WRONG_VALUE,
  feedbackTemplateLine, type FeedbackDoor,
} from "./copy.js";
import {
  FEEDBACK_ADDRESS, GMAIL_COMPOSE_URL, NEW_NEED_URL, TRACKER_URL, analyticsBeacon, headMeta,
} from "./site.js";
import { FEEDBACK_PATH, MENU_SCRIPT, iconLinks, rulesRead, siteFooter, siteHeader } from "./identity.js";
import { COPY_SCRIPT } from "./clipboard.js";

/**
 * `/feedback/` — the door, on a page of the site's own.
 *
 * A reader may want to say something *without anything being wrong*, and until
 * this page the only way in needed a GitHub account on a tracker whose blank
 * issues are switched off (site #7). So the door became an address (decision,
 * 2026-09-16) and moved to where it can be seen: the header's word, the footer
 * column and the line under the verdict all arrive here.
 *
 * Three kinds of mail, the address in plain text beside them, what happens to a
 * mail, and the tracker beneath under its own heading — beside, named, not
 * first. It is not a form and not a backend: no request leaves this page, and
 * nothing on it is remembered.
 */

export interface FeedbackPage {
  path: string;
  title: string;
  description: string;
  html: string;
}

/**
 * The link one door opens — the whole of what a mail carries before the reader
 * types a word.
 *
 * It takes the door and nothing else. There is no record to read here, no
 * query string and no screen: that is scenario point 2 held by construction
 * rather than by care, and it is the bound that replaced "the GitHub account
 * requirement is said before the click" when the door stopped being GitHub.
 */
export const feedbackMailto = (door: FeedbackDoor): string =>
  `mailto:${FEEDBACK_ADDRESS}?subject=${encodeURIComponent(door.subject)}${
    door.body.length ? `&body=${encodeURIComponent(door.body.join("\n"))}` : ""}`;

/**
 * The same door, opened in Gmail: the button's link since the human's walk
 * found every `mailto:` inert on their desktop (decision, 2026-09-16). The
 * same subject and the same headings, in Gmail's own query — and, like its
 * sibling above, a function of the door and the constants and of nothing
 * else. `to` is the address, `su` the subject, `body` the headings; `view=cm`
 * is the compose screen and `fs=1` opens it full rather than as a pop-out.
 */
export const feedbackGmail = (door: FeedbackDoor): string =>
  `${GMAIL_COMPOSE_URL}?view=cm&fs=1&to=${encodeURIComponent(FEEDBACK_ADDRESS)}&su=${
    encodeURIComponent(door.subject)}${
    door.body.length ? `&body=${encodeURIComponent(door.body.join("\n"))}` : ""}`;

/**
 * One door: what it is for, the button that opens it in Gmail, and — under
 * it, small — the same mail through the reader's own app. The button leaves
 * the site and says so the way every outbound link here does.
 */
const doorHtml = (door: FeedbackDoor): string => `<div class="door">
        <h3>${esc(door.heading)}</h3>
        <p>${esc(door.line)}</p>
        <a class="act out tap-min" href="${escAttr(feedbackGmail(door))}" target="_blank" rel="noopener">${
    esc(door.button)}</a>
        <p class="own">${esc(FEEDBACK_OWN_APP_LEAD)} <a class="tap" href="${escAttr(feedbackMailto(door))}">${
    esc(FEEDBACK_OWN_APP)}</a></p>
        <span class="tmpl">${esc(feedbackTemplateLine(door))}</span>
      </div>`;

/**
 * The copy glyph: two overlapping rounded rectangles, the standard sign for
 * it, drawn in the current colour at the text's own size. Decorative — the
 * button's accessible name says what the tap does.
 */
const COPY_ICON = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false">'
  + '<rect x="9" y="9" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/>'
  + '<rect x="3" y="3" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/></svg>';

/** A link that leaves the site, the way every other one on it does. */
const out = (href: string, label: string): string =>
  `<a class="out tap-min" href="${escAttr(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;

/**
 * The page itself — the one page on the site that IS the door.
 *
 * The dataset is not what this page is about, and it is asked for anyway:
 * the header lists the four countries the dataset holds, the footer states the
 * span the values were read over, and the stamp in the masthead says the day
 * the rules were last read — the same three things every other built page
 * takes from it. Nothing else about a reader's answers or the routes reaches
 * this render, which is what keeps the mail links constants.
 */
export function feedbackPage(dataset: Dataset): FeedbackPage {
  const title = `${FEEDBACK} · ${PRODUCT_NAME}`;
  const desc = FEEDBACK_META_DESCRIPTION;
  const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${contentSecurityPolicy()}
${iconLinks()}
${headMeta({ title, description: desc, path: FEEDBACK_PATH, kind: "website" })}
<style>${PAGE_CSS}
/* The page's own three blocks, in the tokens the mock is drawn in. They live
   here rather than in the shared sheet, so no other page's bytes move for
   them — the same reason /data/ keeps its own two rules. */
.fb .doors { display: grid; gap: var(--gap-cards); margin: var(--space-4) 0; }
@media (min-width: 761px) { .fb .doors { grid-template-columns: 1fr 1fr 1fr; } }
.door { background: var(--color-card); border: var(--rule-soft); border-left: 3px solid var(--color-ink); padding: var(--pad-card); }
.door h3 { font: var(--text-route); margin: 0 0 var(--space-1); }
.door p { margin: 0 0 var(--space-3); color: var(--color-muted); }
.door a.act { padding: 0 var(--space-3); border: 1.5px solid var(--color-ink); background: var(--color-bg); color: var(--color-ink); text-decoration: none; font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; }
.door a.act:hover, .door a.act:focus-visible { border-color: var(--color-stamp); color: var(--color-stamp); }
.door a.out::after { content: " \\2197"; color: var(--color-muted); }
/* The second way in, small and under the button: the reader's own mail app,
   for whom Gmail is not theirs. Its link reaches the tap floor by the route
   page's own recipe (a.tap), so the line stays one line tall. */
.door .own { margin: var(--space-2) 0 0; font-size: .88rem; color: var(--color-muted); }
.door .own a { color: var(--color-ink); }
/* What the mail will carry, said before the click — the reason the critique
   called this door honest (2026-09-16). It is mono because it is a template,
   and it breaks where its own separators are. */
.door .tmpl { display: block; margin-top: var(--space-2); font: var(--text-source); color: var(--color-muted); }
/* The fallback for a desktop whose mailto: opens nothing: the address itself,
   on a line of its own, as a button that copies itself — the text and a copy
   glyph beside it, and nothing else visible (the human's walk, 2026-09-16: as
   a link it opened nothing there; a bordered "Copy" beside it was far too
   loud; a small "Copy" word was the wrong thing to tap. Tap the address.).
   The button is text-like, in the address's own register, and the tap floor
   stays invisibly: the route page's a.tap recipe — the box is 44 px tall and
   the margin gives back what the box added, so the line box stays 1.6em. */
.fb .addr { display: flex; flex-wrap: wrap; align-items: center; margin: 0; }
.fb .addr .addr-copy { display: inline-flex; align-items: center; gap: var(--space-2); min-height: var(--tap-min); margin: calc((1.6em - var(--tap-min)) / 2) 0; padding: 0; border: 0; background: none; font: var(--text-value); font-size: 1rem; color: var(--color-ink); cursor: pointer; user-select: text; }
.fb .addr .address { user-select: all; }
.fb .addr .addr-copy svg { width: 1em; height: 1em; color: var(--color-muted); }
.fb .addr .addr-copy:hover svg, .fb .addr .addr-copy:focus-visible svg { color: var(--color-stamp); }
/* The word, for two seconds after it has worked: empty at rest, so nothing
   moves when it appears — it extends the line to the right. */
.fb .addr .done { font: var(--text-source); color: var(--color-met); margin-left: var(--space-2); }
.fb .note { color: var(--color-muted); margin: 0 0 var(--space-5); max-width: var(--max-prose); }
.fb .gh { border-top: var(--rule-soft); padding-top: var(--space-3); }
.fb .gh h2 { font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-muted); margin: 0 0 var(--space-2); }
.fb .gh p { margin: 0 0 var(--space-2); max-width: var(--max-prose); }
.fb .gh a { margin-right: var(--space-4); }
/* They leave the site, and say so the way the footer's outbound links do. */
.fb .gh a.out::after { content: " \\2197"; color: var(--color-muted); }
</style>`;

  const body = `<div class="wrap">

  ${siteHeader(navCountries(dataset), { here: FEEDBACK_PATH })}

  <div class="masthead-with-stamps">
    <div>
      <p class="label">${esc(FEEDBACK_EYEBROW)}</p>
      <h1>${esc(FEEDBACK)}</h1>
      <p class="lede">${esc(FEEDBACK_LEDE)}</p>
    </div>
    ${rulesRead(siteReadDate(dataset))}
  </div>

  <main class="fb">
    <div class="doors">
      ${FEEDBACK_DOORS.map(doorHtml).join(String.fromCharCode(10))}
    </div>
    <p class="addr"><button type="button" class="addr-copy tap-min" data-copy aria-controls="feedback-address" data-done="${
    escAttr(COPIED)}" aria-label="${escAttr(COPY_ADDRESS_LABEL)}"><span class="address" id="feedback-address">${
    esc(FEEDBACK_ADDRESS)}</span>${COPY_ICON}</button><span class="done" aria-live="polite"></span></p>
    <p class="note">${esc(FEEDBACK_NOTE)}</p>
    <section class="gh" aria-labelledby="gh-h">
      <h2 id="gh-h">${esc(FEEDBACK_GITHUB_HEADING)}</h2>
      <p>${esc(FEEDBACK_GITHUB_LINE)}</p>
      ${out(TRACKER_URL, TRACKER_WRONG_VALUE)}
      ${out(NEW_NEED_URL, TRACKER_NEW_NEED)}
    </section>
  </main>

  ${siteFooter(navCountries(dataset), footerFacts(dataset))}
</div>
<script>${MENU_SCRIPT}</script>
<script>${COPY_SCRIPT}</script>
${analyticsBeacon()}`;

  return {
    path: FEEDBACK_PATH,
    title,
    description: desc,
    html: `<!doctype html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`,
  };
}
