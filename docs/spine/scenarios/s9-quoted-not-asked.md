# s9 — Five routes the product will not score, quoted and dated anyway

**Why now.** The one-pager promised something like 35–40 routes and the product
ships 23. That gap is not an accident: each of the missing ones was researched
and left out because something in it cannot be computed from what a reader can
declare — a labour-market test, a discretionary assessment, an arithmetic floor
with no official figure to quote. A5, the assumption that six to eight
employment routes per country was realistic, is **refuted** and recorded as
such.

The dataset already has the vocabulary for exactly this case. `scope` takes a
third value — `rules-quoted-nothing-asked`, which prints *"quoted and dated ·
not scored"* — and it has never been used. A route in that state asks the
reader nothing and promises them nothing; it states what the authority states,
with the quote and the day it was read, and says plainly that this product does
not score it.

**The bet** (roadmap, human 2026-09-08): a page that quotes and dates the rules
without scoring them earns the same trust — and the same search traffic — as a
scored one. That is A2, A7 and A8, and the numbers that decide them are already
written for 2026-10-09.

**The five, and what makes each unscoreable** (from `data/exclusions.md`, each
already researched):

1. **FR — carte « salarié » / « travailleur temporaire »** (F15898): the card
   is mechanical, but the autorisation de travail behind it embeds an opposable
   labour-market test and employer-side compliance checks.
2. **ES — general regime, cuenta ajena** (RD 1155/2024 arts. 72–81): the
   catalogue path is deterministic but quarterly and provincial; the
   non-catalogue path is evaluative.
3. **ES — digital nomad** (arts. 74 bis–quinquies): needs a "remote employer
   elsewhere" situation the interview does not ask, and its euro floor is
   arithmetic (200% of the SMI) with no verbatim official figure.
4. **NL — GVVA (single permit) / paid employment**: a UWV labour-market test,
   discretionary.
5. **DE — § 21 AufenthG, self-employment**: a business-plan viability
   assessment, discretionary.

## The scenario

**A reader who wants the rules of a route this product does not score.**

1. From a country page — Germany, France, Spain or the Netherlands — the reader
   sees the country's scored routes as today, and below them a section for the
   routes stated but not scored, named so that nothing is promised: they are
   listed, not offered.
2. Opening one gives a route page that looks like every other route page: the
   name, the rules as the authority states them, each with its quote, its
   source and the day it was read, and the same shared header and footer.
3. Its scope line reads **"quoted and dated · not scored"**, and directly under
   the heading, before any rule, the page says why in the product's own words —
   the labour-market test, the discretionary assessment, the figure nobody
   publishes — so a reader knows what they are reading before they read it.
4. Nothing on the page invites a verdict: no "check yours" call to action on
   the route itself, no criteria, no met/near/hold. The interview never offers
   these routes, and a reader who arrives from one of them lands on the
   interview scoped to that country, as any other arrival does.
5. The results screen is unchanged: a reader who walks the interview sees the
   23 scored routes exactly as before, and the unscored five nowhere among
   them.
6. `/data` counts them for what they are: 23 scored, 5 quoted and not scored,
   and the sentence about what the dataset holds says both numbers.
7. Every new quote is watched like every other value, sliced where a page's
   chrome moves, and re-baselined in the same commit.
8. `npm run check` in both repositories, quote fidelity over the new sources,
   the name sweep and the base-path check stay green.

## The build

**Research, before any of it** — one pass per route, under the grounding rules
that produced the four country reads: only the authority's own pages; every
rule a verbatim quote with its URL and the day it was read; French, Spanish and
German quotes stay in their language with the English rendering marked as ours;
anything unfetchable reported rather than substituted. What each pass returns
is the route's own conditions **as the authority states them** — not our
paraphrase, and not an inference from a summary — plus the sentence that makes
it unscoreable, quoted.

**Data repository.**

1. Each route enters with `scope.value: "rules-quoted-nothing-asked"` and a
   `reason` in the reader's words. It carries `statements`, no `criteria` that
   decide, and no points table.
2. Validation earns a new rule: a route in that scope may not carry deciding
   criteria, and a route with deciding criteria may not claim it. The state is
   a promise about what the product does, and a promise a schema does not hold
   is a wish.
3. `data/exclusions.md` moves each of the five from "left out" to "quoted, not
   scored", keeping its reason — the file is the record of what was researched
   and why, and a route that has become a page is still a route that is not
   scored.
4. Every source joins the watchlist with its slice, re-baselined in the same
   commit.

**Site repository.**

5. `routePages` renders an unscored route with the same identity, the same
   quote frames, the same footer — and without the results-shaped furniture it
   has no answers for.
6. The country page lists them under their own heading, below the scored ones.
7. `/data` states both counts, and the sitemap carries the new pages.

**Tests, in both repositories.**

- A route in the quoted-not-asked scope with a deciding criterion fails
  validation, and a scored route claiming that scope fails too.
- `evaluate` never returns an unscored route, whatever the profile.
- Each of the five pages renders with its scope line, its reason, and at least
  one quote carrying a source and a date.
- The country page lists five under the unscored heading and 23 among the
  scored ones.
- `/data`'s two counts match the dataset.

## Runs

- mock-green: —
- real-green: —
