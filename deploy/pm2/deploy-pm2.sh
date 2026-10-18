#!/usr/bin/env bash
# Build backend + frontend and (re)start PM2 on NAS. Secrets live in backend/.env only.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck source=deploy/pm2/pm2-bin.sh
source "$ROOT/deploy/pm2/pm2-bin.sh"

echo "MathExamHub PM2 deploy (repo: $ROOT)"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required (Node 20 recommended)." >&2
  exit 1
fi
echo "Node: $(node --version)"

if [[ ! -f backend/.env ]]; then
  echo "Missing backend/.env — copy from backend/.env.example and configure." >&2
  exit 1
fi

echo "Installing backend dependencies..."
npm ci --prefix backend

echo "Building frontend..."
npm ci --prefix frontend
npm run build --prefix frontend

mkdir -p logs

echo "Restarting PM2..."
"$ROOT/deploy/pm2/restart-pm2.sh"

echo ""
echo "Smoke checks (adjust host if remote):"
echo "  curl -s http://127.0.0.1:19897/api/health"
echo "  curl -sI http://127.0.0.1:19896/ | head"
echo ""
echo "Production API is exposed via Cloudflare tunnel (/api → backend :19897); no nginx on NAS."
