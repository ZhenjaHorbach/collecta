#!/usr/bin/env bash
# Seed the Maestro test user (idempotent). Run before any authenticated
# E2E flow.
#
# Usage:
#   scripts/maestro-seed.sh
#
# Required env (loaded from .env locally; CI passes via workflow `env:`):
#   SUPABASE_URL                — project URL
#   SUPABASE_SERVICE_ROLE_KEY   — service role key (admin, server-only)
#   EXPO_PUBLIC_TEST_PASSWORD   — password for the seeded test account
#                                 (same var the Welcome dev sign-in
#                                 button reads — single source of truth)
#
# Optional env:
#   EXPO_PUBLIC_TEST_EMAIL      — defaults to test@collecta.app

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
  echo "::error::SUPABASE_SERVICE_ROLE_KEY is required (admin operations)" >&2
  exit 1
fi
if [[ -z "${EXPO_PUBLIC_TEST_PASSWORD:-}" ]]; then
  echo "::error::EXPO_PUBLIC_TEST_PASSWORD is required" >&2
  exit 1
fi

exec npx tsx scripts/maestro-seed.ts "$@"
