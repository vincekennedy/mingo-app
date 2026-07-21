# AGENTS.md

## Cursor Cloud specific instructions

### What Mingo is (services)

Mingo is a browser-based bingo game. There is effectively one app process plus a backend:

- **Vite dev server** (`npm run dev`, port `5173`): serves the React SPA and also mounts the
  serverless `/api/*` routes as Vite middleware (`/api/health`, `/api/generate-items` — see
  `vite.config.js`). In production these run as Vercel functions in `api/`.
- **Supabase** (Auth + Postgres + Storage): the app's backend. The dev server **throws on boot in
  dev mode** if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing (`src/lib/supabase.js`),
  so a `.env.local` is mandatory before `npm run dev` will render anything.
- Google **Gemini** (optional): only used by `/api/generate-items`. Without `GEMINI_API_KEY` that
  route still returns valid JSON (`{ "error": ... }`), which is what the smoke test asserts.

Standard commands live in `package.json` (`dev`, `lint`, `build`, `test:e2e*`) and `SMOKE.md` /
`supabase/README.md`. Only the non-obvious cloud caveats are documented below.

### Backend: this VM uses a self-contained *local* Supabase (not the hosted project)

The repo's documented workflow points `.env.local` at a shared hosted "Mingo-local" project, which
needs a private anon key. In the cloud VM we instead run a fully local Supabase stack via Docker, so
no external secrets are required. `.env.local` (gitignored) is set to:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local anon key printed by `npx supabase start`>
```

### Starting everything (order matters)

The update script only refreshes code deps. Docker, Supabase, and the dev server are **services** and
must be started manually each session:

1. **Docker daemon** (not auto-started after a snapshot restore). Run in a tmux session:
   `sudo dockerd > /tmp/dockerd.log 2>&1 &` then `sudo chmod 666 /var/run/docker.sock`.
   Docker 29 here is configured for `fuse-overlayfs` with the containerd snapshotter disabled
   (`/etc/docker/daemon.json`) and `iptables-legacy`; the kernel needs these to run containers.
2. **Supabase**: `npx supabase start` (from repo root). Prints the local `API_URL` and `ANON_KEY`.
3. **Dev server**: `npm run dev -- --host 127.0.0.1 --port 5173`.

### Non-obvious gotcha: bootstrapping the local database schema

A brand-new local DB will NOT come up cleanly, because the incremental files in
`supabase/migrations/` assume the base schema already exists (the first one references
`public.users`). `npx supabase start` auto-applies them and aborts with
`relation "public.users" does not exist`.

The greenfield path (mirrors `supabase/README.md`) is: apply the complete `FULL_SCHEMA_RESTORE.sql`
and mark the migrations as already applied so future starts skip them. If you ever need to rebuild the
DB from empty, run (DB container is `supabase_db_<project_ref>`):

```bash
DBC=$(docker ps --format '{{.Names}}' | grep supabase_db)
# 1. Load the full schema (tables, RLS, triggers, storage bucket)
docker exec -i "$DBC" psql -U postgres -d postgres < FULL_SCHEMA_RESTORE.sql
# 2. Grants: FULL_SCHEMA_RESTORE.sql omits table GRANTs (hosted Supabase relies on default
#    privileges). Locally you MUST grant, or the app fails with "permission denied for table users".
docker exec -i "$DBC" psql -U postgres -d postgres <<'SQL'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
SQL
# 3. Mark migrations applied so `supabase start` never re-runs them onto the restored schema
docker exec -i "$DBC" psql -U postgres -d postgres <<'SQL'
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text PRIMARY KEY, statements text[], name text);
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
 ('20260718150000','feedback_reports'),('20260719010000','participants_read_fellow'),
 ('20260719120000','guest_user_cleanup'),('20260719140000','users_display_name'),
 ('20260721150000','realtime_publication') ON CONFLICT (version) DO NOTHING;
SQL
```

Because migrations are marked applied and the DB lives in a Docker volume, a plain
`npx supabase stop` / `npx supabase start` restart preserves the schema and does not re-fail.

Guest join uses Supabase Anonymous auth, which is off by default locally. It is enabled via
`[auth] enable_anonymous_sign_ins = true` in `supabase/config.toml` (applied on `supabase start`).

### Running the tests

- Lint: `npm run lint` (also runs on PRs into `develop` via the PR smoke workflow).
- Playwright smoke: `npx playwright install chromium` once, then `npm run test:e2e:smoke`
  (landing + api — no account needed). The full `npm run test:e2e` (adds the create→join→win
  lifecycle) needs a confirmed host account on the local Supabase and its creds exported:
  ```bash
  # create once (local signup auto-confirms because GOTRUE_MAILER_AUTOCONFIRM=true):
  curl -sS -X POST 'http://127.0.0.1:54321/auth/v1/signup' \
    -H "apikey: <local anon key>" -H 'Content-Type: application/json' \
    -d '{"email":"host@mingo.test","password":"MingoTest123!","data":{"username":"mingohost"}}'
  export SMOKE_HOST_EMAIL='host@mingo.test' SMOKE_HOST_PASSWORD='MingoTest123!'
  npm run test:e2e
  ```
  Playwright reuses an already-running dev server on `:5173`, otherwise it starts its own.
