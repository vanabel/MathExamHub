#!/usr/bin/env bash
# Build backend + frontend and (re)start PM2 on NAS. Secrets live in backend/.env only.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck source=deploy/pm2/common.sh
source "$ROOT/deploy/pm2/common.sh"

echo "MathExamHub PM2 deploy (repo: $ROOT)"

ensure_node20
echo "Node: $(node --version)"

if [[ ! -f backend/.env ]]; then
  echo "Missing backend/.env — copy from backend/.env.example and configure." >&2
  exit 1
fi

echo "Installing backend dependencies..."
pkg_install_in_dir "$ROOT/backend"

echo "Building frontend (npm run build)..."
pkg_install_in_dir "$ROOT/frontend"
pkg_run_build "$ROOT/frontend"

mkdir -p logs

echo "Restarting PM2..."
"$ROOT/deploy/pm2/restart-pm2.sh"

echo ""
echo "Smoke checks (adjust host if remote):"
echo "  curl -s http://127.0.0.1:19897/api/health"
echo "  curl -sI http://127.0.0.1:19896/ | head"
echo ""
echo "Production API is exposed via Cloudflare tunnel (/api → backend :19897); no nginx on NAS."
