// @level presentation
import { RECORD_MAX_LENGTH, STORAGE_KEY } from "./record.js";

/**
 * The interview's first paint, owned end to end: the covers, the stylesheet
 * rules keyed to them, the seeds, the threshold, and the one step that takes
 * the covers off.
 *
 * s10 put the first question in the HTML, and the interview stopped moving.
 * What still moved was everything the module decided AFTER the HTML had
 * painted: the masthead's promise shortens for a reader who has answered
 * something, and the declaration panel folds away on a narrow screen. Both
 * decisions were taken 700 ms late, when the 220 KB module landed, and both
 * moved the page under a reader who was already reading it — the footer by
 * 44 to 140 px at 390x1400, which is only out of frame at 390x844 (Spec
 * review, 2026-09-15).
 *
 * So the decisions are taken before the first paint instead, by the smallest
 * script that can take them: it reads the two things the module would read —
 * the record, and the link the reader followed — plus the width, and writes
 * what it found on `<html>`. The stylesheet below does the rest, so the page
 * paints in the shape the module would have chosen and the module arrives to
 * a page that needs nothing done to it.
 *
 * Six things leave this file: the head script (inline in `<head>` because it
 * must run before the first paint, and hashed into the policy like the menu's
 * script), the stylesheet the page inlines beside it, the threshold as a width
 * and as a media query, the set of covers, and `takeCoversOff`. Everything the
 * script reads, it reads from where the module reads it.
 *
 * What it writes on `<html>` is three kinds of thing, each with one writer
 * after the first paint:
 * - `data-cover`, the cover (see `COVERS`): written by the head script only,
 *   removed by `takeCoversOff` only;
 * - `data-promise`, the masthead's standing promise, `fresh` or `started`: the
 *   page's own state, which the interview writes on every question screen and
 *   the head script seeds;
 * - `data-answered` and `data-narrow`, the ledger's two seeds: the head script
 *   seeds them and the interview's own decisions write them after.
 */

/**
 * The width from which the ledger is a fixed panel rather than a disclosure,
 * written once for the first paint: the head script's query, the stylesheet's
 * narrow rule, the page's live ledger and the browser gate's viewports all
 * read it from here. The site's own layout breakpoint, in the page's
 * stylesheet, is a separate copy.
 */
export const WIDE_FROM_PX = 761;
export const WIDE_QUERY = `(min-width: ${WIDE_FROM_PX}px)`;
const NARROW_MEDIA = `(max-width:${WIDE_FROM_PX - 1}px)`;

/** How a cover hides a part: in place, keeping its room; out of the flow,
 * taking none; or, for the masthead, only the rule it draws under itself. */
type Hiding = "in place" | "no room" | "its rule";
const HIDING: Record<Hiding, string> = {
  "in place": "visibility:hidden",
  "no room": "display:none",
  "its rule": "border-bottom-color:transparent",
};

/** Where a stand-in stands while its cover is on: over the box, which keeps
 * its room because the card under it is hidden in place; or in the masthead,
 * under the eyebrow, where the reader's headline is about to be (s31). */
type Standing = "over the box" | "in the masthead";

interface Cover {
  /** What the cover hides of the page the build painted, by selector. */
  readonly hides: Readonly<Record<string, Hiding>>;
  /** The stand-in it uncovers, by class, and where that line stands. */
  readonly uncovers: { readonly standIn: string; readonly standing: Standing };
}

/** What the two covers whose stand-in stands over the box hide: question
 * one's contents in place, so the box keeps its height, and the footer and
 * the ledger's count until the module draws. */
const HIDDEN_UNDER_A_BOX_STAND_IN = {
  ".qcard > *": "in place", "footer.site-foot": "no room", "#decl-count": "in place",
} as const satisfies Record<string, Hiding>;

/**
 * Every cover the head script can write, and the stylesheet's cover rules are
 * rendered from this set and from nothing else.
 *
 * `record` — answers are on this device, so the box says the answers are
 * coming back. `link` — they pressed "Check yours" on a country or route page,
 * which has answered question one for them but may be everything they have
 * answered, so the box says only that it is setting up. Both stand-ins sit
 * OVER question one rather than in place of it: the card keeps its height
 * because its contents are still there, only hidden, so the box those readers
 * meet is the box a fresh visit meets and nothing below it moves (s10). The
 * screen the module then draws for them is not that box's height, so the
 * footer takes no room until it does, and appears at the page's end, where it
 * stays; and the ledger's count, which says "nothing yet" until the module
 * writes theirs, is unseen until then (#66).
 *
 * `verdict` — the record says the interview was finished, so their screen is a
 * verdict and nothing the build painted is theirs but the frame. The
 * masthead's question is not their headline, and the verdict's has no one
 * shape a stylesheet could reserve — one to three lines, and a subline of two
 * to five, by what the rules said (measured 2026-09-16, s22). The card is not
 * their screen, and the ledger and the footer are about to be carried
 * thousands of pixels down by the routes. They take no room at all until the
 * module draws, because covered in place they would leave a thousand pixels
 * of blank between the eyebrow and the line, and the blank reads as a
 * failure; the line stands in the masthead directly under the eyebrow. The
 * rule under the masthead goes with them: the masthead's height is the
 * verdict's, and a line that moved with it would be the one thing left to
 * watch (s31).
 *
 * A fresh visit gets no cover: the page the build painted is already right.
 */
export const COVERS = {
  record: {
    hides: HIDDEN_UNDER_A_BOX_STAND_IN,
    uncovers: { standIn: "stand-in-record", standing: "over the box" },
  },
  link: {
    hides: HIDDEN_UNDER_A_BOX_STAND_IN,
    uncovers: { standIn: "stand-in-link", standing: "over the box" },
  },
  verdict: {
    hides: {
      "#headline": "no room", "#subline": "no room", "#stamp": "no room", "#app": "no room",
      "footer.site-foot": "no room", ".masthead-with-stamps": "its rule",
    },
    uncovers: { standIn: "stand-in-verdict", standing: "in the masthead" },
  },
} as const satisfies Record<string, Cover>;

/**
 * The head script.
 *
 * The two started readers are told apart because the sentence for one is false
 * for the other: a reader with no answers cannot have answers brought back
 * (human's walk, 2026-09-15). A record wins over a link, because a reader who
 * has both does have answers on the device.
 *
 * The finished reader is told apart by one key of the record, read as the
 * product wrote it: `done`, true when the interview had nothing left to ask.
 * Reading it costs a `JSON.parse` of a few hundred bytes, and nothing else in
 * the record is looked at — the answers stay the module's business. A record
 * that does not parse is still a record: the module decides what it is.
 *
 * `data-answered` says the reader has answered something (a record, or the
 * link that answered question one), so on a phone the ledger line already
 * stands above the question, where the module will keep it (s30, amendment
 * 6) — for the first screen even when the link's code is one the page does
 * not know: the head seeds the first paint, and the module writes it from its
 * own count only from the first gesture on. `data-narrow` says the ledger is a
 * disclosure here, and a closed one.
 *
 * Nothing here says anything a module could not work out; it says it early
 * enough to matter, and it names nothing from the dataset — no country, no
 * route — because this string is inlined into the page, where nothing checks
 * a name against the dataset.
 *
 * The record is looked for under the current key only. The module still reads
 * the pre-rename one and carries it across, but its name is the working name
 * this product buried, and this script is INLINED into the page — where the
 * working name may not appear at all (s6 decision 1, and the sweep that holds
 * it). The cost is one masthead swap for whoever still has a record from
 * before the rename and has not answered anything since.
 */
export const FIRST_PAINT_SCRIPT = `
  (() => {
    const page = document.documentElement;
    let cover = /[?&](country|route)=/.test(location.search) ? "link" : "";
    try {
      const raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
      if (raw && raw.length <= ${RECORD_MAX_LENGTH}) {
        cover = "record";
        try { if (JSON.parse(raw).done === true) cover = "verdict"; } catch { /* the module decides */ }
      }
    } catch { /* a browser that refuses site data is a reader with no record */ }
    if (cover) page.dataset.cover = cover;
    page.dataset.promise = cover ? "started" : "fresh";
    if (cover === "record" || cover === "link") page.dataset.answered = "";
    if (!matchMedia(${JSON.stringify(WIDE_QUERY)}).matches) page.dataset.narrow = "";
  })();
`;

type CoverName = keyof typeof COVERS;

const coverSelector = (cover: CoverName) => `[data-cover=${JSON.stringify(cover)}]`;

/** The stand-in's own rules, by where it stands. */
const STAND_IN_RULES: Record<Standing, (cover: CoverName, standIn: string) => string> = {
  "over the box": (cover, standIn) =>
    `${coverSelector(cover)} #main{position:relative}
${coverSelector(cover)} .${standIn}{display:flex;position:absolute;inset:0;align-items:center;justify-content:center;
  margin:0;padding:1.6rem 1.8rem;text-align:center;color:var(--color-muted);font-size:.92rem}`,
  "in the masthead": (cover, standIn) => `${coverSelector(cover)} .${standIn}{display:block;margin-top:.5rem}`,
};

function coverRules(name: CoverName): string {
  const cover: Cover = COVERS[name];
  const partsByHiding = new Map<Hiding, string[]>();
  for (const [part, how] of Object.entries(cover.hides))
    partsByHiding.set(how, [...(partsByHiding.get(how) ?? []), part]);
  const hidden = [...partsByHiding]
    .map(([how, parts]) => `${parts.map((p) => `${coverSelector(name)} ${p}`).join(",")}{${HIDING[how]}}`);
  return [...hidden, STAND_IN_RULES[cover.uncovers.standing](name, cover.uncovers.standIn)].join("\n");
}

/**
 * Every stylesheet rule keyed to a cover, to a seed or to the threshold, for
 * the page to inline in `<head>`. The policy's `style-src` already allows
 * inline styles.
 *
 * The standing promise: both of the masthead's promises are painted, in one
 * cell, and one is shown while the other is hidden in place, so the masthead is
 * always the height of the longer one. Which one shows is seeded before the
 * first paint, but the seed cannot always be the page's word: a link whose
 * code the site no longer knows is painted as a reader who has started, and
 * the module finds nothing answered. Swapping promises of two heights moved
 * the whole interview under the reader (s10; #13), and the head cannot know
 * the codes without naming the dataset.
 *
 * The ledger ships open — that is what a reader with no script should get —
 * and on a narrow screen it is folded away here until the module closes it
 * properly, in the same task it takes the seed down. On a narrow screen, once
 * something is answered, the ledger line stands above the question and above
 * the verdict (s30, amendments 6–7).
 */
export const FIRST_PAINT_STYLE = [
  ".stand-in{display:none}",
  ...(Object.keys(COVERS) as CoverName[]).map(coverRules),
  ".standing-promise{display:grid}",
  ".standing-promise > *{grid-area:1/1}",
  ".sub-started{visibility:hidden}",
  `[data-promise="started"] .sub-fresh{visibility:hidden}`,
  `[data-promise="started"] .sub-started{visibility:visible}`,
  "[data-narrow] #decl[open] > :not(summary){display:none}",
  "[data-narrow] #decl[open] > summary{margin-bottom:0}",
  `@media ${NARROW_MEDIA}{[data-answered] .decl{order:0}}`,
].join("\n");

/**
 * Take every cover off. The page calls it once, in the task that draws the
 * reader's first screen, so nothing is painted between the two and no cover
 * outlives that screen: a cover left standing under a verdict would have the
 * reader's next correction draw a question card with every child invisible.
 * It touches the cover alone: the standing promise and the seeds are the
 * page's.
 */
export function takeCoversOff(root: { dataset: Record<string, string | undefined> }): void {
  delete root.dataset.cover;
}
