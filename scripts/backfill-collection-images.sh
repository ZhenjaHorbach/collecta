#!/usr/bin/env bash
# Rewrite external Wikipedia / Unsplash image URLs in collection_items
# and collections to point at our Supabase Storage mirror. One-shot, safe
# to re-run (rows already mirrored are skipped).
#
# Usage:
#   scripts/backfill-collection-images.sh        # process all rows
#   scripts/backfill-collection-images.sh --dry  # report only, no writes
#
# Required env:
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${SUPABASE_URL:-}" ]]; then
  echo "::error::SUPABASE_URL is required" >&2
  exit 1
fi
if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "::error::SUPABASE_SERVICE_ROLE_KEY is required" >&2
  exit 1
fi

exec npx tsx scripts/backfill-collection-images.ts "$@"
