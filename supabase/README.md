# Supabase migrations

Schema changes for Mingo live in `supabase/migrations/`. Prefer these over one-off root `ADD_*.sql` scripts for new work.

## One-time setup

```bash
npm install   # includes supabase CLI as a devDependency
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

Project ref is the subdomain of your Project URL (`https://<ref>.supabase.co`).

## Apply migrations to the linked project

```bash
npx supabase db push
```

Run this for each remote (local/dev and production) after linking the appropriate project.

## Greenfield recreate

If you wipe a project and start over, run [`FULL_SCHEMA_RESTORE.sql`](../FULL_SCHEMA_RESTORE.sql) in the SQL Editor (includes `feedback_reports` and the rest of the app schema). Migrations remain the source of truth for incremental changes.
