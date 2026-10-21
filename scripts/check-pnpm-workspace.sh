#!/usr/bin/env bash
# Ensure root pnpm-workspace.yaml disables pnpm 11 pre-run auto-install (NAS pnpm run update).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WS="$ROOT/pnpm-workspace.yaml"
if [[ ! -f "$WS" ]]; then
  echo "Missing pnpm-workspace.yaml at repo root" >&2
  exit 1
fi
if ! grep -qE '^verifyDepsBeforeRun:[[:space:]]*false[[:space:]]*$' "$WS"; then
  echo "pnpm-workspace.yaml must set verifyDepsBeforeRun: false" >&2
  cat "$WS" >&2
  exit 1
fi
if ! grep -q 'electron:[[:space:]]*false' "$WS"; then
  echo "pnpm-workspace.yaml should set allowBuilds.electron: false" >&2
  exit 1
fi
echo "OK: pnpm-workspace.yaml verifyDepsBeforeRun=false"
