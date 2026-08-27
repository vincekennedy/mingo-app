#!/usr/bin/env bash
# Gate agent `git push`: run only newly added e2e/*.spec.js (via test:e2e:prepush).
# Smoke suite runs on develop PRs; do not print secret values.
set -euo pipefail
# shellcheck source=lib.sh
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

input=$(cat)
hook_read_command "$input"
hook_skip_unless_git push "$HOOK_COMMAND"

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT"

if ! npm run test:e2e:prepush; then
  hook_deny \
    "Blocked git push: local Playwright prepush failed. Fix tests, then push again." \
    "git push denied by pre-push-e2e hook. Run npm run test:e2e:prepush, fix failures, do not push until green. Do not print SMOKE_HOST_* values."
fi

hook_allow
