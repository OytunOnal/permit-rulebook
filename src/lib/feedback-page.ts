// @level presentation
import type { Dataset } from "permit-rulebook-data";
import { esc, escAttr } from "./reason.js";
import { framedPageHtml } from "./frame/framed-page.js";
import { siteReadDate } from "./country-page.js";
import {
  COPIED, COPY_ADDRESS_LABEL, FEEDBACK_DOORS, FEEDBACK_EYEBROW, FEEDBACK_GITHUB_HEADING, FEEDBACK_GITHUB_LINE,
  FEEDBACK_LEDE, FEEDBACK_META_DESCRIPTION, FEEDBACK_NOTE, FEEDBACK_OWN_APP, FEEDBACK_OWN_APP_LEAD, TRACKER_NEW_NEED,
  TRACKER_WRONG_VALUE, feedbackTemplateLine, type FeedbackDoor,
} from "./copy/feedback.js";
import { FEEDBACK, PRODUCT_NAME } from "./copy/frame.js";
import {
  FEEDBACK_ADDRESS, FEEDBACK_PATH, GMAIL_COMPOSE_URL, NEW_NEED_URL, TRACKER_URL,
} from "./site.js";
import { rulesRead } from "./identity.js";
import { COPY_SCRIPT } from "./clipboard.js";
import FEEDBACK_PAGE_RULES from "./feedback-page.css?raw";

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
 * query string and no screen: the mail carries nothing the reader declared,
 * held by construction rather than by care (`tests/s13.test.ts`), and it is
 * the bound that replaced "the GitHub account
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
  const content = `<div class="masthead-with-stamps">
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
  </main>`;

  const html = framedPageHtml(dataset, {
    title, meta: { description: desc, path: FEEDBACK_PATH, kind: "website" }, css: FEEDBACK_PAGE_RULES,
    place: { here: FEEDBACK_PATH }, content, scripts: [COPY_SCRIPT],
  });
  return { path: FEEDBACK_PATH, title, description: desc, html };
}
