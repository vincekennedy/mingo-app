import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Load KEY=VALUE pairs from gitignored `.env.local` into `process.env`
 * without overriding vars already set (CI / shell exports win).
 * Never commit `.env.local` — it may contain SMOKE_HOST_* secrets.
 */
export function loadEnvLocal(cwd = process.cwd()) {
  const file = resolve(cwd, '.env.local')
  if (!existsSync(file)) return

  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    if (Object.prototype.hasOwnProperty.call(process.env, key)) continue
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}
