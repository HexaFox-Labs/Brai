#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_PREFIX="${BRAI_NODE_PREFIX:-/srv/opt/node-v22.16.0/bin}"

if [[ ! -x "$NODE_PREFIX/node" ]]; then
  echo "Missing Brai Node runtime at $NODE_PREFIX/node" >&2
  exit 1
fi

export PATH="$NODE_PREFIX:$PATH"
"$NODE_PREFIX/node" "$ROOT/scripts/require-node22.mjs"
exec "$@"
