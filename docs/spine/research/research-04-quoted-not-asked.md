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


---

## 4. Spain — teletrabajo de carácter internacional (the "digital nomad" route)

Read 2026-09-10 from the BOE's consolidated PDF and the joint instruction that
implements it. **This read corrected our own record**, which is what it was
sent to do.

**What it is.** A third-country national living in Spain while working remotely
for employers or clients based outside it, by computer and telecommunications
means only. Two doors: a **visa from abroad** (art. 74 quater, up to a year) and
a **residence authorisation from inside Spain** (art. 74 quinquies, up to three
years, renewable in two-year blocks). It covers both an employee of a foreign
employer and a self-employed person serving foreign clients — the latter may
take up to 20% of their work from a company in Spain.

**The conditions the authority states** (Ley 14/2013,
https://www.boe.es/buscar/pdf/2013/BOE-A-2013-10074-consolidado.pdf):

- The activity is remote and for companies outside Spain, *« mediante el uso
  exclusivo de medios y sistemas informáticos, telemáticos y de
  telecomunicación »* (art. 74 bis.1), with the 20% cap for professionals.
- Qualified people only: a degree or postgraduate qualification from a
  university, vocational school or business school of recognised standing, **or**
  three years' professional experience (art. 74 bis.2).
- The company must have been really and continuously trading for at least a
  year (art. 74 ter a), the relationship must be shown to be doable remotely
  (art. 74 ter b), and it must have existed for at least three months before
  the application (art. 74 ter c–d).
- Social security: the ordinary obligations, with *« sin que exista ninguna
  especialidad »* — no special regime (joint instruction, Sexta.1).

**Why it cannot be scored — and the correction.** Our `exclusions.md` said the
euro floor is arithmetic and that *no verbatim official euro figure exists to
quote*. Tested rather than repeated, and it is nearly right but not exactly:

- The binding instruction states a **formula, not a figure**:
  > « a) Titulares de los visados y autorizaciones de residencia: cantidad que
  > represente mensualmente el 200% del salario mínimo interprofesional (SMI). »
  (Instrucción conjunta, Tercera.1.a) — and the SMI is reset by a separate
  decree every year, so the number the reader needs is not in the rule.
- But a euro figure **does** exist on an official page: the Spanish consulate in
  Buenos Aires publishes *« el 200% mensual del salario mínimo interprofesional
  (SMI), es decir, 2.160 € »* — dated 2022, computed from that year's SMI, and
  therefore stale against the current one.

So the accurate reason is not "no official euro figure exists" but **"no
current, binding one does"**: the governing instruction carries only the
formula, and the one place a number appears is a single consulate's own
computation, out of date. `exclusions.md` is corrected accordingly.

And beside the arithmetic sits a judgement, which is the stronger reason:
> « Para la acreditación de las cantidades señaladas se podrá emplear cualquier
> medio de prueba y se efectuará un análisis individualizado. »
(Instrucción conjunta, Tercera.2) — any means of proof, assessed case by case.

**The exceptions.** Free-movement citizens are outside the whole section
(art. 61.2), and anyone whose situation belongs to the intra-company transfer
authorisation is refused this one and sent to arts. 73–74 (instruction,
Séptima.4). No nationality- or agreement-based variant appears in the articles
read.

**The reader's own page.**
https://www.inclusion.gob.es/web/unidadgrandesempresas/teletrabajadores — the
unit that decides the from-inside-Spain authorisation. A visa from abroad is
each consulate's own page; there is no single national one.

**Watchability, and a real limit.** The BOE consolidated PDF and the joint
instruction both need a client that downloads and extracts PDF text — a
fetch-and-summarise call cannot read them. Worse for us: the joint instruction,
the source of the 200% clause, answers a plain fetch with **403** and needs a
browser-shaped request; the UGE page does the same and then hides its documents
behind portlet tabs that the static HTML does not carry. So the quotable,
watchable sources here are the BOE text (with PDF extraction) and the Sydney
consulate's page, which fetches cleanly; the instruction itself would be a
human-tier entry.


---

## 5. The Netherlands — GVVA, the single permit for paid employment

Read 2026-09-10 from UWV's pages and the statute; the IND's own pages are
JS-gated and were read through a rendering fetch (see watchability).

**What it is.** One permit combining residence and work, for a non-EU national
coming to do ordinary paid work for more than 90 days. The employer normally
applies. Two boundaries matter: under 90 days the instrument is a TWV, a work
permit with no residence half; and the **highly skilled migrant permit this
product already scores escapes the whole thing** — UWV says it plainly:

> « Voor een kennismigrant van buiten de EU/EER of Zwitserland die langer dan 90
> dagen in Nederland komt werken, **hoeft de werkgever geen werkvergunning aan
> te vragen**. »
https://www.uwv.nl/nl/werkvergunning/wanneer-geen-werkvergunning

**The conditions the authority states.** The employer must have searched the
Netherlands and the EU/EEA first and registered the vacancy with UWV; must pay
the salary the applicable collective agreement sets (no euro figure on the
page); must be in the Chamber of Commerce register; must arrange proper
housing; and carries the sponsor's duties of information and record-keeping
(ind.nl's GVVA page). On the work-permit side UWV states four general
conditions — a valid residence permit, compliance with the terms of
employment, no breach of labour law, and a safe and clean place to live — plus
a salary paid monthly into the worker's own bank account and no labour-law fine
in the five years before the application
(https://www.uwv.nl/nl/werkvergunning/twv-voorwaarden). The permit runs three
years, or five after five years of permitted work.

**Why it cannot be scored** — here the statute writes the refusal itself:

> « Onze Minister weigert een tewerkstellingsvergunning of Onze Minister van
> Veiligheid en Justitie weigert een gecombineerde vergunning: a. indien voor de
> desbetreffende arbeidsplaats **prioriteitgenietend aanbod op de arbeidsmarkt
> aanwezig** is; b. indien het een arbeidsplaats betreft waarvan de
> beschikbaarheid niet ten minste vijf weken voor het indienen van de aanvraag
> aan het Uitvoeringsinstituut werknemersverzekeringen is gemeld; c. indien de
> werkgever niet kan aantonen **voldoende inspanningen** te hebben gepleegd de
> arbeidsplaats door prioriteitgenietend aanbod op de arbeidsmarkt te
> vervullen »
Wet arbeid vreemdelingen art. 8 lid 1 —
https://wetten.overheid.nl/BWBR0007149/2024-01-01

*Our rendering:* the permit is refused if there is priority supply on the labour
market for the job, if the vacancy was not reported to UWV at least five weeks
before, or if the employer cannot show **sufficient effort** to fill it from
that supply. And UWV names itself as the judge of it: « Wij controleren of het
werk gedaan kan worden door een werknemer uit de EU/EER of Zwitserland », after
the employer has spent « minimaal 3 maanden » looking
(https://www.uwv.nl/nl/werkvergunning/reguliere-arbeidsplaats). Two of the three
refusal grounds turn on someone else's effort and someone else's assessment of
it; neither is a fact about the applicant.

**The exceptions.** UWV lists ten categories that need no work permit at all —
among them the highly skilled migrant, ICT-permit holders working 90 days or
less in any 180, Blue Card holders from another member state on short business,
cross-border service providers, the self-employed, volunteers, and anyone whose
permit already carries « arbeid is vrij toegestaan ». The statute's own
exemption for people covered by an international agreement (art. 3 lid 1 onder
a) names no country; the IND's Turkish-citizens page carries the concrete case
— no TWV needed after three years with the same employer, and after one year
the employer needs none for that route.

**Watchability, and a limit worth knowing.** UWV's pages and the statute fetch
cleanly and read start to finish. **The IND's own route pages do not**: a plain
fetch returns a Drupal shell with an antibot gate and no article body, so every
IND sentence above came through a rendering fetch. For s9 that means the Dutch
page's quotes should come from UWV and `wetten.overheid.nl` where they can —
and any IND sentence we ship carries the same human-tier honesty the s8 sources
now carry.
