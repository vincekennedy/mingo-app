# Supabase migrations

Schema changes for Mingo live in `supabase/migrations/`. Prefer these over one-off root `ADD_*.sql` scripts for new work.

## Projects

| Environment | Supabase project | Where credentials live |
|-------------|------------------|------------------------|
| Local Vite (`npm run dev`) | **mingo-local** (`lmlzduwtrzzjaggqsulr`) | `.env.local` only |
| Production / Vercel | Separate prod project | Vercel env vars (`VITE_SUPABASE_*`) |

Never mix URL from one project with the anon key from another — that causes `Invalid API key`.

## One-time setup (mingo-local)

```bash
npm install   # includes supabase CLI as a devDependency
npx supabase login
npx supabase link --project-ref lmlzduwtrzzjaggqsulr
```

Skip `supabase init` if `supabase/config.toml` already exists.

### Brand-new empty project

1. Dashboard → **mingo-local** → SQL Editor → run all of [`FULL_SCHEMA_RESTORE.sql`](../FULL_SCHEMA_RESTORE.sql)
2. Then record/apply the feedback migration:

```bash
npx supabase db push
```

If objects already exist and push fails, mark the migration applied:

```bash
npx supabase migration repair --status applied 20260718150000
```

### Local env

In `.env.local` (both values from **mingo-local** → Settings → API):

```env
VITE_SUPABASE_URL=https://lmlzduwtrzzjaggqsulr.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key from that same project>
```

No `/rest/v1/` on the URL. Restart `npm run dev` after changing env.

### Auth redirects (mingo-local)

Authentication → URL Configuration:

- Site URL: `http://localhost:5173`
- Redirect URLs: `http://localhost:5173/`, `http://localhost:5173/**`

## Apply migrations to a linked project

```bash
npx supabase db push
```

Re-link (`supabase link --project-ref …`) when switching between mingo-local and production.

## Greenfield recreate

If you wipe a project and start over, run [`FULL_SCHEMA_RESTORE.sql`](../FULL_SCHEMA_RESTORE.sql) in the SQL Editor, then `npx supabase db push` / `migration repair` as above.
