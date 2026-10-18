#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=deploy/pm2/pm2-bin.sh
source "$ROOT/deploy/pm2/pm2-bin.sh"

echo "Stopping mathexam PM2 apps..."
"$PM2_BIN" delete mathexam-backend mathexam-frontend 2>/dev/null || true
sleep 2
echo "Starting from deploy/pm2/ecosystem.config.js..."
"$PM2_BIN" start "$ROOT/deploy/pm2/ecosystem.config.js"
"$PM2_BIN" save
"$PM2_BIN" status
