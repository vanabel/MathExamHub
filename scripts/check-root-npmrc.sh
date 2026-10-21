#!/usr/bin/env bash
# Ensure root .npmrc disables pnpm pre-run auto-install (NAS pnpm run update).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NPMRC="$ROOT/.npmrc"
if [[ ! -f "$NPMRC" ]]; then
  echo "Missing .npmrc at repo root" >&2
  exit 1
fi
if ! grep -qE '^[[:space:]]*verify-deps-before-run=false[[:space:]]*$' "$NPMRC"; then
  echo ".npmrc must contain: verify-deps-before-run=false" >&2
  cat "$NPMRC" >&2
  exit 1
fi
echo "OK: .npmrc verify-deps-before-run=false"
