# Archived one-off SQL

Historical `FIX_*` / `DEBUG_*` scripts applied by hand in the SQL Editor before the repo used `supabase/migrations/`.

**Do not re-run these on greenfield projects.** Use:

1. [`FULL_SCHEMA_RESTORE.sql`](../../FULL_SCHEMA_RESTORE.sql) for a new empty Supabase project
2. `npm run db:push` (see [`supabase/README.md`](../../supabase/README.md)) for incremental changes

Kept only for archaeology / comparing old one-offs to current schema.
