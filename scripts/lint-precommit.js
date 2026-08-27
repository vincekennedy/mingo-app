#!/usr/bin/env node
/**
 * ESLint only changed JS/JSX files (not `eslint .`).
 *
 * Skips when the change has no matching files (docs, SQL, skills, .ts/.tsx —
 * TypeScript is not in eslint.config.js; use `npm run typecheck` when you want it).
 */
import { spawnSync } from 'node:child_process'
import {
  ESLINT_PATH,
  listChangedPaths,
  parseFromCommitArgv,
} from './precommit-files.js'

const { fromCommit, commitCmd } = parseFromCommitArgv(process.argv.slice(2))
const files = listChangedPaths({ fromCommit, commitCmd }).filter((f) =>
  ESLINT_PATH.test(f),
)

if (files.length === 0) {
  console.log(
    fromCommit
      ? 'lint-precommit: no JS/JSX files in this commit — skipping eslint.'
      : 'lint-precommit: no changed JS/JSX files — skipping eslint.',
  )
  process.exit(0)
}

console.log(`lint-precommit: eslint ${files.join(' ')}`)

const result = spawnSync('npx', ['eslint', ...files], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)
