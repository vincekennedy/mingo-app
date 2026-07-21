#!/usr/bin/env node
/**
 * Local gate before `git push`: run only *newly added* Playwright specs.
 *
 * PR Smoke Tests on develop cover the smoke suite; this gate exists so new
 * specs are debugged locally before the first push that introduces them.
 *
 * Loads `.env.local` via playwright.config.js.
 */
import { execSync, spawnSync } from 'node:child_process'

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

const upstream = sh('git rev-parse --abbrev-ref --symbolic-full-name @{u}')
// Prefer commits not yet on the tracking branch; otherwise vs develop (first push).
const range = upstream
  ? `${upstream}..HEAD`
  : sh('git rev-parse --verify origin/develop')
    ? 'origin/develop..HEAD'
    : ''

if (!range) {
  console.log('e2e-prepush: no push range to compare — skipping Playwright.')
  process.exit(0)
}

const newSpecs = sh(`git diff --diff-filter=A --name-only ${range}`)
  .split(/\n/)
  .filter((f) => /^e2e\/.+\.spec\.js$/.test(f))

if (newSpecs.length === 0) {
  console.log(
    `e2e-prepush: no new e2e/*.spec.js in ${range} — skipping Playwright.`,
  )
  process.exit(0)
}

console.log(`e2e-prepush: running new specs only: ${newSpecs.join(', ')}`)

const result = spawnSync('npx', ['playwright', 'test', ...newSpecs], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)
