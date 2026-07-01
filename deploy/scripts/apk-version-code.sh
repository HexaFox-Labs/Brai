#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${BRAI_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
NODE_BIN="${NODE_BIN:-/srv/opt/node-v22.16.0/bin/node}"
ENVS_ROOT="${BRAI_ENVS_ROOT:-/srv/projects/brai-envs}"
LOCK="${BRAI_APK_VERSION_CODE_LOCK:-$ENVS_ROOT/apk-version-code.lock}"

mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK"
flock 9

BRAI_ROOT="$ROOT" "$NODE_BIN" "$SCRIPT_DIR/apk-version-code.mjs" "$@"
