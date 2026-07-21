import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

/** Load `.env.local` into process.env when keys are unset (local Playwright). */
function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

/**
 * Hard-delete a game as the smoke host (cascades participants, boards, claims).
 * No-op when code or host credentials / Supabase env are missing.
 * @param {string | null | undefined} gameCode
 */
export async function deleteSmokeGame(gameCode) {
  if (!gameCode) return

  loadEnvLocal()

  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const email = process.env.SMOKE_HOST_EMAIL
  const password = process.env.SMOKE_HOST_PASSWORD

  if (!url || !anonKey || !email || !password) {
    console.warn(
      '[e2e] skip game cleanup: need VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SMOKE_HOST_EMAIL, SMOKE_HOST_PASSWORD'
    )
    return
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    console.warn('[e2e] game cleanup sign-in failed:', signInError.message)
    return
  }

  try {
    const { error: deleteError } = await supabase.from('games').delete().eq('code', gameCode)
    if (deleteError) {
      console.warn(`[e2e] failed to delete smoke game ${gameCode}:`, deleteError.message)
    }
  } finally {
    await supabase.auth.signOut()
  }
}
