#!/usr/bin/env bash
set -euo pipefail

: "${BRIGHT_DEPLOY_HOST:?BRIGHT_DEPLOY_HOST is required}"
: "${BRIGHT_DEPLOY_USER:?BRIGHT_DEPLOY_USER is required}"
: "${BRIGHT_DEPLOY_SSH_KEY:?BRIGHT_DEPLOY_SSH_KEY is required}"
: "${BRIGHT_OS_BRANCH:?BRIGHT_OS_BRANCH is required}"

DEPLOY_REPO="${BRIGHT_DEPLOY_REPO:-/srv/projects/bright-os}"
SSH_PORT="${BRIGHT_DEPLOY_SSH_PORT:-22}"
KEY_FILE="$(mktemp "${TMPDIR:-/tmp}/bright-deploy-key.XXXXXX")"
cleanup() {
  rm -f "$KEY_FILE"
}
trap cleanup EXIT

printf '%s\n' "$BRIGHT_DEPLOY_SSH_KEY" >"$KEY_FILE"
chmod 600 "$KEY_FILE"

ssh -i "$KEY_FILE" -p "$SSH_PORT" -o StrictHostKeyChecking=accept-new "$BRIGHT_DEPLOY_USER@$BRIGHT_DEPLOY_HOST" \
  bash -s -- "$DEPLOY_REPO" "$BRIGHT_OS_BRANCH" <<'REMOTE'
set -euo pipefail
DEPLOY_REPO="$1"
BRIGHT_OS_BRANCH="$2"

cd "$DEPLOY_REPO"
bash deploy/scripts/preview-slots.sh release "$BRIGHT_OS_BRANCH"
REMOTE
