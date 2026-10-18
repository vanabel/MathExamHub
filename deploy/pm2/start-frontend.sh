#!/usr/bin/env bash
# Serve built Vue app for PM2 (port 19896). Run from repo after: npm run build --prefix frontend
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/frontend"
if command -v serve >/dev/null 2>&1; then
  exec serve -s dist --listen=19896
fi
exec npx --yes serve@14 -s dist -l 19896
