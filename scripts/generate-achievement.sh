#!/usr/bin/env bash
# Generate one new achievement proposal via Claude and write a SQL migration.
#
# Usage:
#   scripts/generate-achievement.sh           # writes supabase/migrations/NNN_achievement_<code>.sql
#   scripts/generate-achievement.sh --dry-run # prints SQL to stdout, no file written
#
# Used by both:
#   - .github/workflows/generate-achievement.yml (weekly cron + workflow_dispatch)
#   - local invocations (manual smoke + eval feed)
#
# Required env (loaded from .env locally if present):
#   ANTHROPIC_API_KEY   — Claude API key
#   SUPABASE_URL        — for fetching the existing achievement catalog
#   SUPABASE_ANON_KEY   — anon read of public.achievements

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Load .env when running locally so users don't need to set -a / source manually.
# CI passes vars via workflow `env:` — .env is gitignored and won't exist there.
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
  ACHIEVEMENT_DRY_RUN=1 exec npx tsx scripts/generate-achievement.ts
fi

exec npx tsx scripts/generate-achievement.ts
