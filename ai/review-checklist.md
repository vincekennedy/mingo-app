# Review checklist

Use before opening a PR to `develop` or shipping a preview.

## Product / UX

- [ ] Happy path works on the intended screens (login, register, create/join, play, host)
- [ ] Error paths show a clear message; no silent failures
- [ ] Mobile layout still usable for touched screens
- [ ] Auth-only actions still require a session; guest flows still make sense

## Auth / Supabase

- [ ] Env vars use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (correct URL shape, same project)
- [ ] New DB access has matching RLS (and restore SQL updated if schema changed)
- [ ] Signup still creates `public.users` (trigger / policies intact)
- [ ] Password reset / email links: redirect URLs cover Vercel + local if auth email touched
- [ ] No `service_role` or secrets in client bundle

## Code quality

- [ ] Diff limited to the request; no unrelated refactors
- [ ] Matches existing patterns in `App.jsx` / services
- [ ] No leftover debug noise or dead code from the change
- [ ] `npm run build` succeeds for UI/dependency changes

## Git / deploy

- [ ] Branch based on `develop`; PR targets `develop`
- [ ] Commit message explains why
- [ ] If Vercel env changed: redeploy planned/done
- [ ] Preview deployment sanity-checked when the change is auth or env sensitive

## SQL / infra (when relevant)

- [ ] `FULL_SCHEMA_RESTORE.sql` still reflects current required schema
- [ ] Storage policies/buckets updated if uploads changed
