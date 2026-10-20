#!/usr/bin/env bash
# Production code update (no DB migrations, does not modify backend/.env).
# Usage: pnpm run update | npm run update
#        ./deploy/pm2/update.sh [--force]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck source=deploy/pm2/common.sh
source "$ROOT/deploy/pm2/common.sh"

FORCE=0
for arg in "$@"; do
  if [[ "$arg" == "--force" ]]; then
    FORCE=1
  elif [[ "$arg" == --* ]]; then
    echo "Unknown option: $arg" >&2
    exit 1
  fi
done

assert_clean_worktree
ensure_node20

OLD_SHA="$(git rev-parse HEAD)"
OLD_SHORT="$(git rev-parse --short HEAD)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
TRACKING="${BRANCH}"
if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  TRACKING="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}')"
fi

git fetch origin "$BRANCH"
REMOTE_SHA="$(git rev-parse "$TRACKING")"

if [[ "$OLD_SHA" == "$REMOTE_SHA" && "$FORCE" -eq 0 ]]; then
  echo "already up to date ($OLD_SHORT)"
  exit 0
fi

if [[ "$OLD_SHA" != "$REMOTE_SHA" ]]; then
  git pull --ff-only origin "$BRANCH"
fi

NEW_SHA="$(git rev-parse HEAD)"
NEW_SHORT="$(git rev-parse --short HEAD)"
echo "Git: ${OLD_SHORT} -> ${NEW_SHORT}"

if tree_changed_between "$OLD_SHA" "$NEW_SHA" \
  backend/package.json backend/package-lock.json backend/pnpm-lock.yaml; then
  echo "Installing backend dependencies (lockfile or package.json changed)..."
  pkg_install_in_dir "$ROOT/backend"
else
  echo "Skipping backend npm/pnpm install (no dependency manifest changes)."
fi

if tree_changed_between "$OLD_SHA" "$NEW_SHA" \
  frontend/package.json frontend/package-lock.json frontend/pnpm-lock.yaml; then
  echo "Installing frontend dependencies (lockfile or package.json changed)..."
  pkg_install_in_dir "$ROOT/frontend"
else
  echo "Skipping frontend npm/pnpm install (no dependency manifest changes)."
fi

echo "Building frontend..."
if [[ -f "$ROOT/frontend/pnpm-lock.yaml" ]] && command -v pnpm >/dev/null 2>&1; then
  (cd "$ROOT/frontend" && pnpm run build)
else
  (cd "$ROOT/frontend" && npm run build)
fi

echo "Restarting PM2 (mathexam-backend, mathexam-frontend)..."
pm2_restart_mathexam "$NEW_SHORT"

echo "Waiting for backend health (commit=$NEW_SHORT)..."
if ! wait_for_health_commit "$NEW_SHORT"; then
  echo "Health check failed: /api/health did not report commit $NEW_SHORT" >&2
  echo "Rollback hint:" >&2
  echo "  cd $ROOT && git reset --hard $OLD_SHA" >&2
  echo "  cd frontend && npm run build && cd .." >&2
  echo "  GIT_COMMIT=$OLD_SHORT $PM2_BIN restart mathexam-backend mathexam-frontend --update-env && $PM2_BIN save" >&2
  exit 1
fi

echo "Update complete: $NEW_SHORT (was $OLD_SHORT)"
