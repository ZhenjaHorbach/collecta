#!/usr/bin/env bash
# Render every PNG icon from assets/images/icon*.svg. Run after editing the
# SVG so iOS / Android / web stay in sync.
#
# Requires `sharp` (devDependency). No env vars to load.
set -euo pipefail

cd "$(dirname "$0")/.."
exec npx tsx scripts/generate-icons.ts "$@"
