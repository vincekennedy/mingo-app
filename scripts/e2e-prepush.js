#!/usr/bin/env node
/**
 * Local gate before `git push`: run Playwright when the push range
 * touches app / e2e / Playwright config. Loads `.env.local` via playwright.config.
 *
 * - Touches only smoke specs (or shared setup): `test:e2e:smoke`
 * - Touches any other e2e spec (or package scripts): full `test:e2e`
 * - Docs-only / unrelated: skip
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
const range = upstream ? `${upstream}..HEAD` : 'HEAD'
const files = sh(`git diff --name-only ${range}`)
  .split(/\n/)
  .filter(Boolean)

const interesting = files.filter(
  (f) =>
    /^(e2e\/|src\/|api\/|playwright\.config\.|package\.json|package-lock\.json|vite\.config\.|scripts\/e2e-)/.test(
      f,
    ),
)

if (interesting.length === 0) {
  console.log('e2e-prepush: no app/e2e changes in push range — skipping Playwright.')
  process.exit(0)
}

const e2eSpecs = interesting.filter((f) => /^e2e\/.+\.spec\.js$/.test(f))
const smokeSpecs = new Set([
  'e2e/landing.spec.js',
  'e2e/generate-items.spec.js',
  'e2e/lifecycle.spec.js',
])
const onlySmokeOrShared =
  e2eSpecs.length === 0 || e2eSpecs.every((f) => smokeSpecs.has(f))

const script = onlySmokeOrShared ? 'test:e2e:smoke' : 'test:e2e'
console.log(`e2e-prepush: running npm run ${script} (changed: ${interesting.join(', ')})`)

const result = spawnSync('npm', ['run', script], { stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(result.status ?? 1)
