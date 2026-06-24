#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${BRIGHT_OS_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
NODE_BIN="${NODE_BIN:-/srv/opt/node-v22.16.0/bin/node}"
ENVS_ROOT="${BRIGHT_OS_ENVS_ROOT:-/srv/projects/bright-os-envs}"
REGISTRY="${BRIGHT_OS_PREVIEW_REGISTRY:-$ENVS_ROOT/preview-slots.json}"
LOCK="${BRIGHT_OS_PREVIEW_LOCK:-$ENVS_ROOT/preview-slots.lock}"

mkdir -p "$(dirname "$REGISTRY")"
exec 9>"$LOCK"
flock 9

BRIGHT_OS_ROOT="$ROOT" "$NODE_BIN" "$SCRIPT_DIR/preview-slots.mjs" "$@"
