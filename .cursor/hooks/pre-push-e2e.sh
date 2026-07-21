#!/usr/bin/env bash
# Gate agent `git push` on local Playwright when app/e2e changed.
# Reads Cursor hook JSON from stdin; never prints secret values.
set -euo pipefail

input=$(cat)
command=$(printf '%s' "$input" | node -e "
  let s='';
  process.stdin.on('data', d => s += d);
  process.stdin.on('end', () => {
    try {
      const j = JSON.parse(s);
      process.stdout.write(String(j.command || ''));
    } catch {
      process.stdout.write('');
    }
  });
")

# Only gate real pushes (not help / dry-run style)
if ! printf '%s' "$command" | grep -Eq '(^|[[:space:]])git[[:space:]]+push([[:space:]]|$)'; then
  echo '{ "permission": "allow" }'
  exit 0
fi
if printf '%s' "$command" | grep -Eq -- '--help|-h'; then
  echo '{ "permission": "allow" }'
  exit 0
fi

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT"

if ! npm run test:e2e:prepush; then
  node -e 'console.log(JSON.stringify({
    permission: "deny",
    user_message: "Blocked git push: local Playwright prepush failed. Fix tests, then push again.",
    agent_message: "git push denied by pre-push-e2e hook. Run npm run test:e2e:prepush, fix failures, do not push until green. Do not print SMOKE_HOST_* values."
  }))'
  exit 0
fi

echo '{ "permission": "allow" }'
exit 0
