# Guardrails

Hard limits for AI-assisted work on this repo.

## Always

- Confirm stack: **Vite + React + Supabase browser client** — not Next.js
- Prefer editing existing screens/services over new frameworks or app shells
- Keep Auth redirect and env guidance accurate for Vite (`VITE_*`, redeploy after Vercel env changes)
- Preserve RLS and signup trigger behavior when touching auth or `public.users`
- Stay on the `develop`-based branching workflow unless the user explicitly asks about `master` releases

## Never

- Install or wire `@supabase/ssr`, Next middleware, or `NEXT_PUBLIC_*` for this app
- Commit `.env.local` or paste live keys into docs/PRs
- Expose secret keys (`service_role`) in client code
- “Fix” production NetworkErrors by only updating local `.env.local` (Vercel build env is required)
- Rewrite the whole app into a new architecture without an explicit request
- Delete or replace SQL restore scripts without ensuring a working replacement

## Auth & privacy

- Password-reset UX must not confirm whether an email is registered
- Recovery sessions must not silently dump users into the dashboard before they set a new password
- Guest / unauthenticated flows should stay intentional; do not force auth for join-only prototypes unless product asks

## Scope control

- One concern per change when possible
- Ask before large migrations (e.g. adding React Router, redesigning the whole UI, switching BaaS)
- If a user paste looks like a different framework’s quickstart, **stop and verify** fit before applying

## Supabase ops

- After project recreate: schema restore + env + redeploy + Auth redirect URLs
- Do not assume paused projects can be unpaused after 90 days
