# Prompts

Reusable prompts for Cursor / Claude when working on Mingo. Copy, adapt, paste.

Keep prompts short; point at `ai/project-context.md` and `ai/guardrails.md` when starting a large task.

## Start a feature

```text
Read ai/project-context.md and ai/guardrails.md.
Branch from develop (not master).
Implement: <feature>.
Match existing App.jsx screen patterns and src/services/*.
Update FULL_SCHEMA_RESTORE.sql if the schema changes.
Do not commit unless I ask.
```

## Debug Supabase / Vercel auth

```text
Login or signup fails on the Vercel deployment with a network/fetch error.
Check Vite env (VITE_SUPABASE_*), URL shape (no /rest/v1/), same-project anon key,
and that Vercel was redeployed after env changes.
Do not suggest Next.js or @supabase/ssr.
Propose the smallest fix.
```

## Schema restore

```text
Fresh Supabase project; we can discard old data.
Guide me through running FULL_SCHEMA_RESTORE.sql, Auth redirect URLs,
and updating local + Vercel env, then redeploying.
```

## PR hygiene

```text
Summarize my current diff for a PR into develop.
Use ai/review-checklist.md.
Flag RLS, secrets, and env/redeploy risks.
```

## Add more prompts

Drop new `.md` files here per topic (e.g. `prompts/realtime-win-claims.md`) or append sections above.
