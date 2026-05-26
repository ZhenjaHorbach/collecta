#!/usr/bin/env bash
# Render store-listing screenshots from the HTML mockup in .claude/design/collecta.
# Outputs PNGs under ./screenshots/ (gitignored, regenerated each run).
#
# Requires `puppeteer-core` (devDependency) and a local Chrome / Chromium install.
# CHROME_PATH env var overrides auto-detection.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .claude/design/collecta/project/Collecta.html ]]; then
  echo "::error::.claude/design/collecta/project/Collecta.html not found — run npm run design:sync first" >&2
  exit 1
fi

exec npx tsx scripts/generate-screenshots.ts "$@"
