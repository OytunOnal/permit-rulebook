# s37 — Back on a restored record

v1.2's queue head (the steward item of the s30 build, 2026-09-18). Written
2026-09-25 on `s37-restored-back`, before any code; approved when the human
says so.

## What happened

The queue line named two faults. Measured 2026-09-25 against the built site
in headless Chrome (1100 × 900), only one of them still happens:

- **A reader who arrives with a stored record and taps "← Back" leaves the
  site.** A tab visits `/data/`, the record holds three answers
  (destination, citizenship, situation), and the reader opens `/`. The
  interview restores to the fourth question (*Your highest completed
  qualification?*) and shows "← Back". The page has rebuilt its own list of
  four screens and stands on the last (`history.state` is `{ step: 3 }`),
  but the browser holds **one** entry of this interview — the arrival.
  Tapping "← Back" asks the browser to go back, and the browser goes to
  `/data/`. The interview's own button took the reader off the site.
- **"Reload mid-interview, then Back, lands on the first question" no longer
  happens.** Three questions answered live, a reload, then the screen's Back
  and the browser's Back: step 3 → 2 → 1, each on the question it named
  (*Is your work in ICT?* → *Your highest completed qualification?* → *Which
  best describes your situation?*). The reload path was mended by an earlier
  slice; this slice does not touch it and its proof keeps it mended.

Why the first happens: the page's "← Back" is `history.back()` whenever the
page's list stands past its first entry (`screens.current > 0`), because the
screen's Back and the phone's Back are one gesture (the human's rule,
2026-09-08, after a phone dropped throttled `pushState` calls and the two
Backs disagreed). After a reload the browser still holds every entry the
interview pushed, so the rule holds. After a fresh arrival it does not: the
list is rebuilt from the record, the browser has nothing behind but the page
the reader came from, and `screens.current > 0` names entries no browser
holds.

## What a reader gets

A reader who comes back to an interview they started yesterday, opens the
site and taps "← Back" sees the question before the one they are on — as they
would have mid-interview — and can keep going back through every question they
answered, one tap each. The browser's own Back (the phone's gesture, the
browser button) still leaves the site from that arrival screen, as it does on
any page the reader has just opened: they did not walk those questions in this
tab. Nothing changes for a reader who answers questions in the tab, reloads,
or has no stored record.

## What must be true

1. **The screen's Back asks the browser to go back only onto an entry the
   browser holds for this interview.** The page knows where the entries it
   can hand to `history.back()` begin: after a reload or a return through the
   browser's own history they begin at the first question (the browser kept
   them), after a fresh arrival they begin at the arrival screen (the browser
   has none behind it). Behind that point, the screen's Back takes the step
   the code already takes when nothing of ours is behind — the previous
   question in place, the entry rewritten rather than a new one added — and
   it can be repeated back to the first question.
2. **The browser's Back is untouched.** No entries are pushed on arrival to
   make the browser's history longer than the reader walked it: the phone
   that drops throttled pushes is the reason the rule exists, and a burst of
   pushes on every arrival would be that burst again. From the arrival screen
   the browser's Back leaves the site; from a screen reached by answering in
   this tab it walks back as it does today.
3. **The two Backs still agree wherever both land on a screen of ours.** On
   every screen reached by answering in this tab, the screen's Back and the
   browser's Back land on the same question, as the 2026-09-08 rule says. The
   one place they differ is the arrival screen of a restored record, where the
   browser has no screen of ours to land on — and the screen's Back going
   *somewhere of ours* is the reason it is on the interview at all.
4. **How the page tells an arrival from a reload is read, not guessed.** The
   navigation's own type (`performance.getEntriesByType("navigation")`:
   `navigate`, `reload`, `back_forward`) — or whatever the build finds more
   reliable and says why. A value the page cannot read counts as an arrival:
   stepping to the previous question in place is safe on every browser, while
   `history.back()` onto nothing leaves the site.
5. **Nothing a reader reads changes.** No string, no layout; the button is
   the same button. `copy.ts` and the dataset are untouched.
6. **The words.** `CONTEXT.md`'s interview terms say what an *arrival* is
   against a *reload* for the history, if that distinction becomes a term the
   code names.

## How it is proved

- **In a real browser against the built site** (the repository's own
  `scripts/browser.mjs`, as the other interview tests do): a tab visits
  `/data/`, the record is seeded with three answers, `/` is opened; the
  screen's Back is tapped three times and each tap shows the question before —
  *qualification* → *situation* → *citizenship* → *destination* — and
  `location.pathname` stays `/` throughout. Red on
  master (the first tap lands on `/data/`).
- **The browser's Back from that arrival screen still leaves** (to `/data/`),
  so point 2 is proved and not merely claimed.
- **The reload path stays mended:** three questions answered live, a reload,
  the screen's Back then the browser's Back, step 3 → 2 → 1 — the measurement
  above, kept as a case.
- **Mid-interview, the two Backs agree:** answering two questions in the tab,
  then the screen's Back and, separately, the browser's Back from the same
  screen, land on the same question.
- `npm test` and `npm run build` green; the phone-width walk (390 × 844) of
  the first case, because the rule this slice bends was written on a phone.
- **Real-green:** the live site, the same walk on a phone-width headless
  Chrome against `https://permitrulebook.com/` after the deploy, and the
  human's own phone for one tap (the only check a headless browser cannot make
  about a real gesture). Read the day of the merge.

## What this slice is not

- Not a change to the browser's history on arrival (point 2), and not a
  change to what "Start over" or editing a declared row does.
- Not the unknown link's first paint (v1.2's next queue item) and not the
  flag's quoted page (the last).
- Not a new control: the button exists; this makes it go where it says.

**Corrected 2026-09-25, by the build:** point 1's "after a reload or a return
through the browser's own history they begin at the first question (the
browser kept them)" is true only of an interview walked in the tab. An outside
entrance onto a stored record that is then reloaded, or left for `/data/` and
returned to, is a re-entrance on which the browser still holds only the screen
it opened on — measured in headless Chrome on the built site, `history.length`
3 and `/data/` behind in both. So the claim is replaced, and point 4 with it:
the page does not read the navigation's type. Every entry it writes carries
how many held steps stand behind it (`{ step, held }` in its state), which the
browser keeps with the entry and drops with it; the first held step is read
from the entry the page stands on, and an entry whose count cannot be read,
one written before this slice included, counts as an outside entrance. The
proof list gains the reloaded and the returned outside entrance as cases of
the first proof, not as a new promise.
