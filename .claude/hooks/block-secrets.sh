#!/usr/bin/env bash
# PreToolUse hook (Bash): block shell commands that touch secret files.
# permissions.deny covers the Read/Edit tools; this covers grep/cat/python/etc.
# Matches `.env` / `.env.*` as a path token (not `process.env`) and the Play key.
cmd=$(jq -r '.tool_input.command // empty')
if printf '%s' "$cmd" | grep -qE '(^|[[:space:]/"'\''=<])\.env(\.[A-Za-z0-9_-]+)?([[:space:]"'\''|;&>)]|$)|play-service-account\.json'; then
  echo "Blocked by .claude/hooks/block-secrets.sh: command references a secret file (.env* / play-service-account.json). Ask the user for the specific value instead." >&2
  exit 2
fi
exit 0
