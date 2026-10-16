#!/usr/bin/env bash
# Fail if git merge conflict markers are present in tracked text files.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERN='^<<<<<<< |^>>>>>>> |^=======$'
MATCHES="$(rg -n "$PATTERN" \
  --glob '!.git/**' \
  --glob '!**/node_modules/**' \
  --glob '!**/*.png' \
  --glob '!**/*.jpg' \
  --glob '!**/*.jpeg' \
  --glob '!**/*.gif' \
  --glob '!**/*.webp' \
  --glob '!**/*.pdf' \
  --glob '!**/*.zip' \
  --glob '!package-lock.json' \
  . 2>/dev/null || true)"

if [[ -n "$MATCHES" ]]; then
  echo "Merge conflict markers found:"
  echo "$MATCHES"
  exit 1
fi

echo "No merge conflict markers detected."
