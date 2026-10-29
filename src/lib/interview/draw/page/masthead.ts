// @level presentation
/**
 * The masthead and the stamp beside it. One masthead, one writer: which
 * screen a gesture leads to is `interviewAfter`'s, where a property test walks
 * every gesture in every order, so no path back into the interview can leave a
 * claim about a comparison standing (product-critique v0.7, B4).
 */
import { isoDay, RECORD_GENERATED, RULES_READ } from "../../../copy/frame.js";
import type { Masthead, VerdictMasthead } from "../../../screen.js";
import type { InterviewPage } from "./page.js";
import { draw, say } from "./paint.js";

/**
 * The stamp says which fact the screen stands on: on the questions, the
 * dataset's newest read date, the sentence a route page carries; on the
 * verdict, the day this record was made, in local time, the day the person in
 * front of it is having. ISO, like every date the product prints (decision 12).
 */
export function setStamp(page: InterviewPage, kind: "rules-read" | "record"): void {
  const { stampLabel, stampDate, stampTime } = page.els;
  const record = kind === "record";
  stampLabel.textContent = record ? RECORD_GENERATED : RULES_READ;
  const day = record ? isoDay(new Date()) : page.rulesRead;
  stampDate.textContent = day;
  stampTime.setAttribute("datetime", day);
}

/**
 * Writes a screen's masthead. A question screen's is the question card's,
 * with the standing promise its screen says; a verdict carries the one the
 * verdict composed, and no standing promise (`standing` null).
 */
export function writeMasthead(
  page: InterviewPage, m: Masthead & Pick<VerdictMasthead, "sublineHtml">, standing: "started" | "fresh" | null,
): void {
  const { headline, subline, root } = page.els;
  draw(headline, m.headline);
  // The build painted both standing promises and the pre-paint script seeded
  // which one shows, so a question screen sets the same attribute rather than
  // writing the text. A verdict's subline counts what was compared, so it is
  // written, and the two spans are gone for good. They are looked for by
  // name: a verdict's subline may carry a link of its own (s19).
  if (standing !== null && subline.querySelector(".sub-fresh")) {
    if (root.dataset.promise !== standing) root.dataset.promise = standing;
    return;
  }
  // The one subline that carries a link, the door to the quoted route, is
  // drawn as the markup the verdict composed; every other is written as text.
  if (m.sublineHtml !== undefined) draw(subline, m.sublineHtml);
  else say(subline, m.subline);
}
