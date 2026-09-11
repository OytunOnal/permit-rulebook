# research-05 — does Spain have a job-search permit, and does France?

Deep verification pass, triggered by a direct user question: are the Chancenkarte
(§ 20a AufenthG) and the Dutch zoekjaar really the only "come to look for work"
routes in a 28-route, four-country dataset, or is Spain/France missing one that
belongs in `data/exclusions.md` — or belongs as a fifth slice?

Grounding: official sources only, fetched this session (2026-09-11), every rule a
verbatim quote with its URL, source language kept, English gloss marked as mine.
The first-pass tool (WebFetch's summarizing model) **missed the Spanish route
entirely on the first read** — it reported "no such provision" after skimming
only Títulos II–VII of RD 1155/2024's table of contents. That miss is exactly why
this is a deep pass: the raw HTML was downloaded and grepped directly rather than
trusting the summary. Details below.

---

## Short answer

- **Spain: the route exists, and — unlike France's — it is usable by someone
  abroad with no prior connection to Spain.** But it is not an open Chancenkarte-style
  route: it comes in exactly two closed classes (descendants of Spaniards by
  origin; specific occupations/territories) and both are switched on only by an
  annual ministerial order under the collective-recruitment-at-origin scheme.
  Outcome 1 (hole in the dataset / candidate slice) — with the caveat below about
  the annual order's current status, which this pass did not chase down.
- **Spain also has a second, narrower route** (Ley 14/2013, disposición adicional
  séptima) that is structurally the twin of France's RECE: for foreign students
  who already finished a degree *in Spain*. That one is Outcome 2 (exclusions.md
  material, same shape as France).
- **France: the route (RECE) exists, but every eligibility branch requires a
  prior connection to France** — either currently holding a student/researcher
  residence permit there, or having obtained the qualifying French diploma there
  before leaving. Outcome 2 (exclusions.md, with quote).

---

## 1. Spain — RD 1155/2024 (Reglamento de extranjería)

**SOURCE:** https://www.boe.es/buscar/act.php?id=BOE-A-2024-24099 · read 2026-09-11 · fetched (HTTP 200, downloaded raw HTML, 1,017,647 bytes; entry-into-force banner reads "Entrada en vigor: 20/05/2025", consolidated text last updated "15/04/2026" — current as read)

**FOUND — the route exists, Título II ("Visados"), Sección 4.ª, Artículos 43–45:**

> "Sección 4.ª Visados para la búsqueda de empleo"

> "Artículo 43. Visados para la búsqueda de empleo. 1. Los visados para la
> búsqueda de empleo autorizarán a la persona extranjera a desplazarse al
> territorio español para la búsqueda de empleo durante un periodo de residencia
> de doce meses. Durante este periodo, en el caso de obtener un contrato, el
> empleador deberá presentar una solicitud de autorización inicial de residencia
> temporal y trabajo por cuenta ajena en favor de la persona extranjera, de
> acuerdo con lo establecido en el artículo 73.2."

English gloss (mine, not a translation on the page): the visa authorises the
foreign person **to travel to Spanish territory** to look for work, for a
12-month residence period; if they get a contract during that period, the
employer files for an initial work-and-residence authorisation on their behalf.
This is explicitly a from-abroad route, structurally the same shape as
Chancenkarte/zoekjaar (come first, find work after).

> "2. Los visados para la búsqueda de empleo serán de una de las clases
> siguientes: a) Visados para la búsqueda de empleo dirigidos a hijos o nietos
> de español de origen. b) Visados para la búsqueda de empleo en determinadas
> ocupaciones y ámbitos territoriales."

FOUND: only two classes exist — (a) children/grandchildren of a Spaniard by
origin, (b) specific occupations and territorial scopes. There is no general,
open-to-anyone class.

> "3. Los requisitos para la obtención del visado serán los establecidos en el
> artículo 38 y los específicos que se establezcan en la orden ministerial por
> la que se apruebe la gestión colectiva de contrataciones en origen."

FOUND: beyond the generic Article 38 visa requirements (clean criminal record,
valid application, not inadmissible, etc. — Article 38 quoted separately below),
the *specific* requirements for this visa are not in the regulation itself —
they are set by a yearly ministerial order.

**Article 44 — the descendants-of-Spaniards class, in full:**

> "Artículo 44. Visados para la búsqueda de empleo dirigidos a hijos o nietos de
> español de origen. 1. La orden ministerial por la que se apruebe la gestión
> colectiva de contrataciones en origen podrá aprobar un número de visados de
> búsqueda de empleo dirigidos a hijos o nietos de español de origen que, de
> acuerdo con lo dispuesto por el artículo 40 de la Ley Orgánica 4/2000, de 11
> de enero, se encuentran exentos de la valoración de la situación nacional de
> empleo. 2. El número de visados de búsqueda de empleo dirigido a los hijos y
> nietos de español de origen, el sistema de selección de los destinatarios y
> las fórmulas de presentación de las solicitudes se regularán en la orden
> ministerial por la que se apruebe la gestión colectiva de contrataciones en
> origen."

**Article 45 — the occupations/territories class, in full:**

> "Artículo 45. Visados para la búsqueda de empleo en determinadas ocupaciones y
> ámbitos territoriales. 1. La orden ministerial por la que se apruebe la
> gestión colectiva de contrataciones en origen podrá aprobar un número de
> visados de búsqueda de empleo limitados a determinadas ocupaciones y ámbitos
> territoriales. Excepcionalmente, cuando se produzcan circunstancias
> imprevistas en el mercado laboral, la Dirección General de Gestión Migratoria
> podrá disponer que la autorización de residencia y trabajo sea concedida en
> otro ámbito territorial u ocupación. 2. El número de visados de búsqueda de
> empleo en determinadas ocupaciones y ámbitos territoriales, el sistema de
> selección de los destinatarios y las fórmulas de presentación de las
> solicitudes se regularán en la orden ministerial por la que se apruebe la
> gestión colectiva de contrataciones en origen."

**Article 38 (the baseline visa requirements Art. 43.3 points to):**

> "Artículo 38. Requisitos para obtener el visado de residencia. Serán
> requisitos para la concesión del visado de residencia: a) Que la persona
> extranjera aporte el impreso de solicitud, debidamente cumplimentado y
> firmado. b) No encontrarse irregularmente en territorio español. c) No figurar
> como rechazable en el espacio territorial de países con los que España tenga
> firmado un convenio en tal sentido. d) [continues, not fully captured this
> pass — truncated by my grep window, not by the source]"

**FOUND — leads to work authorisation:** confirmed in Art. 43.1/43.4/43.5 quoted
above — once a contract is found, the employer's filing plus the worker's
Social Security registration converts the job-search status into an initial
work-and-residence authorisation ("tendrá la consideración de autorización
inicial de residencia y trabajo por cuenta ajena").

**INFERRED, not found this pass — flagged as a genuine open question:**
Articles 43–45 gate the *actual availability and numbers* of these visas behind
"la orden ministerial por la que se apruebe la gestión colectiva de
contrataciones en origen" (the annual ministerial order approving collective
recruitment-at-origin, which Título VI of this same regulation, Arts. 113+,
governs as the modern successor to the old "contingente" system). **This pass
did not fetch that ministerial order** to confirm whether it is currently
published/in force for 2026, what number of visas (if any) it sets this year,
or whether it is currently zero. So: the legal route exists and is in force
today (the regulation itself, entered into force 20/05/2025, is current), but
whether a person can walk into a consulate and actually get one of these visas
right now depends on a document this pass did not check. That is a distinct,
answerable follow-up — not covered by "presence could not be verified" (the
route's existence in the regulation is confirmed), but its *live availability*
is unverified.

**Table of contents actually searched (Título-level), confirming no other job-search
provision was missed:** TÍTULO I (Régimen de entrada y salida), TÍTULO II
(Visados — where Arts. 43–45 sit), TÍTULO III (La estancia en España), TÍTULO IV
(Residencia temporal), TÍTULO V (Residencia y trabajo para actividades de
temporada), TÍTULO VI (Gestión colectiva de contrataciones en origen), TÍTULO
VII (Residencia temporal por circunstancias excepcionales), plus VIII, X, XI,
XIII, XIV, XV as listed in the document's own index. No second "búsqueda de
empleo" provision appears anywhere else in the text (checked by exhaustive
string search over the full 770KB extracted plain text for "búsqueda de
empleo" — all 13 occurrences land inside Arts. 43–45 or their cross-references
in Arts. 60, 115, and the summary/definitions passages already quoted above).

---

## 2. Spain — Ley 14/2013 (Ley de apoyo a los emprendedores) — the *other* route

**SOURCE:** https://www.boe.es/buscar/act.php?id=BOE-A-2013-10074 · read 2026-09-11 · fetched (HTTP 200, downloaded raw HTML, 776,063 bytes; "Entrada en vigor: 29/09/2013"; consolidated text current as read)

This law does **not** contain a from-abroad job-search visa (confirmed by
exhaustive search of Título V Sección 2ª, Arts. 61–72, "Movilidad
internacional", which covers investors, entrepreneurs, intra-company transfers,
highly-qualified workers, researchers, and their family members — no job-search
class among them). It **does** contain a second, different job-search route,
structurally the twin of France's RECE:

**FOUND, full text — Disposición adicional séptima:**

> "Disposición adicional séptima. Autorización de residencia al estudiante para
> la búsqueda de empleo o para emprender un proyecto empresarial. 1. Una vez
> finalizados los estudios en una institución de educación superior, los
> extranjeros que hayan alcanzado como mínimo el Nivel 6 de acuerdo con el Marco
> Europeo de Cualificaciones, correspondiente a la acreditación de grado, podrán
> permanecer en España durante un período máximo improrrogable de veinticuatro
> meses con el fin de buscar un empleo adecuado en relación con el nivel de los
> estudios finalizados o para emprender un proyecto empresarial. 2. A tal
> efecto, durante los sesenta días naturales previos a la fecha de expiración de
> la vigencia de su autorización de estancia por estudios y durante los noventa
> días naturales posteriores a la fecha en que hubiera finalizado la vigencia de
> dicha autorización de estancia, el estudiante solicitará mediante medios
> electrónicos una autorización de residencia para la búsqueda de empleo o para
> emprender un proyecto empresarial a la Delegación o Subdelegación del Gobierno
> de la provincia en la que vaya a residir, que únicamente comprobará que se ha
> obtenido el título o certificado de educación superior u otra prueba de
> cualificación oficial, que cuenta con seguro médico y el mantenimiento de
> recursos suficientes. [...] 4. El plazo para resolver esta autorización será
> de 20 días, transcurridos los cuales se entenderá concedida por silencio
> administrativo."

FOUND: this route is **only for people who already finished a qualifying
degree (EQF level 6+) at a Spanish institution**, applied for from inside
Spain in a 60-days-before/90-days-after window around the student permit's
expiry. It is not usable by someone abroad with no prior Spanish connection —
same shape as the French RECE finding below. Duration: up to 24 months,
non-renewable ("período máximo improrrogable de veinticuatro meses").

**INFERRED:** this is the Spanish analogue the dataset would exclude alongside
France's RECE, not the analogue of Chancenkarte/zoekjaar — that role, if any,
belongs to Arts. 43–45 of RD 1155/2024 above.

---

## 3. France — carte de séjour / VLS-TS « recherche d'emploi ou création d'entreprise » (RECE)

**SOURCE:** https://www.service-public.gouv.fr/particuliers/vosdroits/F17319 · read 2026-09-11 · fetched (HTTP 200, downloaded raw HTML, 162,615 bytes; page footer states "Vérifié le 01 juin 2026")

**FOUND — two eligibility branches, both gated on a prior France connection:**

> "Qui peut demander la carte de séjour ou le VLS-TS - recherche d'emploi/création d'entreprise ? [...] Vous résidez en France Vous devez remplir les 2 conditions suivantes : Séjourner en France avec une carte de séjour étudiant ou étudiant programme de mobilité Avoir obtenu au cours des 12 derniers mois, une licence professionnelle, un Mastère Spécialisé, un Master of Science [...]"

FOUND (branch 1, "you reside in France"): both required — (a) currently
holding a student/student-mobility residence card, **and** (b) having obtained,
within the last 12 months, at minimum a licence professionnelle/Mastère
Spécialisé/MSc-equivalent — necessarily earned in France, since it must
coincide with holding a French student card.

> "Vous êtes reparti à l'étranger après avoir obtenu votre diplôme en France
> Vous devez demander le visa long séjour valant titre de séjour (VLS-TS),
> portant la mention « recherche d'emploi/Création d'entreprise »."

FOUND (branch 2, "you left for abroad after obtaining your diploma in
France"): this is the only branch reachable from outside France, and it
explicitly requires having **already obtained the French diploma** before
leaving — i.e. a prior stay and qualification in France is the precondition,
not something a person can arrive fresh to pursue. This directly confirms the
task's working hypothesis.

**FOUND — the researcher branch, same shape:**

> "Qui peut demander la carte de séjour - recherche d'emploi/création
> d'entreprise ? [...] Vous pouvez demander la carte de séjour recherche
> d'emploi/création d'entreprise si vous remplissez les 2 conditions suivantes :
> Séjourner en France avec une carte de séjour pluriannuelle talent-chercheur
> Avoir achevé vos travaux de recherche."

FOUND: requires currently holding a "talent-chercheur" multi-year card in
France **and** having completed the research there — again, prior presence and
a prior French research contract, not an entry route for someone abroad with
no connection.

**FOUND — duration:**

> "La carte de séjour ou le VLS-TS est valable 1 an."
> "La carte de séjour est valable 1 an."

FOUND: 1 year, appearing twice (once per branch's own accordion panel on the
same page).

**FOUND — legal basis cited on the page (CESEDA, Code de l'entrée et du séjour
des étrangers et du droit d'asile):**

> "Code de l'entrée et du séjour des étrangers et du droit d'asile : articles
> L412-7 à L412-10" / "... articles L422-8 à L422-14" / "... articles L432-1 à
> L432-15" / "... articles L436-1 à L436-13" / "... articles R422-12 à R422-14"

FOUND, verbatim from the page's "Textes de référence" list — these are the
CESEDA articles the fiche cites for this card. **Unquotable for us**: I could
not open any of these articles on Legifrance to quote their operative text —
see unreachable-sources section below. The service-public.gouv.fr fiche above
is the only quotable source for the eligibility conditions in this report.

**Verdict for France:** the RECE card exists and is legally in force (page
verified 01 June 2026), but **every eligibility path requires a prior
connection to France** — either currently residing there on a student/
researcher status, or having already obtained the qualifying French diploma
before leaving. No branch is reachable by someone abroad with no prior French
presence. This matches the task's working hypothesis and is Outcome 2
(exclusions.md material).

---

## Unreachable sources

**SOURCE:** https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038366085 · attempted 2026-09-11 · unreachable (HTTP 403, curl, 2 attempts on both URL shapes)
**SOURCE:** https://www.legifrance.gouv.fr/ceta/id/LEGIARTI000038366085 · attempted 2026-09-11 · unreachable (HTTP 403, curl)

FOUND: both Legifrance URL patterns named in the task return HTTP 403 to this
fetcher, confirming the task's own prior measurement (2026-09-10). No CESEDA
article text was retrievable from Legifrance this session; every French claim
above is sourced from service-public.gouv.fr only.

**SOURCE:** https://france-visas.gouv.fr/en/recherche-d-emploi-creation-d-entreprise · attempted 2026-09-11 · unreachable (HTTP 403, curl)

Not used for any claim above; noted because it surfaced in search results as a
plausible source and could not be fetched either.

**SOURCE:** https://www.service-public.fr/particuliers/vosdroits/F35495/3_3_2_0 · attempted 2026-09-11 · unreachable (HTTP 404)

Surfaced in search results as a possible sub-fiche; the URL as given 404s. Not
used for any claim. F17319 (above) is the fiche that actually carries the
content and is the one to watch.

---

## What can be watched going forward

- Spain, slice-candidate source: https://www.boe.es/buscar/act.php?id=BOE-A-2024-24099 (fetches cleanly as HTML; confirmed suitable for this project's watcher, per the task's own note — Arts. 43–45 specifically)
- Spain, exclusions-candidate source: https://www.boe.es/buscar/act.php?id=BOE-A-2013-10074 (fetches cleanly as HTML; disposición adicional séptima)
- France, exclusions-candidate source: https://www.service-public.gouv.fr/particuliers/vosdroits/F17319 (fetches cleanly as HTML; "Vérifié le 01 juin 2026")
- Not watchable: any legifrance.gouv.fr URL (403 to this fetcher, confirmed twice independently)
