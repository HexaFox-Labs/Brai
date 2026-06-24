#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${BRIGHT_OS_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
NODE_BIN="${NODE_BIN:-node}"
VERSION="${BRIGHT_OS_APP_VERSION:-0.0.1.1}"
RELEASE_ENV="${BRIGHT_OS_RELEASE_ENV:-production}"
TARGET_DIR="$ROOT/deploy/releases"

if [[ -n "${BRIGHT_OS_APK_SOURCE:-}" ]]; then
  SOURCE="$BRIGHT_OS_APK_SOURCE"
elif [[ -f "$ROOT/apps/bright_os_app/android/app/build/outputs/apk/production/release/app-production-release.apk" ]]; then
  SOURCE="$ROOT/apps/bright_os_app/android/app/build/outputs/apk/production/release/app-production-release.apk"
else
  SOURCE="$ROOT/apps/bright_os_app/android/app/build/outputs/apk/release/app-release.apk"
fi

if [[ ! -f "$SOURCE" ]]; then
  echo "Missing Capacitor release APK at $SOURCE" >&2
  exit 1
fi

if [[ "$RELEASE_ENV" == "production" ]]; then
  FILENAME="bright-os-$VERSION-capacitor.apk"
else
  FILENAME="bright-os-$RELEASE_ENV-$VERSION-capacitor.apk"
fi

mkdir -p "$TARGET_DIR"
PRIMARY="$TARGET_DIR/$FILENAME"
cp "$SOURCE" "$PRIMARY"
chmod u=rw,go=r "$PRIMARY"

"$NODE_BIN" "$SCRIPT_DIR/update-release-index.mjs" \
  --release "$RELEASE_ENV" \
  --file "$FILENAME" \
  --version "$VERSION" \
  --version-code "${BRIGHT_OS_ANDROID_VERSION_CODE:-1}" \
  --published-at "${BRIGHT_OS_PUBLISHED_AT:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"

sha256sum "$PRIMARY"
