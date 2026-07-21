# Smoke tests

Short checks before cutting a **`develop` → `master`** release (and once on production after deploy). Prefer **mingo-local** for pre-release; never point automated smoke at production.

Automated Playwright coverage lives under [`e2e/`](e2e/) — see [Automated smoke](#automated-smoke) below.

---

## Tier 1 — Manual checklist (~10 min)

Run on **mingo-local** (`npm run dev` + `.env.local`).

### 1. Cold load / session

- [ ] While logged in, hard-refresh the app.
- [ ] Expect a brief “Checking your session…” overlay, then the **dashboard with your games**.
- [ ] No flash of the logged-out landing page and no empty “Create Your First Game” CTA while games are loading.

### 2. Host create

- [ ] Log in → dashboard → **Create New Game**.
- [ ] Set a title, pick board size (3×3 is fine), add enough items, **Create Game**.
- [ ] Host screen shows the join code and a player list that includes you.

### 3. Guest join + display name

- [ ] Incognito (or another browser): landing → enter the code → **Join Game**.
- [ ] **Join as guest** modal appears (not a browser `prompt`).
- [ ] Enter a display name (e.g. `SmokeGuest`) → join → play board loads.
- [ ] On the host view, the player list shows **`SmokeGuest`**, not `SmokeGuest-xxxx`.

### 4. Second joiner visibility

- [ ] Join again as a second guest (or logged-in user) with a different name.
- [ ] Both joiners (and the host) see each other in the player list.

### 5. Win claim

- [ ] As a guest/player, mark a full line (row/column/diagonal).
- [ ] Win claim goes pending; host sees it and can **Confirm Win**.
- [ ] Player sees confirmed win; host can **End Game**.

### 6. Landing shape

- [ ] Logged out on home: **Login**, **Create Account**, “or continue as guest”, then join-by-code.
- [ ] No **Create New Game** on the landing page (create stays on the dashboard).

### Optional (lower frequency)

- [ ] Register / login error messages (bad password, etc.).
- [ ] Forgot-password email (check Supabase redirect URLs).
- [ ] Report modal submit.
- [ ] AI generate-items from title (`GEMINI_API_KEY` on **Vercel** for production / `.env.local` for Vite).

### API routing (production)

After each production deploy, confirm serverless `/api` is live (not SPA HTML / HTTP 405):

```bash
curl -sS "$PROD_URL/api/health"
# expect: {"ok":true,"service":"mingo-api"}

curl -sS -X POST "$PROD_URL/api/generate-items" \
  -H "Content-Type: application/json" \
  -d '{"title":"Office bingo","count":8}'
# expect: JSON {"items":[...]} or JSON {"error":"..."} — never HTML or 405
```

Playwright covers this in `e2e/generate-items.spec.js` (`npm run test:e2e:api`, or set `SMOKE_BASE_URL` to prod).

---

## Automated smoke

```bash
# One-time
npx playwright install chromium

# Always-on UI + API checks (no host secrets; Gemini key optional)
npm run test:e2e:smoke
# equivalent: npm run test:e2e:landing && npm run test:e2e:api

# Full create → guest join → claim → end (needs host credentials + mingo-local).
# Deletes the created game afterward (host DELETE RLS + cascade).
export SMOKE_HOST_EMAIL='your-test-host@example.com'
export SMOKE_HOST_PASSWORD='…'
npm run test:e2e
# or lifecycle only: npm run test:e2e:lifecycle
```

| Variable | Required for | Purpose |
|----------|----------------|---------|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Full e2e | Same as local app (mingo-local) |
| `SMOKE_HOST_EMAIL` / `SMOKE_HOST_PASSWORD` | Full e2e | Dedicated **test** host account on mingo-local |
| `GEMINI_API_KEY` | Successful generate-items (else JSON error is OK) | Server-side key for Vite middleware / Vercel |
| `SMOKE_BASE_URL` | Optional | Defaults to `http://127.0.0.1:5173` (Playwright starts Vite); set to production URL to smoke deployed `/api` |

Locally, lifecycle **skips** when host credentials are missing (`npm run test:e2e:smoke` still runs). PR CI **requires** the secrets below and fails if they are unset.

Anonymous auth must be enabled on the Supabase project used for guest join.

## CI (pull requests)

Workflow: [`.github/workflows/pr-smoke.yml`](.github/workflows/pr-smoke.yml) — runs `npm run test:e2e` (landing + api + lifecycle) on every PR into **`develop`**.

Repository secrets (Settings → Secrets and variables → Actions):

| Name | Required | Where | Purpose |
|------|----------|-------|---------|
| `VITE_SUPABASE_ANON_KEY` | Yes | Repository **secret** or **variable** | Mingo-local anon key (public client key; login + guest join) |
| `SMOKE_HOST_EMAIL` | Yes | Repository **secret** | Dedicated **test** host on mingo-local |
| `SMOKE_HOST_PASSWORD` | Yes | Repository **secret** | Password for that host |
| `VITE_SUPABASE_URL` | No | Secret or variable | Defaults to mingo-local project URL if unset |
| `GEMINI_API_KEY` | No | Secret | Without it, generate-items must still return JSON `{ error }` |

Use the **Repository** secrets/variables tabs (not an Environment, unless the workflow job sets `environment:`). Name must match exactly; paste the value only (no `VITE_SUPABASE_ANON_KEY=` prefix).

Anonymous auth must be enabled on mingo-local. Make **Playwright smoke (landing + api + lifecycle)** a required status check on `develop` if you want PRs blocked until green.
