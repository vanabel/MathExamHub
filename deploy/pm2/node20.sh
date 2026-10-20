#!/usr/bin/env bash
# Prefer Node.js 20 on Synology / NAS (may not be first on PATH).

ensure_node20() {
  _use_node_if_v20() {
    local bin="$1"
    if [[ ! -x "$bin" ]]; then
      return 1
    fi
    local major
    major="$("$bin" -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
    if [[ "$major" != "20" ]]; then
      return 1
    fi
    export PATH="$(dirname "$bin"):${PATH}"
    return 0
  }

  if command -v node >/dev/null 2>&1 && _use_node_if_v20 "$(command -v node)"; then
    return 0
  fi

  if [[ -n "${NODE20_BIN:-}" ]] && _use_node_if_v20 "$NODE20_BIN"; then
    return 0
  fi

  local candidate
  for candidate in \
    "${HOME}/.nvm/versions/node/v20."*/bin/node \
    "${HOME}/.local/share/fnm/node-versions/v20."*/installation/bin/node \
    /usr/local/node20/bin/node \
    /opt/bin/node \
    ; do
    # shellcheck disable=SC2086
    for bin in $candidate; do
      if _use_node_if_v20 "$bin"; then
        return 0
      fi
    done
  done

  echo "Node.js 20 is required (found: $(command -v node 2>/dev/null || echo none); $(node --version 2>/dev/null || true))." >&2
  echo "Set NODE20_BIN=/path/to/node20 or put Node 20 first on PATH." >&2
  return 1
}
