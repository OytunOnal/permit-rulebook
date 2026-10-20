# Threat model — Permit Rulebook (written 2026-09-08, at the launch slice; Product level)

One page, written as decisions. Each threat ends in a **permanent symptom
check on the surface** or a recorded **accepted, because**. A threat that is
neither is a blank; there are none below.

## What we protect

- **The reader's privacy** — what a person declares about themselves (passport,
  salary band, age band, situation). The one-pager's non-negotiable: answers
  never leave the device.
- **The sources' trust** — every value is an authority's own sentence, dated;
  a wrong or silently changed value is the product failing at its one job.
- **The accounts the site *is*** — GitHub (both repositories, Pages, Actions),
  Cloudflare (registrar, DNS, Web Analytics). The site is whatever those say.
- **The build pipeline** — a captured dependency or action can change what the
  site says without a commit anyone reviewed.
- **Nothing else**: no money moves, no accounts exist for readers, no server
  runs, no database holds anything.

## Who can hurt it, and what holds

| Threat | Who | Holds by |
|---|---|---|
| Answers leave the device (a script, an analytics beacon, a form) | ourselves by mistake; a captured script | **Checked:** a real-browser test walks the interview, changes an answer, and asserts every request is a same-origin GET or the one declared beacon, whose body carries no answer (`tests/record.test.ts`, "the one-pager's promise"). The data page states what the beacon collects. |
| A value on a live page goes stale or wrong | a source page changes; ourselves | **Checked:** the daily watch re-reads every source; quote fidelity fails the build when a shipped sentence is no longer on its page; flags become issues a person reads (decision 7). Note: `data.lock` may be advanced by the daily schedule to a data commit no person reviewed — the gate there is the full suite, not a reader; a *value* still changes only when a person edits it. |
| A source page carries text that looks like instructions to us (prompt injection through the watch) | a stranger who can edit an official page, or a captured page | **Accepted, because** the watch never acts on page text: it hashes, diffs and quotes; a person reads the flag before any value changes. The quoted excerpt is data in an issue body, never an instruction. Kept as a rule for any future automation. |
| Unescaped dataset text injected into HTML (a quotation mark in a name or URL) | a contributor's pull request; ourselves | **Checked:** `escAttr`/`esc` gate over every interpolated attribute, with a hostile-value fixture (`tests/escaping.test.ts`). Text is escaped where it is drawn as markup: the interview's headline composes its HTML from escaped words in `mastheadFor` (`tests/screen.test.ts`), and the social card escapes what it prints (`tests/escaping.test.ts`); a notice's title, a country's name and a situation's label once reached the headline raw (#25). |
| A captured GitHub Action or npm dependency rewrites the site | a captured upstream | **Checked / decided:** actions pinned to full commit SHAs, `GITHUB_TOKEN` read-only by default, every dependency, dev ones included, audited at high or above on each run of the watch and the deploy: a known advisory turns the run red and stops none of its work (`tests/audit-and-runner.test.ts` in both repositories, #24). The data package's dependencies, which the site's build installs at the commit `data.lock` names, are audited by the data watch on data `master`, which `data.lock` follows daily. Lockfiles committed. |
| A repository-settings writer points the deploy at a host they control (the carry publishes their bytes from our origin; canonical links and the sitemap name their host) | a writer of this repository's variables | **Checked:** the site's address is a literal in the deploy workflow, reviewed like any code; the deploy reads no repository variable (the pipeline tests, `tests/pipeline.test.ts`); the carry fetches only from the origin it is given and checks every carried byte against the previous build's digest list (the carry's tests). |
| The `DISPATCH_TOKEN` (site rebuild trigger) leaks | ourselves | **Accepted, because** it is a fine-grained token scoped to one repository with Contents read/write only; a leak lets someone rebuild or push the site repository — rotation is one click; the token is never printed (the workflow fails loudly, it does not echo). |
| The registrar / DNS / GitHub account is taken over | a stranger with a stolen password | **Decided:** two-factor authentication on GitHub, Cloudflare and the registrar (Cloudflare) — the human's item before "go". The API cannot verify it with this session's token scopes; the human confirms. |
| Response headers we cannot set (HSTS preload, CSP) | a network attacker; an injected script | **Accepted, because** GitHub Pages sets no HSTS on a custom domain (verified with `curl -I`, 2026-09-08: no `Strict-Transport-Security`) and allows no custom headers; HTTPS is enforced by redirect. A CSP goes in as a `<meta http-equiv>` naming the script sources, with `style-src 'unsafe-inline'` **accepted** (the pages inline their stylesheet; an injected style can restyle, not exfiltrate — `img-src`, `font-src` and `connect-src` stay closed); HSTS preload would need a proxy (decision 6 names Cloudflare Pages as the move). Exposure named: without the CSP an injected inline script would run — the only scripts are ours (built, escaped) and the declared beacon. |
| A stranger floods the tracker or the sponsors page | a malicious user | **Accepted, because** GitHub rate-limits issue creation and Sponsors; nothing here spends money on a stranger's action; no paid API is called. |
| The IndexNow key (`public/<key>.txt`, which the deploy POSTs to Bing with every sitemap address) is read by a stranger | anyone — it is served at the site's root | **Accepted, because** the key is public by the protocol's design: IndexNow proves ownership by the file being AT the host, not by the key being secret. The worst a stranger can do with it is submit our own addresses to Bing — addresses the sitemap already offers — and a URL on another host is rejected, because the key file is not there. Nothing is spent; the job cannot fail a deploy (s24, 2026-09-17). |
| We ship a wrong verdict | ourselves | **Checked:** property tests over generated profiles, the fixed-population differential, the isolated critique before each public version, the tracker's `bug` label with the 48-hour pull rule. |

## The security dimension of the launch (steward-40), answered

- **Accounts:** 2FA on GitHub, Cloudflare — the human's item; not verifiable by the API with this session's token scopes, so the human confirms.
- **Headers:** no HSTS on the custom domain (accepted, exposure named above; HTTPS is enforced by redirect); a meta CSP naming the script sources (pipeline round).
- **Dependencies:** `npm audit --omit=dev` re-run on the launch commit in both repositories (result in DECISIONS at the v1 stamp).
- **Abuse limits:** nothing spends money or calls a paid API; not applicable, said so.
- **Pipeline:** actions pinned by SHA, token read-only, no plaintext secret (the builder's round).
- **The statement matches the wire:** the data page's sentence about the counter is what the never-leaves-the-device test measures.
