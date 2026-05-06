#!/usr/bin/env bash
# Generate one new starter collection via the multi-agent pipeline and write
# a SQL migration. The migration inserts under the system user
# (00000000-...-0001), so anon-key access is enough to read the existing
# catalog — no service role.
#
# Usage:
#   scripts/generate-collection.sh           # writes supabase/migrations/NNN_collection_<slug>.sql
#   scripts/generate-collection.sh --dry-run # prints SQL to stdout, no file written
#
# Used by both:
#   - .github/workflows/generate-collection.yml (weekly cron + workflow_dispatch)
#   - local invocations (manual smoke + dev runs)
#
# Required env (loaded from .env locally if present):
#   ANTHROPIC_API_KEY   — Claude API key
#   SUPABASE_URL        — for fetching the existing collection catalog
#   SUPABASE_ANON_KEY   — anon read of public.collections

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    *) echo "::error::unknown arg: $arg (use --dry-run or none)" >&2; exit 2 ;;
  esac
done

for v in ANTHROPIC_API_KEY SUPABASE_URL SUPABASE_ANON_KEY; do
  if [[ -z "${!v:-}" ]]; then
    echo "::error::$v is required" >&2
    exit 1
  fi
done

if [[ $DRY_RUN -eq 1 ]]; then
  COLLECTION_DRY_RUN=1 exec npx tsx scripts/generate-collection.ts
fi

exec npx tsx scripts/generate-collection.ts
