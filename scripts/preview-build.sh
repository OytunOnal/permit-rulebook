#!/usr/bin/env bash
# The preview build, for a host that clones one repository.
#
# Cloudflare Pages gives a URL per branch, which is what Steward mode needs: the
# live product changes only by a branch a person walked and merged (steward-51).
# But this site is built from two repositories side by side, and a Pages build
# starts with one. So the sibling is fetched here, at the commit `data.lock`
# names — the same commit CI builds against, so a preview and the deploy that
# follows it are the same site, not two guesses.
#
# Cloudflare's build settings hold one line: `bash scripts/preview-build.sh`,
# with SITE_URL set to the preview address (the base path and every absolute URL
# are read off it — astro.config.mjs). Nothing here needs a token: the data
# repository is public.
set -euo pipefail

DATA_DIR="../permit-rulebook-data"
DATA_REPO="https://github.com/OytunOnal/permit-rulebook-data.git"
locked=$(sed -n 's/^sha=//p' data.lock)

if [ -z "$locked" ]; then
  echo "data.lock names no commit — refusing to guess at the dataset." >&2
  exit 1
fi

if [ ! -d "$DATA_DIR/.git" ]; then
  # Full history, not a shallow clone: the checkout below asks for a specific
  # commit, and a depth-1 clone of the default branch does not contain it.
  git clone --quiet "$DATA_REPO" "$DATA_DIR"
fi
git -C "$DATA_DIR" fetch --quiet origin
git -C "$DATA_DIR" checkout --quiet "$locked"
echo "preview: dataset at $locked"

# The dataset package is built and gated exactly as CI builds it: a preview of
# the site over an unchecked dataset would be a preview of something that cannot
# deploy.
(cd "$DATA_DIR" && npm ci --silent && npm run check --silent)

npm ci --silent
npm run build
