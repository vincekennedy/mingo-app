#!/usr/bin/env node
/**
 * Playwright for e2e/*.spec.js that are part of this change.
 *
 * Default (`npm run test:e2e:precommit`): working tree.
 * `--from-commit <git commit …>` (Cursor hook): only specs that commit will include.
 *
 * Loads `.env.local` via playwright.config.js. Do not print secret values.
 */
import { spawnSync } from 'node:child_process'
import {
  E2E_SPEC_PATH,
  listChangedPaths,
  parseFromCommitArgv,
} from './precommit-files.js'

const { fromCommit, commitCmd } = parseFromCommitArgv(process.argv.slice(2))
const specs = listChangedPaths({ fromCommit, commitCmd }).filter((f) =>
  E2E_SPEC_PATH.test(f),
)

if (specs.length === 0) {
  console.log(
    fromCommit
      ? 'e2e-precommit: no e2e/*.spec.js in this commit — skipping Playwright.'
      : 'e2e-precommit: no changed e2e/*.spec.js — skipping Playwright.',
  )
  process.exit(0)
}

console.log(`e2e-precommit: running changed specs: ${specs.join(', ')}`)

const result = spawnSync('npx', ['playwright', 'test', ...specs], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)
