// @level presentation
/**
 * `/feedback/`'s own words (`lib/feedback-page.ts`).
 *
 * Every word a reader reads lives in this folder, one file per screen or
 * part (CODING_STANDARDS.md, Rules).
 */

/** The eyebrow, the lede and the h1 of `/feedback/`, as the mock draws them. */
export const FEEDBACK_EYEBROW = "Read by a person.";
export const FEEDBACK_LEDE =
  "One address, three kinds of mail. The link fills in the subject and a few headings; the rest is yours. "
  + "Nothing you declared in the interview is sent.";
/** What a search result and a link preview say about the page. */
export const FEEDBACK_META_DESCRIPTION =
  "One address, three kinds of mail: a value is wrong, something is missing, or anything else. "
  + "A person reads every mail, and nothing you declared in the interview is ever sent.";

/**
 * One of the three kinds of mail the page offers.
 *
 * `subject` and `body` are the whole of what a `mailto:` carries: the link is
 * built from these strings and from the address, and from nothing else. The
 * record never enters one — that is the bound the 2026-09-16 decision put in
 * place of "the GitHub account requirement is said before the click", and it
 * holds here by construction rather than by care, because this file cannot see
 * a reader's answers.
 */
export interface FeedbackDoor {
  heading: string;
  line: string;
  button: string;
  subject: string;
  /** The headings written into the mail's body, one per line. Empty for a note
   * of any length, which is a blank sheet on purpose. */
  body: string[];
}

export const FEEDBACK_DOORS: readonly FeedbackDoor[] = [
  {
    heading: "Something is wrong",
    line: "The page says one thing; the source says another.",
    button: "Report what is wrong",
    subject: "Wrong information",
    body: ["Page:", "What it says:", "What the source says:", "Where (link):"],
  },
  {
    heading: "Something is missing",
    line: "A route, a question, a country, a case.",
    button: "Say what is missing",
    subject: "Missing",
    body: ["What:", "Where you looked for it:"],
  },
  {
    // The human's own amendment to the drawing: the draft's "Confusing, useful,
    // broken, kind — anything / Write anything" said nothing about what the
    // maker wants to hear (2026-09-16).
    heading: "Anything else",
    line: "What helped, what confused you, what you would want next — a note of any length.",
    button: "Write a note",
    // The subject is the door's, not the button's: "Subject: Note bu note
    // değil feedback" (the human's walk, 2026-09-16).
    subject: "Feedback",
    body: [],
  },
];

/**
 * The site's door for a wrong value, wherever a page offers one — `/data/`'s
 * Take it and every route page's data door. Those two linked the tracker under
 * the footer's old verb for a day after s13 had moved the tracker to
 * `/feedback/`; now they say the first door's own button and lead to the page
 * it is on (s16). Derived from the door, not typed beside it: one action keeps
 * one name across the site.
 */
export const WRONG_DOOR_LABEL = FEEDBACK_DOORS[0]!.button;

/**
 * What the reader is told the mail will carry, before they click it.
 *
 * Derived from the door rather than typed beside it: a line that says the mail
 * holds one thing while the link writes another is worse than no line at all,
 * and the critique's own praise for F was that the reader knows the contents
 * before the click (2026-09-16).
 */
export const feedbackTemplateLine = (door: FeedbackDoor): string =>
  [`Subject: ${door.subject}`, ...door.body.map((h) => h.replace(/:$/, ""))].join(" · ");

/**
 * The second link under each button — the same template as a `mailto:`, for
 * a reader whose mail is not Gmail, or who is on a phone (decision,
 * 2026-09-16). The lead word is the sentence's and the link is the rest.
 */
export const FEEDBACK_OWN_APP_LEAD = "or";
export const FEEDBACK_OWN_APP = "with your own mail app";

/** What happens to a mail, said once, under the address — and, first, what
 * the two links do, because on the preview both were a mystery until one of
 * them opened nothing. */
export const FEEDBACK_NOTE =
  "The button opens Gmail. If Gmail is not yours, the second link opens your mail app; if that opens "
  + "nothing, tap the address to copy it. A person reads every mail. Something wrong, "
  + "confirmed against its source, "
  + "is changed and the change gets a history line with the date. No reply is promised; a fix is the reply.";

/**
 * The address is a button that copies itself, with a copy glyph beside it and
 * no visible word: this is its accessible name. What it says for two seconds
 * after it has worked rides on the button as `data-done`, so the script that
 * writes it names no string of its own (the human's walk, 2026-09-16: the
 * address as a `mailto:` opened nothing on their desktop; a "Copy" word beside
 * it was too loud, then not loud enough — the glyph is the third drawing).
 */
export const COPY_ADDRESS_LABEL = "Copy the address";
export const COPIED = "Copied";

/** The tracker, beside the address and named as what it is — not hidden, not
 * first (decision, 2026-09-16). */
export const FEEDBACK_GITHUB_HEADING = "If you have a GitHub account";
export const FEEDBACK_GITHUB_LINE =
  "The tracker is where changes are recorded in public and where contributors work. The same things can go "
  + "there instead:";
/** The tracker's two doors, in the verbs the footer used to carry, so one
 * action keeps one name across the site. */
export const TRACKER_WRONG_VALUE = "Report a wrong value";
export const TRACKER_NEW_NEED = "Suggest a route or a change";
