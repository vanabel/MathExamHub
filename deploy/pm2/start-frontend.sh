#!/usr/bin/env bash
# Serve built Vue app for PM2 (default port 19896). Run from repo after: npm run build --prefix frontend
# Uses serve@14 with frontend/dist/serve.json (Content-Type / Content-Disposition for /downloads/*).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${MATHEXAM_FRONTEND_PORT:-19896}"
cd "$ROOT/frontend"
if [[ ! -d dist ]]; then
  echo "missing frontend/dist — run: npm run build --prefix frontend" >&2
  exit 1
fi
exec npx --yes serve@14 -s dist -l "$PORT"
