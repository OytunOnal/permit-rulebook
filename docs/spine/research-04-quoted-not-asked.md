# research-04 — the five routes s9 will quote and not score

One pass per route, under the grounding rules that produced the four country
reads: official sources only, every rule a verbatim quote with its URL and the
day it was read, the source language kept and the English rendering marked as
ours, anything unfetchable reported rather than substituted.

What each pass is for: the route's conditions **as the authority states them**,
and — the single most important item — the authority's own sentence explaining
why a person cannot check this route for themselves. The page s9 publishes says
"we do not score this", and that sentence is what earns it.

---

## 1. France — carte de séjour « salarié » / « travailleur temporaire »

Read 2026-09-10.

**What it is.** The ordinary employee card, in two mentions that share one
mechanism: **« salarié »** where the contract is a CDI, **« travailleur
temporaire »** where it is a CDD. Both are issued only after the *employer* has
obtained an **autorisation de travail** for the specific job. It covers a first
application (including a VLS-TS validated on arrival), a renewal, and changes
tied to keeping, losing or changing the job. It does not cover the passeport
talent family, seasonal cards, or posted-worker ICT cards.

**The conditions the authority states.**

- The card cannot be issued without a prior work authorisation:
  > « La délivrance de cette carte de séjour est subordonnée à la détention
  > préalable d'une autorisation de travail, dans les conditions prévues par les
  > articles L. 5221-2 et suivants du code du travail. »
  CESEDA art. L421-1 (CDI) —
  https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042776797 · the
  same clause for the CDD card at art. L421-3 —
  https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042776791
- It is the employer's application, not the worker's, and it comes first:
  > « Votre employeur doit faire sur internet la demande d'autorisation de
  > travail avant votre entrée en France. »
  service-public.gouv.fr F15898 —
  https://www.service-public.gouv.fr/particuliers/vosdroits/F15898
- Four cumulative conditions govern that authorisation (Code du travail
  art. R5221-20, https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033333020/):
  the job itself (either on the shortage list, or advertised for three weeks
  with no suitable candidate found), the employer's own compliance record, the
  regulated-profession requirements where they apply, and pay:
  > « 4° La rémunération proposée est conforme aux dispositions du présent code
  > sur le salaire minimum de croissance ou à la rémunération minimale prévue
  > par la convention collective applicable à l'employeur ou l'entreprise
  > d'accueil »
  No euro figure: the floor is the SMIC or the collective agreement, whichever
  is higher (F3100, https://www.service-public.gouv.fr/particuliers/vosdroits/F3100).

**Why it cannot be scored** — the sentence the page will carry:

> « Lorsque la délivrance du titre de séjour est subordonnée à la détention
> préalable de l'autorisation de travail prévue à l'article L. 5221-2 du code du
> travail, **la situation du marché de l'emploi est opposable au demandeur** sauf
> lorsque le présent code en dispose autrement… »
CESEDA art. L414-13 —
https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042776813

*Our rendering:* where a residence permit depends on a prior work
authorisation, the state of the labour market can be held against the
applicant. And the mechanic behind it is something a person cannot see:

> « l'offre pour cet emploi a été préalablement publiée pendant un délai de
> trois semaines auprès des organismes concourant au service public de l'emploi
> et n'a pu être satisfaite par aucune candidature répondant aux
> caractéristiques du poste de travail proposé »
Code du travail art. R5221-20 1° b

Beside it sits a check on the employer rather than the applicant — social
obligations, and no convictions or sanctions for illegal work, health-and-safety
offences, aiding irregular entry or breaching the posted-worker rules
(art. R5221-20 2°). Neither the three-week search nor the employer's record is
knowable to the person applying.

**The exceptions, quoted.**

- Shortage occupations: the test falls away entirely.
  > « …lorsque la demande de l'étranger concerne un métier et une zone
  > géographique caractérisés par des difficultés de recrutement, les cartes de
  > séjour prévues aux articles L. 421-1 et L. 421-3 lui sont délivrées **sans
  > que lui soit opposable la situation de l'emploi**. »
  CESEDA art. L421-4 —
  https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042776787/
  The list itself is the arrêté of 21 May 2025 —
  https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051643488 — set region by
  region, not as one flat national list.
- Master's graduates with a qualifying contract above a threshold set by
  décret (art. L421-4; the article defers the figure and does not state it).
- Tunisian nationals, for the occupations in Annex I of the 2008 protocol:
  > « …sur présentation d'un contrat de travail visé par l'autorité française
  > compétente **sans que soit prise en compte la situation de l'emploi**. »
  Point 2.3.3, protocole du 28 avril 2008, publié par le décret n° 2009-905 —
  https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000020900798
  Worth recording: the ministry's own plain-language page about the
  Franco-Tunisian agreement does **not** carry this exemption — it is in the
  decree only, so a reader relying on the overview page would miss it.
- Narrower cases at Code du travail art. R5221-21: a "recherche d'emploi ou
  création d'entreprise" card holder, a recent graduate with a qualifying
  contract, and a minor in the care of child protective services.

**The reader's own page.**
https://www.service-public.gouv.fr/particuliers/vosdroits/F15898 — *"Travail
d'un étranger en France : carte de séjour salarié/travailleur temporaire"*.

**Watchability.** F15898, F3100 and every Legifrance article fetch cleanly and
their text is stable; the two `immigration.interieur.gouv.fr` pages answer a
plain fetch with 403 and one of them hides the relevant text behind an
accordion that only opens under a real browser — so the shortage-list page and
the bilateral-agreements page are readable by a person and not by this watch.
`travail-emploi.gouv.fr` sits behind a bot check; the same fact was taken from
Legifrance and the ministry's DGEF page instead. The quotes s9 would ship all
come from the pages that fetch cleanly.
