# Mingo — project context

Living brief for humans and AI assistants. Update when architecture or product decisions change.

---

## What it is

**Mingo** is a browser-based **custom bingo** app for distributed play. A host builds a game from a custom item list (text and optional images), shares a short join code, and each player gets a unique randomized board.

- **Hosting:** Vercel  
- **Backend:** Supabase (Auth, Postgres, Storage)  
- **Intent:** Hands-on experiment in AI-assisted shipping (Cursor, Claude, Linear, Vercel) — see `README.md`

**Product:** Hosts need an account to **create** games. **Join** supports guests via Supabase Anonymous auth (display-name prompt); enable Anonymous under Authentication → Providers on each project. Guests are ephemeral: after they are in **no active games** and idle **≥ 24 hours**, `cleanup_guest_users` (pg_cron daily + optional Edge Function) deletes the Auth user (cascades profile / game rows). See [`supabase/README.md`](../supabase/README.md#guest-user-retention).

---

## Stack

| Layer | Choice |
|-------|--------|
| App | React 19 + Vite 7 (`type: "module"`) |
| Styling | Tailwind via **CDN** in `index.html` (npm Tailwind 4 is also installed — dual setup) |
| Icons | `lucide-react` |
| Effects | `canvas-confetti` |
| Client SDK | `@supabase/supabase-js` (browser only) |
| Deploy | Vercel |

**Not Next.js.** Do not apply `@supabase/ssr`, middleware cookie sessions, or `NEXT_PUBLIC_*` env vars.

**Scripts:** `npm run dev` · `build` · `lint` · `preview`

**Build injects** (`vite.config.js`): `__COMMIT_HASH__`, `__APP_VERSION__` (from `package.json`), `__VERCEL_ENV__` (from `VERCEL_ENV`). Version chip in `App.jsx` uses these.

---

## Architecture shape

Almost all UI and game logic live in a **single screen state machine**:

- `src/App.jsx` — screens, game/board/claim UI, polling, auth wiring  
- `src/services/*` — Supabase API wrappers  
- `src/lib/supabase.js` — shared client  

There is **no React Router**. Navigation is `setScreen(...)`.

There is **no Supabase Realtime**. Multiplayer freshness is **HTTP polling** (see below).

Legacy `setStorage` / `getStorage` helpers remain in `App.jsx` but are **unused**; persistence is Supabase.

---

## Screens (`screen` state)

| Screen | Role |
|--------|------|
| `home` | Landing: login/register, create game, join by code |
| `login` | Email + password |
| `register` | Username + email + password |
| `forgot-password` | Request reset email |
| `forgot-password-sent` | Neutral “check your email” (does not reveal whether the address exists) |
| `reset-password` | Set new password after recovery link / `PASSWORD_RECOVERY` |
| `email-confirmation` | Signup succeeded but no session (email confirm required in Supabase) |
| `dashboard` | User’s active games, pending-win badges for hosts, logout |
| `setup` | Host builder: title, board size, free space, items (+ images) |
| `host` | Share code, player list, pending claims, start playing / end game |
| `play` | Markable board; win claim / host review; confetti on confirmed win |

---

## Services

| Module | Responsibility |
|--------|----------------|
| `auth.js` | Signup/signin/signout, profile read, password reset/update, auth listener, email redirect URL |
| `game.js` | Create/join/get games, user games list, participants, end / mark ended |
| `board.js` | Save/load `board_states` (board JSON, marked indices, has_won) |
| `winClaims.js` | Submit / list pending / confirm / reject / user claim status / winners / pending map |
| `storage.js` | Upload/delete images in `game-images` bucket (max 5MB, `image/*`) |
| `generateItems.js` | Client call to `/api/generate-items` for AI bingo items from title |
| `feedback.js` | Submit issue/feedback reports to `feedback_reports` (anon + authenticated) |

---

## Data model (Postgres)

Canonical greenfield restore: **`FULL_SCHEMA_RESTORE.sql`** (tables, RLS, signup trigger, storage, feedback).

Incremental schema changes: **`supabase/migrations/`** via Supabase CLI (`npm run db:link` → `npm run db:push`). See [`supabase/README.md`](../supabase/README.md). Do not paste routine schema fixes into the SQL Editor.

| Table | Purpose / key fields |
|-------|----------------------|
| `public.users` | Profile: `id` → `auth.users`, `username` UNIQUE, optional `display_name` (guests: entered name; UI prefers this over unique `username`) |
| `public.games` | `code` (5-char PK), `host_id`, `config` JSONB, `status` `active` \| `ended` |
| `public.game_participants` | `game_code`, `user_id`, `is_host`, UNIQUE(game_code, user_id) |
| `public.board_states` | Per user per game: `board`, `marked_indices`, `has_won` |
| `public.win_claims` | `claim_type`, claimed indices/items, `status` pending/confirmed/rejected, `incorrect_indices` |
| `public.feedback_reports` | In-app reports: `category`, `email`, `subject`, `details`, required `app_version`; optional `user_id`, `screen`, `game_code`, `user_agent`. Client INSERT only (no SELECT). |

**`games.config` shape** (written from setup):

```json
{
  "items": [{ "text": "...", "imageUrl": null }],
  "boardSize": 5,
  "useFreeSpace": true,
  "title": "..."
}
```

**Signup:** trigger `on_auth_user_created` → `handle_new_user()` inserts `public.users` from `raw_user_meta_data.username` (email local-part fallback) and optional `display_name`. Client also retries/fallback-inserts if needed. Guests store unique `username` as `Name-xxxx` and `display_name` as the entered name.

**Storage:** public bucket `game-images`; object path `{userId}/{gameCode}/{filename}` (temp code allowed during setup).

If restoring without the single file, combine historically: `SUPABASE_SETUP.md` schema + `COMPLETE_USER_SETUP.sql` + `SETUP_STORAGE.sql` + `FIX_GAMES_UPDATE_POLICY.sql`. Prefer `FULL_SCHEMA_RESTORE.sql` for greenfield; prefer `supabase db push` for incremental changes.

### In-app reporting

- Floating **Report** button (bottom-right) on every screen opens a modal (does not change `screen`).
- Categories: `bug` \| `feature` \| `enhancement` \| `account` \| `other`.
- Email required (prefilled when signed in); subject + details required; `app_version` always from `getVersion()`.
- No independent anonymous session tracking — only Auth sessions plus auto-captured context at submit time.

---

## Auth flows

1. **Register** — `signUp` with username in metadata → profile trigger → if no session, `email-confirmation`; else `dashboard`.  
2. **Login** — `signInWithPassword` → profile → `dashboard`. Maps invalid credentials / email-not-confirmed.  
3. **Session** — `persistSession` + `autoRefreshToken` + `detectSessionInUrl`. On mount: `getCurrentUser`; listener for `SIGNED_IN` / `TOKEN_REFRESHED` / `SIGNED_OUT` / `PASSWORD_RECOVERY`. Logged-in users on `home` go to `dashboard`.  
4. **Forgot password** — `resetPasswordForEmail` with `redirectTo` from `VITE_SITE_URL` or `origin`.  
5. **Reset password** — hash `type=recovery` and/or `PASSWORD_RECOVERY` → stay on `reset-password` (do not treat as normal login) → `updateUser({ password })` → dashboard. Cancel signs out → login.

Auth email redirect URLs in Supabase must include production Vercel origin and local Vite origin (e.g. `http://localhost:5173/`).

---

## Game lifecycle

1. **Create** (`setup`) — validate enough items for board size → generate 5-char code from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` → `createGame` (game row + host participant) → `host`.  
2. **Join** (`home`) — must be logged in → `joinGame` → load or generate board → `play`.  
3. **Play** — toggle marks; optional free center; debounce save ~500ms; win detection: row / column / diagonal.  
4. **Claim** — non-host bingo auto-submits win claim. **Host self-bingo** auto-confirms locally (no claim row).  
5. **Host review** — confirm claim (optional end-game dialog) or reject with selected incorrect items (player clears those marks).  
6. **End** — host `endGame` or `markGameAsEnded` sets `status: 'ended'`. Dashboard and `getGame` only use **active** games.

---

## Polling (not Realtime)

| Interval | When | What |
|----------|------|------|
| 3s | `play` / `host` | Participants + confirmed winners |
| 3s | `dashboard` | Reload games / pending wins for hosts |
| 2s | Host in-game | Pending win claims |
| 1s | Player with pending claim | Own claim status |
| ~500ms debounce | Board edits | Persist `board_states` |
| confetti burst | Confirmed player win | Visual only |

---

## Environment

Local: `.env.local` (gitignored). Vite only exposes `VITE_*` to the client. Local Vite should use **mingo-local** (`lmlzduwtrzzjaggqsulr`); production uses a separate project on Vercel. See `supabase/README.md`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | `https://<project-ref>.supabase.co` — **no** `/rest/v1/` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Anon JWT from **same** project as URL |
| `VITE_SITE_URL` | No | Override base for auth email redirects |
| `VITE_APP_VERSION` | No | Fallback if build inject missing |

Missing URL/key in **production** builds a dummy client (`placeholder.supabase.co`) → signup/login **NetworkError**. Fix env on Vercel and **redeploy** (values are baked at build time).

Also set the same vars for Preview if preview deploys are used (`PREVIEW_DEPLOYMENT_SETUP.md`).

---

## Git workflow

- Feature work: branch from **`develop`**, PR into **`develop`**.  
- **`master`**: production releases via PR from `develop`. CalVer is stamped on **`develop`** (Action **CalVer release on develop**), then included in the release PR — don’t land day-to-day features on `master` unless asked.  
- Rule file: `.cursor/rules/git-branching.mdc`.

---

## Operational gotchas

- Free Supabase paused **>90 days**: no one-click resume; recreate project → run `FULL_SCHEMA_RESTORE.sql` → new env keys → redeploy + Auth redirect URLs.  
- URL must match anon key project ref (JWT `ref` claim).  
- Ending games needs host **UPDATE** RLS on `games` (included in full restore / `FIX_GAMES_UPDATE_POLICY.sql`).  
- Email confirmation + RLS can delay profile reads right after signup; client already retries.  
- Don’t ship Next.js Supabase quickstarts into this Vite app.

---

## Key docs & SQL (index)

| Path | Use |
|------|-----|
| `FULL_SCHEMA_RESTORE.sql` | Prefer for fresh projects (includes feedback_reports) |
| `supabase/migrations/` | Incremental schema via CLI (`db push`) |
| `supabase/README.md` | Link + push workflow |
| `SUPABASE_SETUP.md` | Original schema + setup walkthrough |
| `COMPLETE_USER_SETUP.sql` | Trigger + users RLS |
| `SETUP_STORAGE.sql` | `game-images` bucket |
| `FIX_GAMES_UPDATE_POLICY.sql` | Host end-game UPDATE |
| `VERCEL_SETUP.md` / `TROUBLESHOOTING.md` | Deploy + NetworkError |
| `GAME_MIGRATION_NOTES.md` | Auth required; polling; no guest |
| `ai/` | This context, standards, guardrails, checklists, experiments, prompts |

Some root `FIX_*` / `DEBUG_*` / `TEST_*` SQL files are historical diagnostics — use full restore for new projects instead of replaying every fix.

---

## How to keep this file honest

When you change screens, services, schema, auth, or deploy assumptions, update the matching section here in the same PR (or immediately after).
