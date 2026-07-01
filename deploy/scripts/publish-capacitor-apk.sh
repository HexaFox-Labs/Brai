#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${BRAI_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
NODE_BIN="${NODE_BIN:-node}"
VERSION="${BRAI_APP_VERSION:-$("$NODE_BIN" -e '
const fs = require("node:fs");
const path = require("node:path");
const root = process.argv[1];
const parsed = JSON.parse(fs.readFileSync(path.join(root, "apps/brai_app/public/version.json"), "utf8"));
const version = String(parsed.version || "");
if (!/^\d+\.\d+\.\d+\.\d+$/.test(version)) throw new Error("Unable to resolve Brai X.Y.Z.S app version");
console.log(version);
' "$ROOT")}"
RELEASE_ENV="${BRAI_RELEASE_ENV:-production}"
TARGET_DIR="${BRAI_RELEASE_TARGET:-$ROOT/deploy/releases}"

if [[ -n "${BRAI_APK_SOURCE:-}" ]]; then
  SOURCE="$BRAI_APK_SOURCE"
elif [[ -f "$ROOT/apps/brai_app/android/app/build/outputs/apk/production/release/app-production-release.apk" ]]; then
  SOURCE="$ROOT/apps/brai_app/android/app/build/outputs/apk/production/release/app-production-release.apk"
else
  SOURCE="$ROOT/apps/brai_app/android/app/build/outputs/apk/release/app-release.apk"
fi

if [[ ! -f "$SOURCE" ]]; then
  echo "Missing Capacitor release APK at $SOURCE" >&2
  exit 1
fi

if [[ "$RELEASE_ENV" == "production" ]]; then
  FILENAME="brai-$VERSION-capacitor.apk"
else
  FILENAME="brai-$RELEASE_ENV-$VERSION-capacitor.apk"
fi

mkdir -p "$TARGET_DIR"
PRIMARY="$TARGET_DIR/$FILENAME"
TMP="$TARGET_DIR/.$FILENAME.$$.tmp"
cleanup() {
  rm -f "$TMP"
}
trap cleanup EXIT
cp "$SOURCE" "$TMP"
chmod u=rw,go=r "$TMP"
mv -f "$TMP" "$PRIMARY"
trap - EXIT

"$NODE_BIN" "$SCRIPT_DIR/update-release-index.mjs" \
  --release "$RELEASE_ENV" \
  --file "$FILENAME" \
  --version "$VERSION" \
  --version-code "${BRAI_ANDROID_VERSION_CODE:-1}" \
  --published-at "${BRAI_PUBLISHED_AT:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"

if [[ "$RELEASE_ENV" =~ ^[a-e]$ && "${BRAI_BRANCH:-}" == codex/* ]]; then
  "$SCRIPT_DIR/preview-slots.sh" apk "$BRAI_BRANCH" "${BRAI_COMMIT:-}" "${BRAI_ANDROID_VERSION_CODE:-1}" "$FILENAME" "$VERSION" >/dev/null
fi

sha256sum "$PRIMARY"
