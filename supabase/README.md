# Supabase migrations

Schema changes for Mingo live in `supabase/migrations/`. Apply them with the CLI — **do not** paste new SQL into the Dashboard for routine work.

Prefer migrations over one-off root `FIX_*.sql` / `ADD_*.sql` scripts. Keep those root files only as historical one-offs already applied by hand.

## Projects

| Environment | Supabase project | Project ref | App credentials |
|-------------|------------------|-------------|-----------------|
| Local Vite (`npm run dev`) | **Mingo-local** | `lmlzduwtrzzjaggqsulr` | `.env.local` only |
| Production / Vercel | **Mingo** | `sngfoaosgskdmkngjglh` | Vercel `VITE_SUPABASE_*` |

Never mix URL from one project with the anon key from another — that causes `Invalid API key`.

## npm scripts

| Script | Command |
|--------|---------|
| `npm run db:login` | `supabase login` (once per machine) |
| `npm run db:link` | Link this repo to **Mingo-local** |
| `npm run db:list` | Show local vs remote migration status |
| `npm run db:push` | Apply pending migrations to the linked project |
| `npm run db:push:dry` | Dry-run push (no changes) |

Production uses the same `db:push` after re-linking (see below).

## One-time machine setup

```bash
npm install
npm run db:login
npm run db:link          # project-ref lmlzduwtrzzjaggqsulr
npm run db:list          # confirm local and remote match
```

Skip `supabase init` if `supabase/config.toml` already exists. Link metadata under `supabase/.temp/` is gitignored.

If `db:link` prompts for a database password, use **Project Settings → Database** in the Supabase dashboard (or set `SUPABASE_DB_PASSWORD`). With a logged-in CLI, link often works via the Management API without pasting the password.

## Day-to-day workflow (no SQL Editor)

1. Add a new file under `supabase/migrations/` named `YYYYMMDDHHMMSS_description.sql`.
2. Update [`FULL_SCHEMA_RESTORE.sql`](../FULL_SCHEMA_RESTORE.sql) so greenfield restores stay current.
3. Preview: `npm run db:push:dry`
4. Apply to Mingo-local: `npm run db:push`
5. Open a PR; CI pushes to Mingo-local on merge to `develop`, and to production on merge to `master` (once secrets are set).

## Switch between Mingo-local and production

```bash
# Production
npx supabase link --project-ref sngfoaosgskdmkngjglh
npm run db:list
npm run db:push

# Back to local
npm run db:link
```

Or rely on GitHub Actions (recommended) so you do not re-link on your laptop for prod.

## Migration history repair

If you applied SQL by hand (or via `FULL_SCHEMA_RESTORE.sql`) so objects already exist but `npm run db:list` shows a migration as **local only**:

- Prefer an **idempotent** migration (`IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP POLICY IF EXISTS`) and run `npm run db:push`.
- If re-applying would fail, mark it applied without running SQL:

```bash
npx supabase migration repair --status applied 20260719010000
```

If remote lists a migration that was never actually applied:

```bash
npx supabase migration repair --status reverted 20260719010000
npm run db:push
```

## Brand-new empty project (greenfield)

1. Dashboard → SQL Editor → run all of [`FULL_SCHEMA_RESTORE.sql`](../FULL_SCHEMA_RESTORE.sql).
2. Link the new project: `npx supabase link --project-ref <new-ref>`.
3. Mark migrations already covered by the restore as applied (so `db push` does not double-apply), for example:

```bash
npx supabase migration repair --status applied 20260718150000
npx supabase migration repair --status applied 20260719010000
```

4. `npm run db:list` — should show local and remote in sync. Later migrations use `npm run db:push` only.

If objects already exist and a push fails mid-way, use `migration repair` as above, then push again.

## Local app env (Mingo-local)

In `.env.local` (both values from **Mingo-local** → Settings → API):

```env
VITE_SUPABASE_URL=https://lmlzduwtrzzjaggqsulr.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key from that same project>
```

No `/rest/v1/` on the URL. Restart `npm run dev` after changing env.

### Auth redirects (Mingo-local)

Authentication → URL Configuration:

- Site URL: `http://localhost:5173`
- Redirect URLs: `http://localhost:5173/`, `http://localhost:5173/**`

## GitHub Actions (automatic deploy)

Workflow: [`.github/workflows/supabase-db-push.yml`](../.github/workflows/supabase-db-push.yml)

| Branch | Target project |
|--------|----------------|
| `develop` | Mingo-local (`lmlzduwtrzzjaggqsulr`) |
| `master` | Production Mingo (`sngfoaosgskdmkngjglh`) |

### Required repository secrets

Add under GitHub → Settings → Secrets and variables → Actions:

| Secret | Where to get it |
|--------|-----------------|
| `SUPABASE_ACCESS_TOKEN` | [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD_LOCAL` | Mingo-local → Project Settings → Database → Database password |
| `SUPABASE_DB_PASSWORD_PROD` | Production Mingo → Project Settings → Database → Database password |

Project refs are hardcoded in the workflow (not secrets). After secrets exist, merges that add files under `supabase/migrations/` will push automatically; you can also run the workflow manually (`workflow_dispatch`).
