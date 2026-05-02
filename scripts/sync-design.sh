#!/usr/bin/env bash
# Sync design mockups from claude.ai/design hand-off URL into .claude/design/.
#
# Usage:
#   scripts/sync-design.sh <hand-off-url>
#
# Used by both:
#   - .github/workflows/sync-design.yml (CI auto-PR)
#   - local invocations (manual review before commit)
#
# Outputs (when --emit-meta is passed) a `design.meta` file with sha256 and
# size — picked up by the workflow to embed in PR body.

set -euo pipefail

URL="${1:-}"
EMIT_META=0
if [[ "${2:-}" == "--emit-meta" ]]; then EMIT_META=1; fi

if [[ -z "$URL" ]]; then
  echo "Usage: $0 <hand-off-url> [--emit-meta]" >&2
  exit 2
fi

if [[ ! "$URL" =~ ^https://api\.anthropic\.com/v1/design/h/[A-Za-z0-9_-]+ ]]; then
  echo "::error::URL must match https://api.anthropic.com/v1/design/h/<hash>" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$REPO_ROOT/.claude/design"
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

echo "==> Downloading bundle..."
http=$(curl -sL --max-time 60 -o "$TMP" -w '%{http_code}' "$URL")
if [[ "$http" != "200" ]]; then
  echo "::error::Download failed: HTTP $http (hand-off URLs expire — generate a fresh one in claude.ai/design)" >&2
  exit 1
fi

bytes=$(wc -c < "$TMP" | tr -d ' ')
sha=$(shasum -a 256 "$TMP" | awk '{print $1}')
echo "    $bytes bytes, sha256=$sha"

# Bundle is a gzipped tar with a top-level "collecta/" tree plus
# duplicate "design"/"design.gz" siblings — keep only collecta/.
# Skip:
#  - collecta/project/uploads — user's source screenshots, not referenced by
#    the mockup HTML/JSX, ~1MB of cyrillic filenames.
#  - collecta/chats — back-and-forth transcripts with the design assistant.
#  - collecta/project/*-print.html — PDF-print near-duplicates.
echo "==> Extracting..."
rm -rf "$DEST"
mkdir -p "$DEST/_extract"
tar -xzf "$TMP" -C "$DEST/_extract" \
  --exclude='collecta/project/uploads' \
  --exclude='collecta/project/uploads/*' \
  --exclude='collecta/chats' \
  --exclude='collecta/chats/*' \
  --exclude='collecta/project/*-print.html'

if [[ ! -d "$DEST/_extract/collecta" ]]; then
  echo "::error::Archive missing expected 'collecta/' top-level dir — bundle format may have changed" >&2
  ls -la "$DEST/_extract" >&2
  exit 1
fi

mv "$DEST/_extract/collecta" "$DEST/collecta"
rm -rf "$DEST/_extract"

count=$(find "$DEST" -type f | wc -l | tr -d ' ')
size=$(du -sh "$DEST" | cut -f1)
echo "==> Synced: $count files, $size"

if [[ "$EMIT_META" == "1" ]]; then
  cat > "$DEST/../design.meta" <<META
sha256: $sha
bytes: $bytes
files: $count
META
fi
