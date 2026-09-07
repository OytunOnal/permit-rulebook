# s5d — "Answers recorded as given, verdicts in plain words" · Acceptance scenario

Status: APPROVED (human, 2026-09-07) — "apply all three adjustments", with the
record-persistence fork settled the same day: `localStorage` plus a print
stylesheet, no URL fragment and no server.
Born from: the isolated product-critique of v0.7
(`docs/spine/critiques/2026-09-06-product-critique-v0.7.md`), four blockers.
Human decision 2026-09-07: **apply all three recommended adjustments.**
Screen change: no new screen — existing screens corrected. No new mock needed;
the changed regions are the country picker, the reason column on route cards,
the subtitle, and the phone layout.
Slice exits: `tdd` + `code-review` — mandatory.

## What this slice is for

Two of the four blockers are the product telling the user something untrue: a
passport they did not pick, and a claim about a comparison that did not happen.
One is a wrong verdict on money. One is debug output in the place a person looks
for the reason. None of them is a missing feature; all four are the product
failing its own stated promise, which is why they gate v1 rather than joining
the launch slice.

## Design decisions this slice encodes (approved with this scenario)

1. **The picker commits what is highlighted, and shows what it committed.**
   Real listbox semantics on the country control: ↑/↓ move a highlight
   (`aria-activedescendant`), Enter commits the **highlighted** row and nothing
   else, Escape closes without committing. An exact name match sorts first, so
   "niger" offers Niger above Nigeria and "sudan" offers Sudan above South
   Sudan. After committing, the chosen country is echoed in the question card
   itself, not only in the side ledger.
2. **The Dutch reduced salary criterion asks where you studied.** The
   country-less `qualification_recent` stops governing the three NL routes. In
   its place the reduced path takes an `any` over the two facts the product
   already asks correctly: a Dutch institution (`nl_recent_grad`) or an
   IND-designated foreign institution (`top200_grad`). The IND's own third case
   requires the applicant to *meet the requirements for the orientation-year
   residence purpose*, and that is where the institution restriction lives.
3. **The orientation-year-permit limbs are excluded, in writing.** The IND's
   first two cases — holding an orientation-year permit, or having held one —
   are not modelled, because the product never asks about permits already held.
   They go into `data/exclusions.md` with that reason, and the route says so in
   its preconditions rather than staying silent.
4. **Spain is not swept along.** The critique grouped `es-blue-card` with the
   Dutch routes. The Orden limb we model reads "a qualification obtained within
   the last 3 years" and we have no evidence it carries an institution
   restriction; the source is the PDF tier, so nobody here can read it either
   way. `es-blue-card` keeps `qualification_recent` and a note records that its
   scope is unverified. Changing it on a guess would be the same error in the
   other direction.
5. **No field id ever reaches a user.** Every not-met and unknown reason renders
   as a sentence a person would say. The France roll-up already does this; the
   rule becomes general and is enforced by a test, not by care.
6. **Modelling vocabulary is not user-facing copy.** *criterion*, *reduced
   criterion*, *second path*, *general*, *top-200 graduate* leave the screen,
   along with unglossed `45% BBG`, `IND`, `BIG`, `EEA`, `PAC nacional`.
   `Points 7 of 6` reads "7 points — 6 needed".
7. **A claim about the past is cleared when the past is.** The subtitle that
   describes what was compared resets on "Start over" and on entering the edit
   flow, and never appears on a screen where no comparison has happened.
8. **The phone gets the question first.** At narrow widths the question card
   precedes "You declared", which collapses to a one-line expandable summary;
   the intro shortens after Q1; every interactive row reaches 44 px.
9. **The record survives leaving the page, and still never leaves the device.**
   Answers persist in `localStorage`, so reload, browser Back and closing the
   tab and returning all find them. A print stylesheet ships alongside, so the
   record can be taken to an appointment as a PDF. **Sharing by link is out of
   scope, deliberately** — the human considered a URL fragment and a server-side
   record and chose neither (2026-09-07). The privacy promise stands unchanged:
   nothing is transmitted, and `localStorage` is per-browser, so the answers do
   not reach the user's other devices either. A visible "Start over" clears the
   stored answers as well as the screen — a shared or borrowed computer must not
   hand the next person a stranger's salary.

## Seed data

No new sources. The dataset change is structural: the reduced-salary path on
`nl-hsm-30plus`, `nl-hsm-under30` and `nl-blue-card` swaps one criterion for an
`any` over two existing fields. Existing quotes, dates and thresholds are
untouched — `npm run check` must show the same value set before and after.

## Steps

1. **The picker regression (B1).** Type `niger`, press ↓ once, press Enter. The
   committed country is the one that was highlighted, and the question card
   shows it by name. Repeat with `sudan`, and with Enter pressed immediately
   after typing with no arrow key: the first row is the exact match, and the
   card says which country was recorded. Escape closes the list and commits
   nothing.
2. **The reduced-threshold verdict (B2).** A third-country engineer, 27, offer
   in the Netherlands, €3,500/month, who graduated two years ago from an
   institution that is neither Dutch nor IND-designated: `nl-hsm-under30`
   resolves against **€4,357**, not €3,122, and the card says which fact is
   missing in words. The same profile with a Dutch degree resolves against
   €3,122 and says why. The route's preconditions name the orientation-year
   limbs we do not check.
3. **The reason column (B3).** Walk the four-country flow with a weak profile
   and read every route card's reason line aloud. No field id, no *criterion*,
   no lowercase identifier mid-sentence, nothing a stranger would need the
   codebase to parse. The France roll-up still reads as it does today.
4. **The stale claim (B4).** Complete an interview, press "Start over", and read
   question 1: the subtitle makes no claim about answers given or values
   compared. Enter the edit flow from a result and read the question screen: the
   same. Neither requires a reload to clear.
5. **Edge profile (mandatory).** "Anywhere in these four", weakest answers, "I
   don't know" wherever it is offered, then two corrections and a "Start over".
   Every country still resolves to an honest state, every reason line is a
   sentence, unlock steps appear on every state that has any — including the
   single-country "Nothing open" — and no screen claims a comparison that has
   not happened.
6. **Phone (mandatory, real 390 px).** The full flow at 390×844: the question is
   the first thing on screen from Q1 to the last question, `scrollWidth` never
   exceeds 390, and "← Back", "Start over" and every edit row measure at least
   44 px.
7. **The record survives, and can be cleared (step 9's promise).** Answer three
   questions, reload the page: the answers are still there. Close the tab,
   reopen the site: still there. Press browser Back from the results: it returns
   to the interview rather than wiping it. Press "Start over": the stored
   answers are gone, and a reload after it starts from question 1. Print the
   results: the record prints as a readable page, quotes and dates included, no
   navigation furniture. No network request carries any answer — verified on the
   network panel, not assumed.
8. **Regression.** All 184 existing tests stay green; the value set is
   unchanged; `astro check` reports zero errors.

## Invariants (property tests)

- **No user-facing string contains a dataset field id.** Generated over every
  field id in the dataset against every reason line the engine can produce —
  this is the permanent form of B3, and it targets the symptom, so a new field
  or a new control cannot reintroduce it.
- **The committed country equals the highlighted option**, over random typed
  prefixes and arrow-key sequences.
- **A screen that has compared nothing claims nothing**, over random points in
  the flow including post-reset and post-edit.
- Everything from the existing suites, re-run: termination, status consistency,
  unlock soundness and completeness, end-state stability.

## Runs

- mock-green: —
- real-green: — (requires a human walk: the picker by keyboard, the phone flow
  on a handset, and the reason column read as prose)

## De-mock births

- "The record cannot be shared with anyone else, and does not follow the user to
  another device" joins the backlog as a known, chosen limit — not a defect.
  Revisit only if people ask for it.
- `es-blue-card`'s unverified institution scope joins the backlog: it needs a
  human read of the Orden, which is the PDF tier.
