#!/usr/bin/env bash
# Resolve PM2 binary: PM2_BIN env, ~/pm2-local install, or PATH.
if [[ -n "${PM2_BIN:-}" && -x "$PM2_BIN" ]]; then
  :
elif [[ -x "${HOME}/pm2-local/node_modules/.bin/pm2" ]]; then
  PM2_BIN="${HOME}/pm2-local/node_modules/.bin/pm2"
elif command -v pm2 >/dev/null 2>&1; then
  PM2_BIN="$(command -v pm2)"
else
  echo "PM2 not found. Install locally: npm install --prefix ~/pm2-local pm2" >&2
  echo "Or set PM2_BIN to your pm2 executable." >&2
  exit 1
fi
export PM2_BIN
