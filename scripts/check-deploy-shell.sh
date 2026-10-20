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
  # Warnings only (e.g. SC2164); fail CI on real errors.
  shellcheck -S error "${scripts[@]}"
  echo "shellcheck OK (-S error)"
else
  echo "shellcheck not installed; skipped (bash -n passed)"
fi
