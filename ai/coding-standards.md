# Coding standards

Conventions for Mingo. Prefer matching existing code over introducing new patterns.

## General

- Change only what the task needs; avoid drive-by refactors and unrelated files
- Keep solutions simple; no speculative abstractions
- Match naming, imports, and UI patterns already in `src/App.jsx` and `src/services/`
- Do not commit secrets (`.env.local`, keys, OIDC tokens)
- Do not create markdown docs unless asked (except when the task is to create docs)

## Frontend

- React function components; screen flow via `screen` state in `App.jsx` unless a real router is introduced by request
- Prefer existing Tailwind utility classes and gradient/layout patterns in the app
- New Lucide icons: import from `lucide-react` next to existing imports
- Keep mobile-friendly spacing (`sm:` breakpoints) consistent with neighboring screens
- Alerts (`alert(...)`) are used for form errors today — match that unless replacing with a shared pattern

## Supabase / services

- All data access goes through `src/services/*` and `src/lib/supabase.js`
- Use `VITE_SUPABASE_*` only (never `NEXT_PUBLIC_*`)
- Auth helpers live in `authService`; do not scatter raw `supabase.auth` calls without reason
- Treat RLS as part of the product: new tables/columns need policies in SQL, not only client code
- Schema changes: add a file under `supabase/migrations/`, update `FULL_SCHEMA_RESTORE.sql` for greenfield, then `npm run db:push` (see `supabase/README.md`). Do not paste routine fixes into the SQL Editor.

## Errors

- Map Supabase/network failures to short user-facing messages
- Log details with `console.error` for debugging
- Do not weaken security for convenience (e.g. exposing whether an email exists on password reset)

## Git

- Branch from `develop`; open PRs to `develop`
- Commit only when asked; commit messages focus on **why**
- Never force-push `master` / skip hooks / amend pushed commits unless explicitly requested

## Frontend design (new promotional surfaces only)

If designing landing-style UI from scratch, follow the user rule on branding, hero budget, and avoiding generic AI aesthetic defaults. When extending the existing Mingo purple/pink/orange bingo UI, **preserve** that look rather than redesigning it.
