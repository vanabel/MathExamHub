#!/usr/bin/env bash
# Syntax-check deploy shell scripts (optional shellcheck when installed).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
shopt -s nullglob
scripts=(
  "$ROOT"/deploy/pm2/*.sh
)
for f in "${scripts[@]}"; do
  bash -n "$f"
  echo "bash -n OK: ${f#$ROOT/}"
done
if command -v shellcheck >/dev/null 2>&1; then
  shellcheck "${scripts[@]}"
  echo "shellcheck OK"
else
  echo "shellcheck not installed; skipped (bash -n passed)"
fi
