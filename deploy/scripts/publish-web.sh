#!/usr/bin/env bash
set -euo pipefail

ROOT="${BRIGHT_OS_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
SOURCE="$ROOT/apps/bright_os_app/out"
TARGET="${BRIGHT_OS_WEB_TARGET:-$ROOT/deploy/web}"

if [[ ! -d "$SOURCE" ]]; then
  echo "Missing Next.js static export at $SOURCE" >&2
  exit 1
fi

mkdir -p "$TARGET"
find "$TARGET" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -R "$SOURCE"/. "$TARGET"/
if [[ -O "$TARGET" ]]; then
  chmod -R u=rwX,go=rX "$TARGET"
fi
