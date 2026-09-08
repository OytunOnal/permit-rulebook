# The announcement — told once, in the README's words (draft 2026-09-08)

Rule (s6 decision 10, launch dimension 9): the same claims in the same words on
every channel; no promise the product does not keep, no number the dataset
does not hold; the announced link reaches the product's one action with no
signup in the way; the maker is present for the first hours, and the first
comment is written before posting.

## Show HN — title (≤ 80 characters)

Show HN: Permit Rulebook – EU work-permit rules, every value quoted and dated

## Show HN — the post (the link is the site; this text is the first comment)

I built this because every "am I eligible" site I found either sells a
consultation or shows numbers with no source and no date.

Permit Rulebook is a static checker over an open dataset of employment-based
work-permit routes for Germany, France, Spain and the Netherlands — 23 routes.
Every threshold carries the authority's own sentence, the page it came from
and the day we read it; a daily job re-reads every source and files an issue
when a page changes. Your answers never leave your device (there is no
backend; a test in the repo checks that nothing but the page's own assets is
requested).

What it is not: it makes no immigration decision and no authority is bound by
its results — it compares published values with what you declare, nothing
more. Routes that turn on an official's discretion are listed with their
reasons, not scored.

Try it: https://permitrulebook.com — seven or so questions, results with the
quotes beside them. Each route also has its own page, e.g.
https://permitrulebook.com/germany/eu-blue-card-general

Data: https://github.com/OytunOnal/permit-rulebook-data (CC BY 4.0, JSON per
route, the schema, the watch). Site: https://github.com/OytunOnal/permit-rulebook
(MIT). If a value is wrong, "Report a wrong value" on any page goes to the
tracker.

Known limits, so nobody has to discover them: four countries; 23 routes (the
~14 discretionary ones come as quoted-not-scored pages next); English only;
the interview asks salary in bands whose edges are the thresholds themselves.

## The five answers, in the maker's voice (for replies)

- **What is it?** A checker and a rulebook: which employment routes could fit
  what you declare, with every rule quoted from the authority and dated.
- **Who is it for?** People with a non-EU passport weighing a job offer,
  a transfer or a job search in DE/FR/ES/NL — and anyone who wants the rules
  as open data.
- **What does it do now?** v1: four countries, 23 scored routes, 122 quotes
  verified daily against their sources, route pages, JSON per route.
- **How do I run it?** `git clone` both repositories side by side, `npm ci`,
  `npm run build` — the README's first screen has the exact command.
- **Where does feedback go?** The tracker on the data repository — three
  labels: bug, design-flaw, new-need.

## When

At an hour the human can stay in the thread for its first three hours
(dimension 9: the maker is present) — not before 2FA, the phone walk and the
critique's blockers are done (STATUS's checklist), and after the sitemap has
been in Search Console for a few days.
