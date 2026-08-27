#!/usr/bin/env bash
# Gate agent `git commit`: eslint, then Playwright for e2e specs in this commit.
# Do not print secret values.
set -euo pipefail
# shellcheck source=lib.sh
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

input=$(cat)
hook_read_command "$input"
hook_skip_unless_git commit "$HOOK_COMMAND"

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT"

if ! node scripts/lint-precommit.js --from-commit "$HOOK_COMMAND"; then
  hook_deny \
    "Blocked git commit: eslint failed on JS/JSX files in this commit. Fix lint, then commit again." \
    "git commit denied by pre-commit-tests hook. Run npm run lint:precommit, fix failures, then commit. Do not print SMOKE_HOST_* values."
fi

if ! node scripts/e2e-precommit.js --from-commit "$HOOK_COMMAND"; then
  hook_deny \
    "Blocked git commit: Playwright failed for e2e specs in this commit. Fix tests, then commit again." \
    "git commit denied by pre-commit-tests hook. Run npm run test:e2e:precommit (or the listed specs), fix failures, then commit. Do not print SMOKE_HOST_* values."
fi

hook_allow
