# Experiments

Log trials, tool evaluations, and discarded approaches so future sessions don’t repeat dead ends.

| Date | Experiment | Result | Keep? | Notes |
|------|------------|--------|-------|-------|
| 2025–2026 | AI-assisted build (Cursor / Claude / Linear / Vercel) | Shipped working bingo + Supabase auth | Yes | Core project intent — see README |
| 2026-07 | Apply Supabase **Next.js** quickstart (`@supabase/ssr`, `NEXT_PUBLIC_*`) | Skipped — app is Vite SPA | No | Would break env and session model |
| 2026-07 | Free Supabase project paused >90 days | Cannot dashboard-restore; recreated project | Ops | Use `FULL_SCHEMA_RESTORE.sql`; redeploy with new keys |
| 2026-07 | Forgot-password via Supabase recovery | Implemented (`PASSWORD_RECOVERY` + reset screen) | Yes | Needs Auth redirect URLs on each environment |
| 2026-07 | Realtime for win claims / roster instead of polling | Implemented (`src/lib/realtime.js` + publication migration) | Yes | Replaces 1–3s HTTP polls on host/play/dashboard |
| 2026-07 | Win modes (N-line, corners, X, blackout) + toast + reuse setup | Implemented (`winDetection.js`, setup/host/play UI) | Yes | One mode per game; OR-combinable patterns deferred; auth screens use `showToast` too |
| 2026-07 | Public vs private games (`visibility` + lobby RPC) | Implemented (migration, setup toggle, home/dashboard lobby) | Yes | Default **private**; lobby via `list_public_games`; private join via `get_active_game_by_code`. **Deferred:** join-approval (`join_policy` + host accept/reject); anti-spam / rate-limit cell toggles (“random box spam”) — needs a dedicated pass |

## How to add an entry

1. One row per meaningful trial (tool, architecture choice, failed fix).
2. Mark **Keep?** clearly so agents don’t re-propose rejected paths.
3. Link PRs or files when useful.

## Ideas backlog (not commitments)

- Further split `App.jsx` handlers into domain hooks (`useAuth`, `useBoard`, `useWinClaims`) — screens/chrome already extracted
- Stricter TypeScript migration
- OR-combinable custom win patterns (“any of selected”)
- Join approval for games (`join_policy` + pending participant + host accept/reject UI)
- Anti-spam for public lobbies (rate-limit cell toggles / max claims per window; host-only claim confirm already exists)
