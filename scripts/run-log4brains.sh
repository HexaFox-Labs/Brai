#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TOOL_DIR="$ROOT/tools/log4brains"
BIN="$TOOL_DIR/node_modules/.bin/log4brains"

if [[ ! -x "$BIN" || "$TOOL_DIR/package-lock.json" -nt "$TOOL_DIR/node_modules/.package-lock.json" ]]; then
  "$ROOT/scripts/use-node22.sh" npm --prefix "$TOOL_DIR" ci
fi

exec "$ROOT/scripts/use-node22.sh" npm --prefix "$TOOL_DIR" exec -- log4brains "$@"
