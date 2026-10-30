// @level presentation
// The token set itself, not a copy of it. It was pasted in — forty values
// retyped from `tokens.css` — which is the one thing the token file exists to
// prevent: "a value that steps outside a token is a greppable deviation", and a
// second copy is a deviation nobody can grep for (Standards review,
// 2026-09-07). Inlined into the page rather than linked because a route page is
// one file a stranger and a crawler both fetch cold.
import TOKENS from "../../../../tokens.css?raw";
// The identity pair, from the one file both screens read. The results page
// links the same stylesheet, so the mark and the stamp cannot drift apart
// into two identities (human, 2026-09-08).
import IDENTITY from "../../../../identity.css?raw";
/**
 * A stylesheet arrives with whatever line endings the checkout gave it.
 *
 * Both files are read from disk and printed into every page, so on a Windows
 * working copy the build emitted CRLF where CI emitted LF: the same commit,
 * two different pages, and the fingerprint that proves the template did not
 * drift went red on the machine the human walks from (2026-09-10). The line
 * ending is the checkout's business; the page is ours.
 */
const lf = (css: string): string => css.split("\r\n").join("\n");

// ---------------------------------------------------------------------------
// The stylesheet
// ---------------------------------------------------------------------------

/**
 * `docs/roadkeeper/design/s6-route-page.html`, verbatim, plus the two tap rules and
 * the accessibility fixes the critique's F5 asked for (a focus style of the
 * page's own, and a way to give a section a heading a screen reader can find
 * without printing one twice).
 *
 * The tokens are inlined rather than imported: a route page is one file a
 * search engine and a stranger both fetch cold, and a second request for four
 * kilobytes of custom properties buys nothing.
 */
export const FRAME_SHEET = `
${lf(TOKENS)}
* { box-sizing: border-box; }
body { margin: 0; background: var(--color-bg); color: var(--color-ink); font: var(--text-body); }
a { color: var(--color-stamp); }
.visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.wrap { max-width: var(--max-content); margin: 0 auto; padding: var(--space-5) var(--space-4) var(--space-6); }
.page { display: grid; grid-template-columns: minmax(0, 1fr) 17rem; gap: var(--space-5); align-items: start; margin-top: var(--space-4); }
.page > aside { position: sticky; top: var(--space-4); display: grid; gap: var(--gap-cards); }
@media (max-width: 760px) { .page { grid-template-columns: 1fr; } .page > aside { position: static; } }
.label { font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-muted); }
.mono { font: var(--text-value); }
/* The two ways an interactive element reaches the token's tap minimum. Every
   structural rule below outranks these on specificity, so they change nothing
   that is already tall enough and catch anything that is not. */
.tap-min { display: inline-flex; align-items: center; min-height: var(--tap-min); }
a.tap { display: inline-block; padding: calc((var(--tap-min) - 1.6em) / 2) 0; margin: calc((1.6em - var(--tap-min)) / 2) 0; }

/* ---- masthead ---- */
.masthead { border-bottom: var(--rule-heavy); padding-bottom: var(--space-4); }
h1 { font: var(--text-hero); margin: var(--space-2) 0 var(--space-2); }
.lede { margin: 0; color: var(--color-muted); }
${lf(IDENTITY)}

/* ---- what this page checks: plain words, ink on card, no verdict colour ---- */
.scope { margin: 0; padding: var(--space-3) var(--space-4); background: var(--color-card); border-left: 4px solid var(--color-ink); }
.scope b { font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-ink); display: block; margin-bottom: var(--space-1); }
.scope p { margin: 0; }

/* ---- a notice this page carries: a question the sources leave open, in the
   band colour rather than a verdict colour. It is not a rule, it is not met
   and it is not refused, so nothing here may wear the green or the red. ---- */
.notice-block { margin: var(--space-4) 0 0; padding: var(--space-3) var(--space-4); background: var(--color-card); border-left: 4px solid var(--color-band); }
.notice-block h2 { font: var(--text-route); margin: 0 0 var(--space-2); }
.notice-block p.plain { margin: 0; }
.notice-block .src { border-top: none; padding-top: var(--space-2); }
.notice-next { margin: var(--space-2) 0 0; }

/* ---- the rules ---- */
.rules { margin-top: var(--space-5); display: grid; gap: var(--gap-cards); }
.rule { background: var(--color-card); border-top: var(--rule-card-top); border-bottom: var(--rule-soft); padding: var(--pad-card); }
.rule .top { display: flex; justify-content: space-between; gap: var(--space-3); align-items: baseline; }
.rule h2 { font: var(--text-route); margin: 0; }
.kind { font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-muted); white-space: nowrap; }
.rule p.plain { margin: var(--space-2) 0 0; }
.rule ul.paths { margin: var(--space-1) 0 0; padding-left: 1.1rem; }

/* Threshold rail. The labels never sit on the track: positioned labels
   overlapped by 51-65 px at every common phone width (critique B1). The ticks
   are the picture; the list under them is the text, and a list cannot collide. */
.rail { position: relative; height: var(--rail-h); background: var(--rail-track); margin: var(--space-4) 0 var(--space-3); }
.rail .tick { position: absolute; top: -4px; width: 1px; height: calc(var(--rail-h) + 8px); background: var(--rail-tick); }
.rail-list { display: block; margin: 0 0 var(--space-2); padding: 0; list-style: none; }
.rail-list li { display: flex; justify-content: space-between; gap: var(--space-3); padding: var(--space-1) 0; border-bottom: var(--rule-dotted); }
.rail-list li span:first-child { font: var(--text-value); }
.rail-list li span:last-child { font: var(--text-source); color: var(--color-muted); text-align: right; }

/* A rule the dataset carries no quote for says what the interview will ask
   instead of restating its own heading in one sentence. Ink on the card, no
   new colour: this is not evidence and must not dress as evidence. */
.asks { margin: var(--space-3) 0 0; padding-top: var(--space-2); border-top: var(--rule-dotted); font: var(--text-source); color: var(--color-muted); }
.asks ul { margin: 0; padding-left: 1.1rem; }
.asks p { margin: var(--space-2) 0 0; }

/* Source line: the quote is the proof, so it is framed — language tagged, the
   separator difference explained once — and its link reaches 44 px. */
.src { font: var(--text-source); color: var(--color-muted); border-top: var(--rule-dotted); padding-top: var(--space-2); margin-top: var(--space-3); display: flex; justify-content: space-between; gap: var(--space-3); align-items: flex-start; }
.src q { font-style: italic; color: var(--color-ink); quotes: "\\201C" "\\201D"; }
.src b { color: var(--color-met); font-weight: 600; }
.src a { white-space: nowrap; display: inline-flex; align-items: center; min-height: var(--tap-min); padding: 0 var(--space-2); margin: 0; }
/* The note reads as part of the line it belongs to, separated the way the
   rest of that line is (F2). */
.src .note { display: inline; }

/* Ink on the soft tint: the label was --color-hold on --color-hold-soft, 3.68:1
   at 11 px — the most consequential line on the page was its least legible. */
.precond, .reading { margin: var(--space-3) 0 0; padding: var(--space-3) var(--space-4); border-left: 3px solid var(--color-hold); background: var(--color-hold-soft); }
/* Direct children only. A quote nested inside one of these blocks carries the
   read-date emphasis in its own <b>, and a descendant selector turned that date
   into an uppercase, letter-spaced label (seen on spain/intra-company-transfer
   once preconditions started carrying their quotes). */
.precond > b, .reading > b, .asks > b { font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-ink); display: block; margin-bottom: var(--space-1); }
.precond ul, .reading ul { margin: 0; padding-left: 1.1rem; }
.precond li, .reading li { margin-bottom: var(--space-2); }
.precond .src, .reading .src { border-top: none; padding-top: var(--space-1); margin-top: var(--space-1); }
/* s7: who a condition does not bind, under the condition itself — indented so
   the eye reads it as a qualification of the line above, never as a rule of
   its own. No verdict colour here either: the page rules on nobody. */
.except { margin: var(--space-2) 0 0 var(--space-3); padding-left: var(--space-3); border-left: 2px dashed var(--color-line); }
.except > b { font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-muted); }

/* ---- check yours ---- */
.cta { margin: var(--space-5) 0 0; padding: var(--space-4); background: var(--color-card); border: var(--rule-soft); display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
.cta p { margin: 0; }
/* The 404's second door: its heading is the bold opening sentence and the rest
   of the paragraph runs on after it, on the same line, as the one paragraph
   it used to be — so the heading a screen reader lands on is the sentence a
   sighted reader sees, once (s27). */
.cta .cta-text h2, .cta .cta-text p { display: inline; font: inherit; margin: 0; }
.cta .cta-text h2 { font-weight: 700; }
.cta a.btn { display: inline-flex; align-items: center; justify-content: center; text-align: center; min-height: var(--tap-min); line-height: 1.3; padding: .55rem var(--space-4); background: var(--color-ink); color: var(--color-bg); text-decoration: none; font: 700 .95rem var(--font-sans); }

/* ---- the data behind the page: the developer's door ---- */
.data { margin: 0; padding: var(--space-3) var(--space-4); background: var(--color-card); border-top: var(--rule-card-top); border-bottom: var(--rule-soft); display: grid; gap: var(--space-3); }
.data p { margin: 0; }
.data h2 { margin: 0; }
.data nav { display: grid; gap: var(--space-2); }
.data nav a { display: inline-flex; align-items: center; min-height: var(--tap-min); padding: 0 var(--space-3); border: var(--rule-soft); text-decoration: none; font: var(--text-value); }

/* ---- the answer ---- */
/* The number a search visitor came for, in the first screen: quiet furniture,
   loud number (isolated v1-gate critique 2026-09-08, F1). */
.answer { margin: 0; padding: var(--space-3) var(--space-4); background: var(--color-card); border-bottom: var(--rule-soft); }
.answer .label { margin: 0 0 var(--space-1); }
/* Not .asks: that class is the "what the checker asks" block three sections
   down, and this page has been bitten by a class collision twice already
   (.country vs .country-sec, .tick vs .rail-tick). */
.answer-figure { margin: 0; font: 600 1.5rem var(--font-mono); line-height: 1.35; color: var(--color-ink); }
.answer-figure b { font-weight: 600; }
.answer-label { font: var(--text-source); color: var(--color-muted); }
.answer-read { margin: var(--space-2) 0 0; font: var(--text-source); color: var(--color-muted); }

/* ---- the data page ---- */
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: var(--space-3); margin: var(--space-3) 0 0; }
.facts > div { border-top: var(--rule-dotted); padding-top: var(--space-2); }
.facts dt { font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-muted); }
.facts dd { margin: .2rem 0 0; font: var(--text-value); font-size: 1rem; color: var(--color-ink); }
.checks { list-style: none; margin: var(--space-3) 0 0; padding: 0; display: grid; gap: var(--space-2); }
.checks li { border-top: var(--rule-dotted); padding-top: var(--space-2); }
.checks b { color: var(--color-ink); }
/* The per-route JSON lists. Written as nav.jsonlinks because these navs sit
   inside section.data, whose own ".data nav a" rule is the route page's boxed
   data door and outranks a bare ".jsonlinks a". The links are rows here, so
   they take the tap-target floor as a row height: the inline tap class carries
   a negative vertical margin, which is right for a link inside a sentence and
   inside a grid pulled each list up over its own country heading (human, live
   site, 2026-09-08). */
nav.jsonlinks { display: grid; gap: 0; margin-top: var(--space-4); }
nav.jsonlinks .label { display: block; margin: 0 0 var(--space-1); padding: 0; color: var(--color-muted); }
nav.jsonlinks a { display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; min-height: var(--tap-min); margin: 0; padding: var(--space-2) 0; border: none; border-top: var(--rule-dotted); text-decoration: none; color: var(--color-stamp); font: var(--text-body); }
nav.jsonlinks a small { font: var(--text-source); color: var(--color-met); white-space: nowrap; }

/* ---- the country index: the whole card is the link ---- */
/* One target, not three: the name, the gist and the meta line sit inside a
   single link, so a thumb has the whole card and a reader has one thing to
   click (nav-mock critique F2, 2026-09-08). The title carries the link colour,
   because the card itself cannot. */
.routes { list-style: none; margin: var(--space-4) 0 0; padding: 0; display: grid; gap: var(--gap-cards); }
.routes li { background: var(--color-card); border: var(--rule-soft); }
.routes li:hover, .routes li:focus-within { border-color: var(--color-stamp); }
.routes a.card { display: block; padding: var(--pad-card); color: inherit; text-decoration: none; }
.routes .name { font: var(--text-route); line-height: 1.3; color: var(--color-stamp); text-decoration: underline; text-decoration-color: var(--color-line); text-underline-offset: .2em; }
.routes .gist { margin: .25rem 0 0; color: var(--color-ink); }
.routes .meta { display: flex; gap: var(--space-3); flex-wrap: wrap; margin: .45rem 0 0; font: 500 .85rem/1.4 var(--font-sans); color: var(--color-muted); }
.routes .meta b { font-weight: 600; color: var(--color-ink); }
.routes .meta .read { font: var(--text-source); color: var(--color-met); align-self: center; }

/* The routes a country page lists and the checker does not score. Set off by a
   rule and a heading, not by a colour: this section is quieter than the one
   above it, and a tint would read as a state (met / near / hold) on a page whose
   whole point is that it reaches no state (s9). */
.quoted-only { margin: var(--space-5) 0 0; padding-top: var(--space-4); border-top: var(--rule-heavy); }
.quoted-only h2 { margin: 0; }
.quoted-only .lede { margin: var(--space-2) 0 0; }
.cta .note { color: var(--color-muted); }
.cta.cta-country { flex-direction: column; align-items: center; text-align: center; }
footer .ends { display: flex; gap: var(--space-4); flex-wrap: wrap; }
footer .ends a { color: var(--color-muted); display: inline-flex; align-items: center; min-height: var(--tap-min); }

/* ---- neighbours ---- */
.neighbours { margin: 0; padding: var(--space-3) var(--space-4) var(--space-2); background: var(--color-card); border-top: var(--rule-card-top); border-bottom: var(--rule-soft); }
.neighbours h2 { margin: 0; }
.neighbours ul { list-style: none; padding: 0; margin: var(--space-2) 0 0; display: grid; gap: 0; }
.neighbours li a { display: block; min-height: var(--tap-min); padding: var(--space-2) 0; border-top: var(--rule-dotted); text-decoration: none; color: var(--color-ink); }
.neighbours li a small { display: block; font: var(--text-source); color: var(--color-muted); }

footer { margin-top: var(--space-6); border-top: var(--rule-heavy); padding-top: var(--space-4); color: var(--color-muted); }
footer .health { display: flex; justify-content: space-between; gap: var(--space-3); font: var(--text-source); margin-top: var(--space-3); flex-wrap: wrap; align-items: center; }
footer .health a { display: inline-flex; align-items: center; min-height: var(--tap-min); }

@media (max-width: 760px) {
  .src { flex-direction: column; }
  .src a { padding-left: 0; }
  /* On a phone the button leads its own section: the sentence about privacy
     is worth reading, and worth reading second (2026-09-08). */
  .cta { flex-direction: column; align-items: stretch; }
  /* The button goes full width on a phone, as every other button here
     does; only the text stays centred. */
  .cta.cta-country { align-items: stretch; }
  .cta a.btn { order: -1; text-align: center; }
  .rule .top { flex-direction: column; gap: var(--space-1); }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;
