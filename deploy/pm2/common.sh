#!/usr/bin/env bash
# Shared helpers for NAS PM2 deploy/update scripts.

deploy_pm2_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

# shellcheck source=deploy/pm2/pm2-bin.sh
source "$(dirname "${BASH_SOURCE[0]}")/pm2-bin.sh"
# shellcheck source=deploy/pm2/node20.sh
source "$(dirname "${BASH_SOURCE[0]}")/node20.sh"

assert_clean_worktree() {
  if ! git diff-index --quiet HEAD --; then
    echo "Refusing: tracked files have uncommitted changes. Commit or stash first." >&2
    git diff-index --name-only HEAD -- >&2 || true
    return 1
  fi

  local line status path
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    status="${line:0:2}"
    path="${line:3}"
    if [[ "$status" == "??" ]]; then
      case "$path" in
        backend/uploads|backend/uploads/*|logs|logs/*)
          continue
          ;;
        *)
          echo "Refusing: unexpected untracked path: $path" >&2
          return 1
          ;;
      esac
    fi
  done < <(git status --porcelain)
}

# Install dependencies in a package dir using its lockfile (never cross package managers).
pkg_install_in_dir() {
  local dir="$1"
  local prev="$PWD"
  cd "$dir"
  if [[ -f pnpm-lock.yaml ]]; then
    if ! command -v pnpm >/dev/null 2>&1; then
      echo "pnpm-lock.yaml present but pnpm not on PATH ($dir)" >&2
      return 1
    fi
    pnpm install --frozen-lockfile
  elif [[ -f package-lock.json ]]; then
    npm ci
  elif [[ -f yarn.lock ]]; then
    if ! command -v yarn >/dev/null 2>&1; then
      echo "yarn.lock present but yarn not on PATH ($dir)" >&2
      return 1
    fi
    yarn install --immutable
  else
    npm install
  fi
  cd "$prev"
}

# Returns 0 if any of the path globs changed between two commits.
tree_changed_between() {
  local old_sha="$1"
  local new_sha="$2"
  shift 2
  [[ "$#" -gt 0 ]] || return 1
  local changed
  changed="$(git diff --name-only "$old_sha" "$new_sha" -- "$@")"
  [[ -n "$changed" ]]
}

health_backend_commit() {
  local url="${1:-http://127.0.0.1:19897/api/health}"
  curl -sf "$url" | node -pe "try{const j=JSON.parse(require('fs').readFileSync(0,'utf8'));j.commit||''}catch(e){process.exit(1)}"
}

wait_for_health_commit() {
  local expected="$1"
  local url="${2:-http://127.0.0.1:19897/api/health}"
  local i got
  for i in $(seq 1 45); do
    got="$(health_backend_commit "$url" 2>/dev/null || true)"
    if [[ -n "$got" && "$got" == "$expected" ]]; then
      return 0
    fi
    sleep 2
  done
  return 1
}

pm2_restart_mathexam() {
  local git_commit="$1"
  ensure_node20
  GIT_COMMIT="$git_commit" "$PM2_BIN" restart mathexam-backend mathexam-frontend --update-env
  "$PM2_BIN" save
}
