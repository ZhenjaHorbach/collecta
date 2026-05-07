#!/usr/bin/env bash
# CI gate for React Compiler coverage.
#
# `react-compiler-healthcheck` always exits 0 (even when components are
# rejected by the compiler) — useless as a CI gate without parsing.
# This wrapper runs the healthcheck, captures the output, and fails the
# build the moment any component stops being optimisable.
#
# Pairs with the static `react-compiler/react-compiler` ESLint rule:
# the lint rule catches Rules-of-React violations the compiler refuses
# to optimise; this script catches anything the compiler rejects for
# other reasons (newer compiler version, transitive import shape, etc.).
#
# Output:
#   ok      → all components compile, exit 0
#   regress → at least one component rejected, prints diff, exit 1

set -euo pipefail

OUTPUT="$(npx --yes react-compiler-healthcheck@1.0.0 2>&1)"
echo "$OUTPUT"

# Match: "Successfully compiled X out of Y components."
LINE="$(echo "$OUTPUT" | grep -E 'Successfully compiled [0-9]+ out of [0-9]+ components' || true)"
if [ -z "$LINE" ]; then
  echo "::error::could not parse react-compiler-healthcheck output"
  exit 1
fi

OK="$(echo "$LINE" | sed -E 's/.*Successfully compiled ([0-9]+) out of [0-9]+.*/\1/')"
TOTAL="$(echo "$LINE" | sed -E 's/.*Successfully compiled [0-9]+ out of ([0-9]+).*/\1/')"

if [ "$OK" != "$TOTAL" ]; then
  REJECTED=$((TOTAL - OK))
  echo "::error::React Compiler rejected $REJECTED component(s) ($OK/$TOTAL compiled). See lines starting with 'Failed to compile' above."
  exit 1
fi

echo "react-compiler healthcheck: $OK/$TOTAL components optimised ✓"
