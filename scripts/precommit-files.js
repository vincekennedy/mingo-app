import { execSync } from 'node:child_process'

export function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

/**
 * Paths this change touches (added/copied/modified/renamed; not deletions).
 *
 * Default: working tree (staged, unstaged tracked, untracked).
 * `fromCommit`: files `git commit` will include (`-a` / `--all` adds unstaged tracked).
 */
export function listChangedPaths({ fromCommit = false, commitCmd = '' } = {}) {
  const includeUnstagedTracked =
    !fromCommit || /(^|\s)(-a|--all)(\s|$)/.test(commitCmd)

  const chunks = [sh('git diff --cached --diff-filter=ACMR --name-only')]
  if (includeUnstagedTracked) {
    chunks.push(sh('git diff --diff-filter=ACMR --name-only'))
  }
  if (!fromCommit) {
    chunks.push(sh('git ls-files --others --exclude-standard'))
  }

  return [
    ...new Set(
      chunks
        .join('\n')
        .split(/\n/)
        .map((f) => f.trim())
        .filter(Boolean),
    ),
  ]
}

export function parseFromCommitArgv(argv) {
  const fromCommitIdx = argv.indexOf('--from-commit')
  if (fromCommitIdx === -1) {
    return { fromCommit: false, commitCmd: '' }
  }
  return {
    fromCommit: true,
    commitCmd: argv.slice(fromCommitIdx + 1).join(' '),
  }
}

/** Extensions this repo's eslint.config.js actually lints. */
export const ESLINT_PATH = /\.(?:[cm]?jsx?)$/

export const E2E_SPEC_PATH = /^e2e\/.+\.spec\.js$/
