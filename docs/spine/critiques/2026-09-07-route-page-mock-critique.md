# Product critique — s6 route page mock (2026-09-07) · PRODUCT_RUBRIC 1.2 · **light, isolated run**

**Surface walked:** `http://localhost:4400/s6-route-page.html` — the static, real-data mock of the
per-route page s6 will generate for each of 23 routes. Not yet built.
**Scope of every score below: "route page mock" only.** These are not product-wide numbers and
must not be read as a trend against the v0.7 whole-product run.

**Conditions:** walked blind. No prior critique, DECISIONS.md, KANBAN.md or git log opened until
the scores below were written. `tokens.css` read before the screenshot pass, as the design
reference. The critic did not design or build this page.

**Instruments:** Chrome extension at desktop; headless Chrome via CDP with
`Emulation.setDeviceMetricsOverride` for true 320 / 360 / 390 / 414 / 768 viewports.

---

## The page's job, as given

A stranger arrives from a search like "Germany Blue Card salary 2026". In ten seconds they should
know: **what is the threshold, where does the number come from, when was it last checked, what do
I do next.** The page must **describe the rules and never rule on the reader**; the single CTA
leads into the interview.

**Verdict-word rule: kept.** A scan of `body.innerText` + `<title>` + meta description for
*criteria met, within reach, not yet, you qualify, qualify, eligible, eligibility, approved,
rejected, likely, score, pass, fail, met* returns no true hit. The three substring hits are
"not yet **assessed**" (a description of a degree-recognition state, not a judgement of the
reader), "Chancen**karte**" and "**pass**port". The page genuinely does not rule on the reader
**in words**. B3 below is about it ruling in colour and badge.

---

## Controls operated

16 anchors exist. Every one was enumerated and its behaviour observed.

| # | Control | href | Operated — what actually happened |
|---|---|---|---|
| 1 | `Permit Rulebook` (breadcrumb) | `#` | Placeholder. Not credited. Wording/placement judged only. |
| 2 | `Germany` (breadcrumb) | `#` | Placeholder. Not credited. |
| 3 | `its own route` (in salary card) | `#` | Placeholder. Not credited. |
| 4 | **`Official page ↗`** (salary/threshold) | `arbeitsagentur.de/.../03-2026/blaue-karte` | **Clicked.** Resolved live to "Blaue Karte EU \| Bundesagentur für Arbeit". **Navigated in the same tab** — no `target="_blank"` despite the ↗ glyph. Returned via Back. |
| 5 | `Official text ↗` (degree) | `buzer.de/18g_AufenthG.htm` | Real href, `rel="noopener"`, **no `target`**. Same same-tab behaviour as #4. |
| 6 | `Check your degree in the official Anabin database` | `anabin.kmk.org` | Real href, no `target`. |
| 7 | `Opportunity Card` (inline) | `#` | Placeholder. Not credited. |
| 8 | `Official page ↗` (passport) | `europa.eu/youreurope/...` | Real href, no `target`. |
| 9 | **`Check yours — Germany, EU Blue Card`** (primary CTA) | `#` | **Clicked.** Page silently jumped `scrollY 1091 → 0` and appended `#` to the URL. Mock scaffolding — recorded, not scored as product behaviour. |
| 10–15 | Six "Also in Germany" route cards | `#` | Placeholders. Not credited. |
| 16 | `the rules behind this page` (footer) | `#` | Placeholder. Not credited. |

Keyboard: tabbed the page; focus is visible but comes **entirely from the UA default outline** —
a stylesheet scan for `focus`/`outline` rules returns none. It happens to read on the beige
ground; it is not designed.

---

## Findings

### B1 — blocker — The threshold rail collides into unreadable text on every phone width

**Screen:** 390 px full-page slice `p2.png`; measured at 320/360/390/414/768.

The rail's two value labels and their two sublabels overprint each other. Rendered at 390 px the
row literally reads:

```
€45,630/yea€50,700/year
shortage · anotherhisrooutee, 2026
```

Measured horizontal overlap of the sublabel boxes:

| viewport | `shortage · another route` ∩ `this route, 2026` |
|---|---|
| 360 px | **64.6 px overlap** |
| 390 px | **57.1 px overlap** |
| 414 px | **51.0 px overlap** |
| 768 px | none |

**User cost:** the single number this page exists to deliver — €50,700 — is rendered as garbage on
the searcher's actual device. She is anxious, reading in a second language, and has been lied to by
immigration sites before; overlapping numbers on the one figure she came for is precisely the
texture of a site that cannot be trusted. The figure survives in the sentence above the rail, so
the fact is recoverable — but the artefact drawn to *prove* it is broken. Multiply by 23 generated
pages.

### B2 — blocker — 7 of 16 controls fall below the project's own `--tap-min: 44px` on phone

**Screen:** tap-target audit at 390×844.

`tokens.css` does not treat 44 px as a suggestion. It carries this comment (quoted from
`tokens.css`, whose comments were translated to English in s5f — the wording below is the
file's current text, unchanged in meaning):

> The tap-target floor. On a phone the correction controls measured 34/22/20 px (isolated
> product-critique v0.7, F8) — three ways to correct an answer, the three smallest targets on
> the screen. **No interactive row may go below this value.**

Measured heights on this screen at 390 px:

| Control | height | |
|---|---|---|
| `the rules behind this page` | **14 px** | ✗ |
| `Permit Rulebook`, `Germany` | **15 px** | ✗ |
| `Official page ↗` ×2, `Official text ↗` | **16 px** | ✗ |
| `its own route`, `Opportunity Card` | **20 px** | ✗ |
| `Check your degree…`, primary CTA | 44 px | ✓ |
| Six route cards | 55–69 px | ✓ |

**User cost:** the three `Official … ↗` links are the product's differentiator made tangible — the
door from "trust me" to "check me". They are 16 px tall on the device the persona is holding. A
token written *specifically because a previous isolated critique measured 34/22/20 px controls* is
violated on the first screen designed after it, and violated worst on the controls that carry the
promise.

### B3 — blocker — "FULLY MODELLED" overclaims, contradicts itself two sentences later, and wears the criteria-met green

**Screen:** desktop masthead zoom; 390 px slice `p1.png`.

The banner directly under the masthead — the second thing the eye lands on — reads:

> **FULLY MODELLED** · Every condition that decides this route is a question the checker asks, and
> every number on it is quoted from an official page that is watched daily. **Two conditions are
> stated but not checked** — they are listed under each rule as "Also required".

Three separate problems in one element:

1. **It contradicts itself.** "FULLY" is retracted by "Two conditions are stated but not checked"
   in the same paragraph. The hostile skimmer who reads only the badge gets a claim the body text
   disowns; the one who reads both catches the page overclaiming. Either way the page loses.
2. **It is pure internal vocabulary.** *Modelled* is pipeline language. A stranger cannot tell
   whether it describes the page, the route, or **her**. "Fully modelled" adjacent to a green rule
   is readable as "you're all set".
3. **It is drawn in the verdict palette.** Measured: `border-left: 4px rgb(46,91,63)` — that is
   `--color-met` **#2e5b3f**, which `tokens.css` defines as `statü: criteria met`. The banner is a
   green-ruled badge in the criteria-met colour, at the top of a page whose hardest constraint is
   that it must never rule on the reader. The hero accent has the same disease: `rgb(138,90,25)` =
   `--color-near` **#8a5a19**, defined as `statü: within reach`.

**User cost:** the page keeps the verdict rule in words and breaks it in signal. The skimming
persona — who never reads the lede — sees a green pass-badge saying FULLY over a big number.
That is a verdict, delivered without a verdict word.

---

### F1 — friction — Two long German quotes with no framing, and a number formatted against itself

**Screen:** desktop rail zoom; 390 px slice `p2.png`.

The threshold card's evidence is 24 words of German with no label saying it *is* German and no
rendering into English:

> "Für die „große" Blaue Karte EU muss ein Mindestbruttojahresgehalt erreicht werden, welches im
> Jahr 2026 **50.700 Euro** beträgt."

The degree card's is worse — 20+ words of statute German, elided mid-quote with "…":

> "Fachkräfte mit akademischer Ausbildung … einen deutschen, einen anerkannten ausländischen oder
> einen einem deutschen Hochschulabschluss vergleichbaren ausländischen Hochschulabschluss"

Two costs. First, the reader's second language is English, not German; the lede's "the authority's
own sentence" half-frames this but never says *in German*, and offers no translation. Second and
sharper: the quote is there to **prove** €50,700, and it spells the number **50.700** — German
thousands separator, directly beneath a line reading `€50,700/year`. A careful, anxious reader
comparing the proof to the claim sees two different-looking numbers and no note explaining the
convention. An elided quote plus a mismatched number is exactly the shape of the evasion she has
been burned by before.

### F2 — friction — The lede promises "the authority's own sentence"; one card quotes a private mirror

**Screen:** desktop, degree card.

Lede: "Every value on this page is **the authority's own sentence**." The degree condition's quote
is attributed `buzer.de (mirror of § 18g AufenthG)`. buzer.de is a commercial third-party law
mirror, not an authority. The card is admirably honest about it — "(mirror of)" is exactly the
right disclosure — but the blanket lede is now false for that card, and the developer persona,
who reads attributions for a living, will find the one place the page's own claim does not hold.

### F3 — friction — Three date formats for the same fact, and the headline date is the stalest

**Screen:** masthead zoom; cards; footer slice `p5.png`.

| Where | Format |
|---|---|
| Stamp (masthead) | `04 · 09 · 2026` |
| Every source line | `read 2026-09-04`, `read 2026-09-06` |
| Footer | `dataset 2026.09.07` |

Three conventions on one page whose differentiator is *when was this checked*. `04 · 09 · 2026`
is additionally ambiguous to the persona most likely to be reading — 4 September or 9 April
depends on where you learned to write dates, and nothing on the page disambiguates it.

Worse: the stamp says the rules were read on **04-09**, while the degree card says **09-06** and
the dataset says **09-07**. The headline trust artefact displays the *oldest* of three dates. That
may well be the honest aggregate ("all sources read at least as recently as this") — but the page
never says so, so it reads either as staleness or as an inconsistency.

### F4 — friction — "ALSO REQUIRED — NOT CHECKED HERE" fails WCAG AA, and is the faintest text in its card

**Screen:** 390 px slice `p3.png`; desktop job-offer card.

Measured: `rgb(123,120,105)` on `rgb(237,234,223)` — `--color-hold` on `--color-hold-soft` —
**3.68:1 at 11.2 px bold**. AA requires 4.5:1 at that size. It fails.

The hierarchy is inverted: the bullets beneath render at full ink while the label that tells the
reader *these things also decide your case and we did not check them* whispers. This is the most
consequential caveat on the page and the least legible thing on it.

Note the same sweep has been run before: `--color-muted` carries a comment recording its raise
from `#6f6c5d` (4.55:1, "AA by a hair under 13px; tracker #1"). `--color-hold` on
`--color-hold-soft` was missed by that sweep.

The label's wording is also worth a second look: "not checked here" is honest but tells the reader
what *won't* happen without saying who does check it. It reads slightly as a shrug.

### F5 — friction — The German quotes carry no `lang`, and the page's quotes are not quotes

**Screen:** DOM audit.

- `<html lang="en">`; the two German passages sit in `<i>` elements with **no `lang="de"`**. A
  screen reader pronounces *Mindestbruttojahresgehalt* with English phonemes.
- `blockquote=0, q=0, cite=0`. The page's central trust device — a verbatim quotation with an
  attributed source — is marked up as **italics**. Assistive tech announces no quotation and no
  citation, so the differentiator is invisible to a non-visual reader.
- No `<main>` landmark. The CTA panel and the "Also in Germany" nav have **no headings** — a
  screen-reader user navigating by heading gets five headings and skips the call to action
  entirely.
- No `:focus-visible` styling of any kind; focus rests on the UA default.

### F6 — friction — "↗" promises a new tab; the link takes you off the page

**Screen:** operated control #4.

All four real outbound links carry the `↗` glyph and `rel="noopener"` but **no `target="_blank"`**.
Clicking `Official page ↗` navigated the tab away to arbeitsagentur.de; returning required Back.

For the anxious phone reader, "verify the number" costs her the page she was reading. The glyph
sets an expectation the behaviour breaks — and `rel="noopener"` with no `target` is the fingerprint
of an intent that got half-implemented.

### F7 — friction — "the checker" is never introduced

**Screen:** trust banner; degree card.

"a question **the checker** asks" and "**The checker** asks where recognition stands" both appear
*above* the CTA, and nothing on the page has yet said what the checker is. It is the internal name
for the interview, used twice as though the reader already knows it. She meets the thing itself
only at the bottom of the page, under a different name ("Seven questions").

### F8 — friction — `§ 18g AufenthG` and its siblings are never glossed

**Screen:** salary card, degree card, "Also in Germany" cards.

`§ 18g AufenthG` appears twice in source lines; the related-route cards add `§ 18b`, `§ 19c`,
`§ 20a`, `§ 18d`, `§ 19`. *AufenthG* is never expanded (Aufenthaltsgesetz — the Residence Act),
and the `§` convention is not universal outside German-speaking legal culture. To the searcher
these are opaque tokens; to the hostile skimmer they are noise dressed as authority. (The
developer persona reads them fine — this cuts one way only.)

### F9 — friction — On phone the trust banner spends half its width on an empty label column

**Screen:** 390 px `p1.png`; 320 px `stamp-320.png`.

The label/body two-column layout does not collapse at phone width. "FULLY MODELLED" holds a wide
left column with a large empty area beneath it while its explanation is squeezed into a
four-words-per-line ribbon running ~12 lines. At 320 px it degrades to "Every / condition that /
decides this / route is a".

---

### P1 — polish — The breadcrumb separators are effectively invisible

`rgb(217,211,192)` on `rgb(241,238,228)` — `--color-line` used as a text colour — **1.29:1** at
11.2 px. The `·` between breadcrumb items renders as almost nothing at 100 %. It was clearly
intended to be seen.

### P2 — polish — The rail is a scale with no scale, and is missing its own signature element

The track runs well past both ticks (≈33 % empty left of the first, ≈42 % right of the second)
with **no endpoint labels**. Nothing says what the bar measures between. The two ticks are
visually identical 1 px marks, so €45,630 — which belongs to *another* route — carries the same
weight as €50,700, which is the answer; and the eye reaches the wrong one first.

`tokens.css` defines the rail with `--rail-band: var(--color-band)`, whose own comment (quoted
from the file, translated to English in s5f) calls it "the 'your band' blue — the user's own
declaration". On this page there is no user declaration, so the rail renders permanently without
its central element. The signature component appears in a degraded state and nothing explains why.

### P3 — polish — For a page built to be landed on from search, there is no structured data

`canonical: NONE`, `og:* : NONE`, `JSON-LD: NONE`, `<time>: NONE`. The `<title>` and meta
description are genuinely good ("…every value quoted from its official page with the date it was
read") — but the page carries no machine-readable dates on a product whose differentiator is
freshness, and no share card on a page designed to be shared.

### P4 — polish — The developer persona is shown a door with no handle

The footer says `open data · CC BY 4.0` as **plain unlinked text**, beside `dataset 2026.09.07`
and `schema 0.4.0`. There is no link to a repository, a dataset, an API, or a JSON file anywhere
on the page; the only candidate, "the rules behind this page", is `#`. `schema 0.4.0` also means
nothing to the other two personas and sits in their eyeline.

### P5 — polish — Smaller residue

- `· per year ·` in the threshold source chain is a dataset unit field, redundant beside
  `€50,700/**year**`.
- Straight quotes in `"Also required"` against curly quotes elsewhere.
- On desktop the kind-label (`THRESHOLD · 2026`, `CONDITION`) floats ~350 px right of the heading
  it labels, because prose is capped at `--max-prose` inside a `--max-content` card. The pairing
  reads as orphaned at 1440 px+.

---

## Rubric scores — PRODUCT_RUBRIC 1.2 · scope: **route page mock only**

| Lens | Score | Evidence |
|---|---|---|
| 1 First-run clarity | **3** | Title, meta description, hero and lede answer "what is this and why trust it" cleanly and €50,700 is in the first sentence of the first card — but on the phone the rail that proves it renders as overlapping garbage (B1), and the second thing the eye meets is a badge reading FULLY MODELLED (B3). |
| 3 Copy & framing | **3** | The verdict-word rule is genuinely held and the lede and footer are honest and plain — undercut by a trust badge that contradicts its own next sentence (B3), "the checker" used twice before it is introduced (F7), `§ 18g AufenthG` unglossed (F8), and two long German quotes with no framing (F1). |
| 4 Trust surfacing | **3** | Per-value quote + domain + statute + read date is the differentiator landing properly, and "not checked here" is unusually honest — but three date formats compete for the same fact with the stalest one in the stamp (F3), the lede's "authority's own sentence" does not survive the buzer.de mirror (F2), and the quotes are semantically invisible (F5). |
| 5 Result actionability | **4** | One CTA, well placed, with the privacy promise stated at the point of decision ("on this device only — nothing is sent anywhere") and a real escape hatch for the hardest question (Anabin) — docked because the button label "Check yours" has no noun in it and the thing it leads to is named "the checker" elsewhere. |
| 7 Accessibility basics | **2** | The page's most consequential caveat fails AA at 3.68:1 (F4) and its breadcrumb separators sit at 1.29:1 (P1); German passages carry no `lang` and quotations carry no quotation semantics (F5); no `<main>`, no headings on the CTA or related-routes sections, and no focus styling of the page's own (UA default only). |
| 8 Responsive | **2** | Rail labels overlap by 51–65 px at 360/390/414 — every common phone width — wrecking the threshold row (B1); the trust banner burns half the phone's width on an empty label column (F9); against that, `scrollWidth === innerWidth` at every width tested, the stamp survives 320 px unclipped, and the cards reflow cleanly. |
| 9 Design fidelity | **3** | The stamped-panel variant is honoured with real discipline — archive-paper ground, double rules, card top-rules, mono values, rotated stamp, serif hero, and **no off-token colour found anywhere** — but the verdict palette does double duty (`--color-met` frames the trust banner, `--color-near` is the hero accent) on a page forbidden to rule (B3), the mandatory `--tap-min: 44px` is violated by 7 of 16 controls (B2), and the signature rail renders without `--rail-band` with no explanation (P2). |

Lenses 2 and 6 are **not scored** — this screen has no multi-step flow and no empty/error states
to walk. Light mode: a lens scored is a lens walked.

Both lenses at 2 are backed: Accessibility on F4/F5/P1, Responsive on B1/F9.

## Post-hoc delta

Same rubric version (1.2) as `2026-09-06-product-critique-v0.7.md`, **different surface.** That run
scored the whole v0.7 checker flow (27/45); this one scores a new, unbuilt static page. The numbers
are not a trend line and are not subtracted. What is comparable is the **defect classes**, and three
of the four the last run raised were carried forward into a screen designed after it:

| v0.7 finding | Status on the new screen |
|---|---|
| **F8** — correction controls at 34/22/20 px; produced the `--tap-min: 44px` token | **Reintroduced, worse.** 7 of 16 controls at 14–20 px, including all three source links (B2). |
| **F7** — "quotes are 12.8 px grey monospace in German/Dutch/Spanish with no gloss" | **Unchanged.** Still 12.8 px mono German, still no gloss, now with a thousands-separator mismatch on top (F1). |
| **Design fidelity (P9/F9)** — "`--color-band` now carries seven meanings" | **Same disease, new tokens.** `--color-met` and `--color-near` now carry non-verdict duty on a page that must not rule (B3). |
| **Copy 2** — raw engine output leaking to users | **Same disease, new words.** "FULLY MODELLED", "the checker", "schema 0.4.0" (B3, F7, P4). |

Two things the new screen does markedly better than v0.7: the verdict-word discipline is
airtight in prose, and every single value carries its own quote, source and read date — the v0.7
run's F7 complaint that "the emptiest result carries none at all" has no equivalent here.

## Adoption verdict per persona

**The searcher** (knowledge worker outside the EU, second language, phone, anxious, lied to
before) — **would not finish on her phone.** She gets her number from the sentence, then meets a
collided rail on the one figure she came for (B1), a proof quote in unframed German whose number
is spelled differently from the claim (F1), and 16 px source links she cannot reliably tap (B2).
The page's honesty is real and she would feel it; the execution on her device undercuts it.
*Single most likely thing to stop her:* B1 — the threshold row rendering as overlapping text.

**The developer** (from the GitHub README, asking whether the data is trustworthy and reusable) —
**trustworthy: convinced. Reusable: turned away.** Per-value source URL + statute + read date +
an explicit mirror disclosure is better provenance discipline than most public datasets ship. But
`open data · CC BY 4.0` is unlinked text, there is no repo/API/JSON link anywhere, no JSON-LD, and
no `<time>` element — so a page that proves its freshness offers no machine-readable way to consume
it. *Single most likely thing to stop him:* P4 — no door from the page to the data.

**The hostile skimmer** (never reads the lede, clicks everything, expects to be sold something) —
**does not feel sold to, and that is a real win.** No email capture, no signup wall, no pricing,
no urgency, no fake scarcity; the footer volunteers "Permit Rulebook makes no immigration decision
and authorities won't consider these pages", which is the opposite of a sales page. What he seizes
on instead is the overclaim: a green FULLY MODELLED badge that the very next sentence retracts
(B3). *Single most likely thing to stop him:* B3 — catching the page contradicting itself inside
one paragraph is all the permission he needs to dismiss the rest.

## Recommended adjustments — pick and apply

**1. Fix the phone: the rail and the tap targets.** Clears **B1** and **B2**. Give the rail
labels a layout that cannot collide below 768 px (stack the two marks, or drop to a two-row
label/value list on narrow widths) and label the track's endpoints so the bar means something;
then bring every interactive row up to the `--tap-min: 44px` the token file already declares
mandatory, starting with the three `Official … ↗` links. While in there, give those links
`target="_blank"` to match the `↗` they already wear (**F6**). This is the adjustment the
searcher persona's adoption turns on.

**2. Retire "FULLY MODELLED" and get the verdict palette off this page.** Clears **B3**,
touches **F7**. Replace the badge with a claim the body text does not retract — the honest version
is roughly *"Every condition on this route is checked; two more are listed but not checked"* —
and say it without the word *modelled*. Then take `--color-met` off the banner rule and
`--color-near` off the hero: a page whose one hard rule is that it must not rule on the reader
cannot be framed in the criteria-met green. Introduce "the checker" the first time it is used, or
call it what the CTA panel calls it.

**3. Frame the German, and settle on one date format.** Clears **F1** and **F3**, touches
**F2**/**F5**. Label the quotes as the official German wording, give each an English rendering,
and add a one-line note where `50.700 Euro` sits under `€50,700` explaining the separator — the
proof currently looks like it disagrees with the claim. Use one date format everywhere (ISO, as
the cards already do), say in the stamp what its date means when the sources were read on
different days, and soften the lede from "the authority's own sentence" to something that survives
the buzer.de mirror the page is otherwise commendably honest about.

Remaining findings for the tracker: **F4** (`--color-hold` on `--color-hold-soft` at 3.68:1 —
`design-flaw`, and the same sweep that fixed `--color-muted` should have caught it), **F5**
(`lang="de"`, `<blockquote>`/`<cite>`, `<main>`, section headings, `:focus-visible` —
`design-flaw`), **F8** (gloss `AufenthG` — `new-need`), **F9** (banner columns on phone —
`design-flaw`), **P1**–**P5** (`design-flaw` except **P3**/**P4**, which are `new-need`).

## For the human only

Two things I could not settle from here:

- **The stamp date's meaning.** `RULES READ 04 · 09 · 2026` is older than both `read 2026-09-06`
  and `dataset 2026.09.07` on the same page. Look at the masthead stamp against the card dates and
  decide what it is meant to aggregate — oldest source, newest source, or dataset build. A pass is
  a stamp whose number a reader can derive from the dates below it.
- **Whether `--color-met` / `--color-near` may appear on a non-ruling page at all.** This is a
  token-semantics call, not a rendering bug, and it belongs in DECISIONS.md either way. A pass is
  either the tokens split (verdict vs. accent) or an entry recording that the reuse is deliberate.
