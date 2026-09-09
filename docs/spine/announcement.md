# The announcement — told once, in the README's words (draft 2026-09-08;
# LinkedIn first, 2026-09-09)

Rule (s6 decision 10, launch dimension 9): the same claims in the same words on
every channel; no promise the product does not keep, no number the dataset
does not hold; the announced link reaches the product's one action with no
signup in the way; the maker is present for the first hours, and the first
comment is written before posting.

## LinkedIn — the first channel (2026-09-09: the human's choice; Show HN comes later)

Same claims, same words, shorter. What changes on LinkedIn is only the shape:
the first two lines are what most people see before "…see more", so the promise
goes there and the story after it. A post here can be edited and deleted, which
Show HN's cannot — so the 48-hour plan below gains one option it did not have.

**The post** (link in the body, not in a comment: dimension 9 says the announced
link reaches the product's one action, and a link a reader has to hunt for is
one more step in the way):

> Every "am I eligible for a work permit" site I found either sells a
> consultation or shows a number with no source and no date.
>
> So I built the opposite. Permit Rulebook is a free, static checker over an
> open dataset of employment-based work-permit routes in Germany, France, Spain
> and the Netherlands — 23 routes. You answer about seven questions and see
> which routes fit, which are close and by how much, and what one step would
> open more.
>
> What makes it different is what sits beside every number: the authority's own
> sentence, the page it came from, and the day we read it. A job re-reads every
> source daily and files an issue when a page changes. Your answers never leave
> your device — there is no backend, and a test in the repository checks that
> nothing but the page's own assets is requested.
>
> What it is not: it makes no immigration decision, and no authority is bound by
> its results. Routes that turn on an official's discretion are listed with
> their reasons rather than scored.
>
> Known limits, so nobody has to discover them: four countries, 23 routes,
> English only.
>
> Try it: https://permitrulebook.com
> The data is open (CC BY 4.0): https://github.com/OytunOnal/permit-rulebook-data
> The site is MIT: https://github.com/OytunOnal/permit-rulebook
>
> If a value is wrong, "Report a wrong value" on any page goes to the tracker. I
> read every one.

**The image:** the results screenshot (`docs/media/results-2026-09-08.png`) — a
picture of the product doing its one thing, the same image the README opens
with. Not the social card: LinkedIn will draw that by itself if the link is
posted without an image, and the screenshot says more.

**Hashtags:** three at most, at the end, and only ones a person would follow —
`#immigration #opendata #workpermit`. A wall of tags reads as reach-seeking and
costs the post its register.

**When:** an hour the human can answer comments for the next three (dimension 9:
the maker is present). Weekday morning European time is when this audience is
on LinkedIn; the choice is the human's.

**The first replies, ready before posting:** the five answers below, in the
maker's voice, are the same on any channel.

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

**LinkedIn first** (the human's call, 2026-09-09): one channel, the audience
that already knows the maker, and a post that can be corrected in place. Show
HN comes later, on its own day — the draft above stays as it is until then.

At an hour the human can answer for the next three (dimension 9: the maker is
present). Everything the checklist gated it on is done: 2FA, the phone walk on
the real handset, the critique's blockers cleared on the live site, the
dispatch proven end to end, Search Console and Bing carrying the sitemap.

## The first 48 hours, on this channel

What to watch: the Cloudflare counter (visits, and which pages), the data
repository's tracker (`bug`, `design-flaw`, `new-need`), the daily watch's
issues, and the post's own comments.

If a reported wrong verdict is confirmed against the source, or a flag shows a
live value has gone stale: fix the value with its history line, let the rebuild
land, and then — because LinkedIn allows what Show HN does not — **edit the
post** to say what was wrong and what it says now, rather than leaving a
correction only in the comments. A legal objection to a quote: take the quote
down first, answer second.
