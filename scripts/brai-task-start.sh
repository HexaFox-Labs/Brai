#!/usr/bin/env bash
set -euo pipefail

exec /srv/opt/node-v22.16.0/bin/node /srv/opt/brai-codex-plugins/plugins/brai-guard/hooks/brai-guard.mjs start "$@"
