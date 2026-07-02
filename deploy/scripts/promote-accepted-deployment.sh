#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${BRAI_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
NODE_BIN="${NODE_BIN:-node}"
ENVS_ROOT="${BRAI_ENVS_ROOT:-/srv/projects/brai-envs}"
SOURCE_BRANCH="${BRAI_SOURCE_BRANCH:?BRAI_SOURCE_BRANCH is required}"
TARGET_ENVIRONMENT="${BRAI_TARGET_ENVIRONMENT:?BRAI_TARGET_ENVIRONMENT is required}"
TARGET_BRANCH="${BRAI_TARGET_BRANCH:?BRAI_TARGET_BRANCH is required}"
TARGET_COMMIT="${BRAI_TARGET_COMMIT:?BRAI_TARGET_COMMIT is required}"
SOURCE_SHORT_CHANGES="${BRAI_SOURCE_SHORT_CHANGES:?BRAI_SOURCE_SHORT_CHANGES is required}"
SOURCE_DETAILS="${BRAI_SOURCE_DETAILED_CHANGES:?BRAI_SOURCE_DETAILED_CHANGES is required}"
SOURCE_REASON="${BRAI_SOURCE_REASON:?BRAI_SOURCE_REASON is required}"

if [[ "$TARGET_ENVIRONMENT" == "prod" && "$SOURCE_BRANCH" == codex/* ]]; then
  if ! SLOT="$("$NODE_BIN" -e '
const fs = require("node:fs");
const path = process.env.BRAI_PREVIEW_REGISTRY || `${process.env.BRAI_ENVS_ROOT || "/srv/projects/brai-envs"}/preview-slots.json`;
const branch = process.argv[1];
const registry = JSON.parse(fs.readFileSync(path, "utf8"));
for (const slot of ["A", "B", "C", "D", "E"]) if (registry[slot]?.branch === branch) { console.log(slot); process.exit(0); }
process.exit(1);
' "$SOURCE_BRANCH")"; then
    echo "No preview slot found for accepted production branch $SOURCE_BRANCH." >&2
    exit 1
  fi
  SOURCE_DB="$ENVS_ROOT/preview-${SLOT,,}/data/brai.sqlite"
  TARGET_DB="${BRAI_DB:-$ROOT/data/brai.sqlite}"
  TARGET_DOMAIN="app.brightos.world"
  SOURCE_COMMIT="$("$NODE_BIN" -e '
const fs = require("node:fs");
const path = process.env.BRAI_PREVIEW_REGISTRY || `${process.env.BRAI_ENVS_ROOT || "/srv/projects/brai-envs"}/preview-slots.json`;
const slot = process.argv[1];
const registry = JSON.parse(fs.readFileSync(path, "utf8"));
console.log(registry[slot]?.commit || "");
' "$SLOT")"
else
  echo "Unsupported accepted promotion: $SOURCE_BRANCH -> $TARGET_ENVIRONMENT" >&2
  exit 1
fi

"$NODE_BIN" "$SCRIPT_DIR/promote-deployment.mjs" \
  --source-db "$SOURCE_DB" \
  --target-db "$TARGET_DB" \
  --source-branch "$SOURCE_BRANCH" \
  --target-environment "$TARGET_ENVIRONMENT" \
  --target-branch "$TARGET_BRANCH" \
  --target-commit "$TARGET_COMMIT" \
  --target-domain "$TARGET_DOMAIN" \
  --source-commit "$SOURCE_COMMIT" \
  --source-slot "${SLOT:-}" \
  --source-short-changes "$SOURCE_SHORT_CHANGES" \
  --source-details "$SOURCE_DETAILS" \
  --source-reason "$SOURCE_REASON" \
  --reason "$SOURCE_REASON" \
  --record-production-release "${BRAI_RECORD_PRODUCTION_RELEASE:-false}"
