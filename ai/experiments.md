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
| 2026-07 | Thin color token pass (`src/theme.css` + `mingo-*` utilities) | Party defaults via CSS vars + `data-theme` | Yes | Unlocks named presets without freeform theming; components use semantic classes |
| 2026-07 | Named theme presets (Party / Sunset / Ocean / Ink) | Implemented (`theme.js` + CSS blocks + Setup/Home/Dashboard swatches) | Yes | User pref in `localStorage` (`mingo.theme`); per-game `config.theme`; no mid-game retune |
| 2026-07 | AI generation tones + extra instructions | Implemented (Setup select + textarea; server-composed Gemini prompt) | Yes | Tones: family/funny/wholesome/office/adult; max 200-char instructions; no raw system-prompt editing |
| 2026-07 | Custom entry codes (vanity + weekly reuse) | Implemented (`games.id` UUID PK; partial unique active `code`) | Yes | Custom 4–12 A–Z0–9; random stays 5; reuse after end; anyone may reclaim |
| 2026-07 | Split `App.jsx` into domain hooks | Implemented (`useTheme`, `useGameSetup`, `useDashboardGames`, `useJoinFlow`, `useAuth`, `useActiveGame`) | Yes | App is composition root (~590 lines); board+wins kept together in `useActiveGame` |

## How to add an entry

1. One row per meaningful trial (tool, architecture choice, failed fix).
2. Mark **Keep?** clearly so agents don’t re-propose rejected paths.
3. Link PRs or files when useful.

## Ideas backlog (not commitments)

- Sub-split `useActiveGame` into `useBoard` / `useWinClaims` if it grows again
- Stricter TypeScript migration
- OR-combinable custom win patterns (“any of selected”)
- Join approval for games (`join_policy` + pending participant + host accept/reject UI)
- Anti-spam for public lobbies (rate-limit cell toggles / max claims per window; host-only claim confirm already exists)
