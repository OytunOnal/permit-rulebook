# The preview address — one setup, then a URL per branch

Steward mode changes how this product ships (steward-51): from the announcement
on, the live site changes only by a branch a person walked and merged. **Merge
is the deploy, and the deploy is the human's word.** That needs an address where
a branch renders before it lands.

Cloudflare Pages gives one per branch and costs nothing to run. The live site
stays on GitHub Pages; nothing moves.

## What the human does, once

1. **dash.cloudflare.com → Compute (Workers & Pages) → Create → Pages → Connect
   to Git** → authorise GitHub for **`OytunOnal/permit-rulebook`** only.
2. **Project name:** `permit-rulebook`. This decides the address:
   `https://<branch>.permit-rulebook.pages.dev`.
3. **Production branch:** set it to a branch that does not exist —
   `preview-only`. This project must never publish the production site; GitHub
   Pages does that, and two systems publishing one domain is how a rollback
   becomes a race. Every real branch then builds as a *preview*.
4. **Build settings:**
   - Framework preset: **None**
   - Build command: `bash scripts/preview-build.sh`
   - Build output directory: `dist`
   - Root directory: *(leave empty)*
5. **Environment variables** (Preview scope — the "Preview" tab, not
   "Production"):
   - `SITE_URL` = `https://permit-rulebook.pages.dev`
   - `NODE_VERSION` = `22`
6. Save. The first build runs on the branch it was connected with.

**Why `SITE_URL` is the bare project address and not the per-branch one:**
Cloudflare gives each branch its own subdomain, and the build cannot know its
own subdomain before it runs. Every internal link on this site is root-absolute
(`/germany/...`), and a root-absolute link is correct under any host — so a
build made for `permit-rulebook.pages.dev` renders correctly at
`feedback-line.permit-rulebook.pages.dev`. What SITE_URL still fixes is the
canonical URL and the social card, which will name the bare project address on
every preview. That is right: a preview must not claim to be
`permitrulebook.com`, and it must not compete with it in a search index either.

**`robots.txt` on a preview:** `pages.dev` sends `X-Robots-Tag: noindex` on
every response of a preview deployment, so a branch cannot be indexed. Nothing
to configure.

## What the session does, every time

- A change that touches the product goes to a branch, gated the same way master
  is gated (both suites, the build, the name sweep).
- The branch is pushed. Cloudflare builds it; the address is
  `https://<branch>.permit-rulebook.pages.dev`.
- The session hands over the address, what to look at, and what a pass looks
  like — the same shape as any other item in STATUS's *expected from you*.
- The human walks it and says the word. **Then** it merges, and the merge is
  what deploys to `permitrulebook.com`.

## What this does not change

The blocker exception stands: a wrong value on a live page, a confirmed wrong
verdict, or a legal objection is fixed on master directly, because a reader is
being told something untrue while the branch waits. Everything else waits.
