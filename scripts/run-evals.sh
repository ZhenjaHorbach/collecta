#!/usr/bin/env bash
# Run Claude Vision eval suite against test fixtures.
#
# Usage:
#   scripts/run-evals.sh [--suite <name>] [--out <path>]
#
# Used by both:
#   - .github/workflows/evals.yml (manual workflow_dispatch)
#   - local invocations via `npm run evals` (which delegates here)
#
# Required env:
#   ANTHROPIC_API_KEY            — Claude API key
#   FEW_SHOT_FIXTURES_BASE_URL   — public base URL for src/evals/fixtures/*

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "::error::ANTHROPIC_API_KEY is required" >&2
  exit 1
fi

exec npx tsx src/evals/run.ts "$@"
