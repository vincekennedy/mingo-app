# Shared by pre-commit-tests.sh and pre-push-e2e.sh. Source this file; do not exec it.
_CURSOR_HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

hook_read_command() {
  HOOK_COMMAND=$(printf '%s' "$1" | node "$_CURSOR_HOOKS_DIR/parse-command.js")
}

hook_allow() {
  echo '{ "permission": "allow" }'
  exit 0
}

hook_deny() {
  node "$_CURSOR_HOOKS_DIR/deny.js" "$1" "$2"
  exit 0
}

# Allow help / dry-run, or a command that is not `git <verb>`.
hook_skip_unless_git() {
  local verb="$1"
  local cmd="$2"
  if ! printf '%s' "$cmd" | grep -Eq "(^|[[:space:]])git[[:space:]]+${verb}([[:space:]]|$)"; then
    hook_allow
  fi
  if printf '%s' "$cmd" | grep -Eq -- '--help|-h|--dry-run'; then
    hook_allow
  fi
}
