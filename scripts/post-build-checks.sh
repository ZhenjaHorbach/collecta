#!/usr/bin/env bash
# Post-build checks wrapper. Loads .env locally; in CI the workflow sets
# env: directly. Mirrors `scripts/run-evals.sh` / `scripts/sync-design.sh`.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; source .env; set +a
fi

exec npx tsx scripts/post-build-checks.ts "$@"
