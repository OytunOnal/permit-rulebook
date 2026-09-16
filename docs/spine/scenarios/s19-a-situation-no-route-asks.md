# s19 — a situation no scored route asks

**Status:** approved 2026-09-16 (human: "approve"). v1.1 gate
critique B1 and F8 (adjustment 1, the human's pick: *"1 ve 2 yapalım"*).

## What happened

The v1.1 isolated walk: a researcher with a French hosting agreement — a
persona the one-pager names — chooses France, then *"I have (or expect) a
hosting agreement with a research institution there"*, and two taps later
reads *"Nothing open on these answers."*, 0 open, 5 not yet, *"5 routes need
a job offer or an intra-corporate transfer"*. Nowhere does the site say that
France's researcher permit (*Talent — chercheur*) is not scored; the reason
lives in `exclusions.md` on GitHub. The same two answers for Spain give
CRITERIA MET in three taps. A reader whose route is merely absent is shown a
rejection — the shape of the record's hardest earlier blocker.

The fact is derivable and the code does not derive it: France's five
scored routes gate on `situation ∈ {offer, ict}`; none accepts `research`;
the interview offers `research` anyway. Germany, Spain and the Netherlands
each have a scored researcher route.

## What a reader gets

Before choosing a situation, the reader sees which of the four answers
their country's scored routes can use — and, when one is not, that the
route exists and where it is read. If they choose it anyway, the result
does not say "nothing open"; it says, in a written state, that no scored
route in that country takes that situation, names the route that would,
and where its rules are quoted. And a condition the interview asked is
never listed on a card as "not checked here".

## What must be true

1. **The interview knows which situations a country's scored routes ask.**
   Derived from the dataset at build time: for each country, the set of
   `situation` values any scored route's criteria accept (the `offer` /
   `ict` / `research` gates the engine already reads). For *all four
   countries*, the union. No list typed anywhere.
2. **Question 2 marks an option no scored route in the chosen country
   asks.** The option stays selectable (a reader may still want to see the
   rest); under its label one line, from `copy.ts`: *Not scored for France
   yet — the researcher permit is quoted, not scored: read it here.* with
   *read it here* linking the quoted route's page when one exists
   (point 4), or *Not scored for France yet.* alone when none does. On the
   four-country path no option is marked (every situation has a scored
   route somewhere).
3. **A zero-open result reached through a marked option is a written
   state, not "Nothing open".** Headline: *No scored route in France takes
   a research hosting agreement.* Subline: *France's researcher permit —
   Talent — chercheur — is quoted here but not scored: read its rules. The
   routes below need a job offer or a transfer.* Then the not-yet list as
   today. Copy in `copy.ts`, country and route names from the dataset,
   never typed. The headline logic (`sayVerdict`, the hero branches) gains
   this branch and the s8/s9 tests stay green.
4. **The data: *Talent — chercheur* enters the dataset as a quoted-not-scored
   route** (the s9 mechanism: `scope.value: rules-quoted-nothing-asked`), so
   it has a page on the site with its rules quoted and dated. The research
   is a read of the service-public fiche: the hosting-agreement gate, the
   master's-degree gate, the absence of a salary rule, the duration — each
   sentence verbatim with its date; the route carries a new optional field
   **`situations: ["research"]`** — *what it would ask, if it were scored*
   — so point 2 can link it. Schema 0.7.0 → 0.8.0 (an optional field on
   quoted routes; the schema doc says what it means). `exclusions.md`'s row
   moves to "quoted, not scored" with the date. France's page then says *5
   routes scored, 2 quoted*.
5. **A condition question 2 asked is never "not checked here".** The Spain
   researcher card lists *A hosting agreement* under "Also required — not
   checked here" to a reader who just declared one (F8). A precondition
   whose field the interview asked and the reader answered is rendered as
   answered (the s5 "you declared" wording), not as unchecked. Derived from
   the asked-fields set, no list typed.
6. **Nothing else changes.** The four-country path, the scored routes'
   verdicts, the record, the arrival line. Every existing test green; the
   fixtures that move (route fingerprint — France's quoted route is a new
   page; `/data/` counts) regenerate with reasons.

**Corrected 2026-09-16, by the data build:** four things. (1) *Talent —
chercheur* has no fiche of its own: it is the *Chercheur* tab of F16922, the
fiche the four scored Talent routes already cite; the watch entry's slice
widened rather than a second entry on the same URL (the fidelity map keys
by URL). (2) `exclusions.md` said "no salary rule"; the tab states one —
*un seuil de rémunération minimal de 2 200 € brut* — quoted as a
precondition, the row corrected with the date. (3) The derivation keys by
the destination answer (`de|fr|es|nl|all`), not the country code, because
*all* is an answer and not a country. (4) **`none` is derived too, and
France and Spain lack it** (no seek route). Point 2 does **not** mark
*"None of these yet"*: that answer is every country's "not yet" path — the
not-yet list and the unlock steps are its written state already (s3b). The
mark is for a situation a reader *has* — an offer, a transfer, a hosting
agreement — that no scored route in that country takes. Routes carry no
`history` field; the move from excluded to quoted is the dated exclusions
row, as the s9 five did it.

## How it is proved

- A data test: the situations each country's scored routes accept, from
  the dataset, equals what the site derives; France lacks `research`; the
  quoted chercheur route carries `situations: ["research"]` and its quotes
  verify against the fiche's snapshot (the watch gains the entry).
- A site test: question 2 for France renders the mark under the research
  option with the link; for Germany, Spain, the Netherlands and *all four*
  no mark; a browser walk France → research → the written state, headline
  and subline exact, no "Nothing open".
- A test over every scored route card: no precondition whose field is in
  the asked set renders as "not checked here".
- The human's walk: France → research on the preview, then Spain → research
  (CRITERIA MET as before), then the chercheur route page.

## What this slice is not

It does not score *Talent — chercheur* — its master's gate and its
duration rules are a modelling pass of their own (the exclusion's reason
stands, now on the site). It does not touch the phone correction (s20).
