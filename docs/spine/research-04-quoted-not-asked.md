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


---

## 2. Spain — autorización inicial de residencia temporal y trabajo por cuenta ajena

Read 2026-09-10, from the BOE's consolidated PDF of RD 1155/2024 (the rendered
HTML truncates before these articles) and the ministry's own pages.

**What it is.** The general regime's way in: an employer in Spain applies for a
non-EU worker of 16 or over to reside and work as an employee. **The employer
applies, not the worker.** The authorisation runs as long as the job, capped at
a year, and is tied to one occupation and — bar the exceptions the law names —
one autonomous community:

> « La autorización inicial de residencia temporal y trabajo por cuenta ajena
> tendrá una duración igual a la de la actividad a desarrollar, con el máximo de
> un año, y se limitará… a un ámbito geográfico autonómico y a una ocupación
> determinada. » (art. 73.4)

**The conditions the authority states** (all from the consolidated PDF,
https://www.boe.es/buscar/pdf/2024/BOE-A-2024-24099-consolidado.pdf):

- A contract signed by both, guaranteeing continuous work, whose start date is
  conditioned on the authorisation taking effect (art. 74.1.b).
- The employer current on tax and social security, with means enough for the
  business and for the obligations the contract puts on them (art. 74.1.d–e) —
  and, for an individual employer, a floor stated as a proportion of the SMI:
  50% for a single person, 100% for a two-person household, 25% more per
  additional member (art. 76.2).
- The worker holding the training and, where the profession requires it, the
  legally required qualification (art. 74.1.f).
- Pay: for part-time work, total pay at or above the **full-time** minimum wage
  computed annually (art. 74.1.c). No euro figure anywhere — the SMI is set by
  a separate annual decree.

**Why it cannot be scored** — two sentences, and they are different in kind:

> « a) Que la situación nacional de empleo permita la contratación de la
> persona trabajadora extranjera en los términos previstos en el artículo 75… »
> (art. 74.1.a)

The first path through art. 75 is a list: SEPE publishes, **every quarter and
per autonomous community**, a catalogue of hard-to-fill occupations, and being
on it opens the door. Checkable, but it is a different list every three months
in every region — a moving target rather than a rule.

The second path is a judgement:

> « …se considerará que la situación nacional de empleo permite la contratación
> en las ocupaciones no calificadas como de difícil cobertura cuando el
> empleador acredite ante la Oficina de Extranjería la dificultad de cubrir los
> puestos de trabajo vacantes con trabajadores ya incorporados en el mercado
> laboral interno… » (art. 75.2)

*Our rendering:* for an occupation not on the catalogue, the employer must
satisfy the immigration office that the vacancy could not be filled from the
local labour market — after a public matching period, with the employment
service issuing a certificate of insufficient candidates. Neither the quarterly
regional list nor the office's assessment is something the person applying can
check about themselves.

**The exceptions, quoted.** The regulation sets the test aside for the cases in
art. 40 of LO 4/2000 and under any international agreement (art. 74.2) — and
art. 40 is a long list: reunified family members of working age, renewals,
former refugees and stateless people, people with Spanish ascendants or
descendants in their care, those born and resident in Spain, grandchildren of
Spaniards by origin, and, in its second paragraph, positions of trust and
management, highly qualified professionals, intra-company transfers, and
artists of recognised standing
(https://www.boe.es/buscar/pdf/2000/BOE-A-2000-544-consolidado.pdf).

The regulation does not name a country; the ministry's own Hoja 12 does:
> « La autorización va dirigida a nacionales de Estados con los que España haya
> suscrito acuerdos internacionales (Chile y Perú). »

**The reader's own page.**
https://www.inclusion.gob.es/web/migraciones/cuenta-ajena — *"Trabajar en
España · Cuenta ajena"*, which links to Hoja 12, the sheet for this exact
authorisation.

**Watchability, and one thing worth fixing elsewhere.** The BOE consolidated
PDFs read cleanly (via a direct fetch and a text extraction, not the HTML), as
do the ministry's page and Hoja 12's PDF. SEPE's catalogue page redirects
through a client-side script: the resolved URL fetches cleanly, the advertised
one returns only the redirect stub. Two findings for a curator rather than for
s9: SEPE's page still cites the **repealed** RD 557/2011 art. 65.1 for the
catalogue rather than RD 1155/2024 art. 75, and the
`extranjeros.inclusion.gob.es` URL this project has used elsewhere for
procedure sheets now redirects to a 404 — the content moved to
`inclusion.gob.es/web/migraciones/`.


---

## 3. Germany — § 21 AufenthG, the residence permit for self-employment

Read 2026-09-10 from buzer.de, the consolidated mirror this dataset already
watches: gesetze-im-internet.de refused three connection attempts, and
make-it-in-germany.com answers an automated fetch with a bot-check loader page
whose own title is "Radware Page". Nothing below rests on either.

**What it is.** One section holding two routes. **Self-employment** (Abs. 1–4)
is a business or trade; **freelance work** (Abs. 5) is the liberal professions
— doctor, interpreter, artist, writer, architect — and is granted *abweichend
von Absatz 1*, without the economic-interest and financing test, but only where
any licence the profession needs has been granted or promised. The same section
also carries reciprocity (Abs. 2), an eased path for graduates of German
universities and for researchers (Abs. 2a), a stipend-funded founder's permit
(Abs. 2b), and self-employment alongside another residence purpose (Abs. 6).

**The conditions the statute states**
(https://www.buzer.de/21_AufenthG.htm, consolidated to 22 July 2026):

> « Einem Ausländer kann eine Aufenthaltserlaubnis zur Ausübung einer
> selbständigen Tätigkeit erteilt werden, wenn 1. ein wirtschaftliches Interesse
> oder ein regionales Bedürfnis besteht, 2. die Tätigkeit positive Auswirkungen
> auf die Wirtschaft erwarten lässt und 3. die Finanzierung der Umsetzung durch
> Eigenkapital oder durch eine Kreditzusage gesichert ist. » (Abs. 1 Satz 1)

*Our rendering:* a permit may be granted where there is an economic interest or
a regional need, where the activity is expected to have positive effects on the
economy, and where the financing is secured by equity or a credit commitment.

Beside those: an applicant over 45 should be granted the permit **only** with
adequate old-age provision (Abs. 3); the permit runs at most three years
(Abs. 4); and for the freelance variant a required professional licence must
already be granted or promised (Abs. 5).

**Why it cannot be scored** — the statute says the quiet part itself:

> « Die Beurteilung der Voraussetzungen nach Satz 1 richtet sich insbesondere
> nach der Tragfähigkeit der zu Grunde liegenden Geschäftsidee, den
> unternehmerischen Erfahrungen des Ausländers, der Höhe des Kapitaleinsatzes,
> den Auswirkungen auf die Beschäftigungs- und Ausbildungssituation und dem
> Beitrag für Innovation und Forschung. » (Abs. 1 Satz 2)

> « Bei der Prüfung sind die für den Ort der geplanten Tätigkeit fachkundigen
> Körperschaften, die zuständigen Gewerbebehörden, die öffentlich-rechtlichen
> Berufsvertretungen und die für die Berufszulassung zuständigen Behörden zu
> beteiligen. » (Abs. 1 Satz 3)

*Our rendering:* the assessment turns on the viability of the business idea,
the applicant's entrepreneurial experience, the capital committed, the effect
on employment and training, and the contribution to innovation and research —
weighed with the local chambers, the trade authorities and the professional
bodies. Five judgements and a committee: nothing a person can check about
themselves before they apply.

**The easier paths the statute names, quoted.**

- Reciprocity: a permit may also be granted « wenn völkerrechtliche
  Vergünstigungen auf der Grundlage der Gegenseitigkeit bestehen » (Abs. 2).
- Graduates of German universities, and researchers or scientists holding a
  permit under §§ 18b, 18d, 19c(1) or an EU Blue Card, **shall** be granted the
  permit *abweichend von Absatz 1* — where the intended activity shows a
  connection to what they studied or researched (Abs. 2a). This is the closest
  thing in the section to a checkable rule, and it still turns on "erkennen
  lassen": a connection the authority must see.
- A skilled worker with a subsistence stipend from a German business
  organisation or public body, for up to 18 months, to prepare a founding
  (Abs. 2b).
- Freelancers escape both the Abs. 1 test and the three-year cap (Abs. 5).

**The reader's own page.** BAMF's own article for this route, in both
languages, which cites § 21 as its legal basis:
https://www.bamf.de/EN/Themen/MigrationAufenthalt/ZuwandererDrittstaaten/Arbeit/SelbstaendigeTaetigkeit/selbstaendigetaetigkeit-node.html

**Watchability.** buzer.de and both BAMF pages fetch cleanly; the buzer entry
must be sliced from the "§ 21 Selbständige Tätigkeit" heading to just before
"Text in der Fassung des", as the other buzer entries already are. One
discrepancy worth recording rather than reconciling: the Auswärtiges Amt's own
summary says « ein **besonderes** wirtschaftliches Interesse » where the statute
says « ein wirtschaftliches Interesse » — the ministry's paraphrase is stricter
than the law it paraphrases, which is exactly why this product quotes statutes
and not summaries.
