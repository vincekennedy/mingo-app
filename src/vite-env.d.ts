/// <reference types="vite/client" />

declare const __VERCEL_ENV__: string
declare const __COMMIT_HASH__: string
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_SITE_URL?: string
}
