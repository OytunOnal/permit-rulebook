# s36 — the address the watch connects to

v1.2's queue head, versioned at the roadmap fork of 2026-09-24 (human:
"uygula"), born of s34's Security review and left standing by s34's declared
boundary (human: "sınır", 2026-09-24). Written 2026-09-24 on `s36-resolve-time`,
before any code; approved when the human says so.

## What happened

The fetcher's floor reads the address a source *spells*. `addressKind`
decides loopback, link-local, private or public from a literal — an IPv4 in
any spelling the URL parser normalises, an IPv6 with `::` expanded and its
mapped and embedded forms — plus the two names that can only mean this
machine (`localhost` and anything under it). Every other name is taken at
face value. Its own header says so:

> A source that points a hostname at a private address gets through this.

Two classes sit outside the line that header draws:

- **A name.** `mirror.example.org` resolving to `10.0.0.5`, or to
  `169.254.169.254` — the address a cloud runner keeps its credentials
  behind. The floor sees a public-looking name and requests it. Only the
  `link` strategy follows a redirect `anywhere`, so the reach is a `learn-…`
  entry's redirect chain and the entry's own address; the bytes of a `link`
  entry are never hashed, so the harm is the request, and on a hosted runner
  a request to `169.254.169.254` reaches something.
- **The transition and legacy prefixes**, which are literals the floor reads
  as public because it never learnt them: NAT64 `64:ff9b::/96` (an IPv4
  address carried inside an IPv6 one), 6to4 `2002::/16` (the same, in the
  first two groups), the compat form `::/96`, and site-local `fec0::/10`.
  s34's Security round probed each from a public entry and each was
  requested.

Neither is reachable by any source in today's watchlist (no entry redirects
this way), and neither has ever happened. The mechanism that closes both is
one sentence the code cannot say today: **connect to the address you
checked.**

## What a reader gets

Nothing. No page, no string, no dataset field changes. What changes is what
the runner's outbound socket may reach: a source can no longer name a public
host and be connected to a private one, and the addresses the floor could
not spell are spelled.

## What must be true

1. **The fetch tier resolves, judges, and connects to what it judged.** The
   fetcher asks the system resolver for the host's addresses, classifies
   every one of them with `addressKind`, and hands the connection the single
   address it approved — so the address that was checked is the address the
   socket uses, and a second answer between the check and the connect cannot
   be substituted. Node's `https`/`http` request takes a `lookup` hook that
   is handed the hostname and gives back the address to connect to; refusing
   inside it refuses before any packet leaves (probed 2026-09-24 on Node
   v24.20.0: the hook is called with the host and an error thrown there ends
   the request with no connection).
2. **The rule is the floor's own, applied to the resolved address.** Every
   address the resolver gives is classified; the refusal is the relative rule
   already written — link-local never, and a kind other than public only when
   the entry itself is on that kind (a loopback fixture may stay on loopback).
   If a name resolves to several addresses and any one of them is refused,
   the name is refused: a resolver that answers differently on the second
   call must not be able to pick the allowed one.
3. **The prefixes the floor could not spell are spelled.** `addressKind`
   learns the four: NAT64 `64:ff9b::/96` and 6to4 `2002::/16` are the IPv4
   address they carry and take its rule; the compat form `::/96` is that
   IPv4 address too (`::a9fe:a9fe` is 169.254.169.254); site-local
   `fec0::/10` is `private`. The header's declared boundary loses these four
   and keeps only what is honestly still outside: a name is now resolved, so
   the sentence "a source that points a hostname at a private address gets
   through this" goes, and what remains to declare is named in point 7.
4. **The entry's own address is checked the same way.** `refusedAddress` is
   the gate before anything is requested; the resolve-time check applies to
   the first request as well as to every hop, because an entry is a url a
   curator typed and a name in it resolves like any other.
5. **What the watch reads does not change.** The 46 sources read as they do
   today: same headers (`permit-rulebook-watch/0.1` and the contact header —
   the name that got `inclusion.gob.es` to answer), same manual redirects
   judged before they are taken, same hop cap of 5, same 30 s budget shared
   across the hops of one source, same errors and the same failure classes
   (s35). A refusal by the resolve-time check is `refused-by-us`: red on its
   first morning, never retried.
6. **The browser tier keeps its own rule, and says so.** Chrome resolves for
   itself and takes no lookup hook, so this check is the fetch tier's. The
   browser reader keeps what it has — an off-origin navigation refused, the
   contact header on same-origin requests only — and its header says plainly
   that the address behind a browser entry's name is Chrome's to resolve.
   The seven browser entries are fixed pages on public hosts a curator chose.
7. **The boundary, redrawn.** What the floor then reads: every address the
   resolver returns for a name, classified before the socket; the four
   transition and legacy prefixes; everything it read before. What it still
   does not read: an address the *operating system* substitutes below the
   hook (a `hosts` file, a VPN's split DNS, NAT on the path); the browser
   tier; and a source that is genuinely reachable on the open web and merely
   hostile in its content — that is what the readings and the slice markers
   are for. The header says this in one place, as s34's does.
8. **The words.** `CONTEXT.md` gains **Resolved address** (the address the
   watch connected to, as distinct from the name a source spells) and
   rewrites **Address floor** if that term stands; `CONTRIBUTING.md`'s watch
   section says a source is refused by what it resolves to, not only by what
   it is called.

## How it is proved

- **A name that resolves to a refused address is refused, with no
  connection.** A test resolves through an injected resolver (the seam the
  lookup hook already is): `mirror.test` → `10.0.0.5`, `runner.test` →
  `169.254.169.254`, `both.test` → `[93.184.216.34, 10.0.0.5]`. Each is
  refused by name, the error names the kind and not the address, and the
  fixture server that stands at the allowed address records **zero**
  requests — the proof is the absence of the request, not the shape of the
  error.
- **The check is on the connect, not on a pre-flight.** A resolver that
  answers a public address first and a private one after is still refused:
  the test's resolver returns `93.184.216.34` to a first call and
  `10.0.0.5` to the second, and the fetch reaches nothing. (This is the
  case a resolve-then-fetch implementation passes wrongly; it is the reason
  the hook is the mechanism.)
- **The four prefixes, from a public entry:** `[64:ff9b::a9fe:a9fe]`,
  `[2002:a9fe:a9fe::1]`, `[::a9fe:a9fe]`, `[fec0::1]` — each refused end to
  end with zero requests, each named by its kind. Plus the nine shapes s34
  already pins, still refused.
- **A loopback entry still reads its own fixture**: the existing fixture
  server tests (`tests/s34-fetcher.test.ts`) pass unchanged — an entry on
  `127.0.0.1` resolves to loopback and is allowed to be there, which is the
  relative rule.
- `npm run check` green; the runner dispatched once with `commit=false` on
  the branch, reading all 46 (the seven browser entries among them) with the
  new connect path, and the timings in the same range as s35's last read
  (46/46 in 161 s, run 36023789695).
- The docs of point 8, read.

## What this slice is not

- Not a proxy, a DNS-over-HTTPS client, or a pinned resolver: the system
  resolver answers, and this slice only decides whether to connect to what
  it answered.
- Not a change to the browser tier (point 6), and not the id grammar (the
  `later` candidate **An id is a word the watch chose**).
- Not a new dependency: the mechanism is Node's own request hook. If the
  rewrite off global `fetch` turns out to cost more than it closes, that is
  a finding for the review and a fork for the human — not something the
  build decides quietly.
- Not a wider refusal than today's rule: public stays public, and an entry
  on a private or loopback address may still be read where it already is.

**Corrected 2026-09-24, by the build:**

Five claims above were wrong or unprovable. The code follows the corrected
reading; nothing here is a new promise.

- **The second-call proof** ("The check is on the connect"). A resolver that
  answers public first and private after is **not** refused, and cannot be:
  the hook resolves once, judges what came back, and connects to it; proving
  that claim would mean dialling a real public address. The opposite pair
  tells the hook from a pre-flight, and is what is proved: a name whose
  first answer is the fixture's loopback address is read and **the fixture
  records the request** — a pre-flight would connect to the second answer and
  record nothing — and the same name reversed is refused, recording nothing.
- **"the single address it approved"** (point 1). Node asks the hook for *all*
  a name's addresses (`{ hints: 0, all: true }`, measured 2026-09-24 on Node
  v24.20.0) and selects among them. The fetcher hands back the list, every
  address judged: nothing unjudged is connected to.
- **"same headers"** (point 5). `fetch` sent four of its own beside the
  watch's two: `accept: */*`, `accept-language: *`, `sec-fetch-mode: cors`,
  `accept-encoding: gzip, deflate` (measured 2026-09-24, Node v24.20.0). All
  six travel; the body is decompressed here, under a measured bound, inside
  the budget. On the wire only the order changed: `Host` now follows the
  watch's own headers.
- **"from a public entry"** (the four prefixes). Proved from the loopback
  fixture entry: a stub resolver cannot stand a public-named entry in front of
  one, the relative rule refusing that pair. The outcome is the same —
  link-local refused under any entry, site-local under either.
- **"an entry on a private or loopback address may still be read where it
  already is"** (what this slice is not). True of an entry that IS such an
  address, which the loopback fixture keeps green; false of one NAMED in a way
  that resolves to one. Point 2's relative rule governs, not point 1:
  `allowedAddress` judges what came back against `addressKind(entryHost)`,
  public for a name.
