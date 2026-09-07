# s3b — "Leverage analysis: these open up if you get an offer" · Acceptance scenario

Status: APPROVED (human, 2026-09-02) and RUN.
Screen mock: `docs/spine/design/s3b-unlocks.html`.
Born from: a human question 2026-09-02 — "we do not know which one they are close
to meeting, we cannot give a recommendation".

## Approach (deterministic, without an LLM)

"situation" is not an attribute but a **step**; its nearness cannot be known
but its **leverage** can be computed: the profile is re-evaluated
counterfactually with every alternative value of the path field; the routes
that turn met/near are listed as what that step "unlocks". `kind: attribute |
path` is added to the schema per field (default attribute); the counterfactual
runs ONLY on path fields — "if you were younger" is not suggested.

## Steps

1. On the explorer profile's (situation=none) results screen, above the NOT
   YET group, a new section: **"If your situation changes — what each step
   unlocks"**; the offer row lists §18b/BC-shortage/§19c (met) + BC-general
   (within reach, €4,766); transfer → ICT; hosting → Researcher.
2. Only what really opens is listed; if an alternative opens no route its row
   does not appear at all. The section is not rendered at all if no path field
   fails (e.g. you have an offer).
3. Below the offer row the Chancenkarte bridge note ("spend a year searching,
   work 20h/week") — only if the Chancenkarte is live/open on that profile.
4. The computation is a pure `evaluate` counterfactual; tests: explorer → 3
   rows, the correct route sets; attribute fields (age, citizenship) never
   enter the counterfactual; with an offer there is no section.
5. Regression: the existing 32+ tests and the grouped screen behaviour exactly as before.

## Runs

- mock-green + real-green: 2026-09-02 — no mock, a single run: the explorer flow
  in the browser, three unlock rows + the CK bridge note + the NOT YET group; 6
  new tests (38 in total) cover steps 2/4/5. The honesty behaviour was verified:
  the offer counterfactual lists only the routes that *can be decided with the
  existing answers* (if salary has not been asked, BC is not shown as "opening").
