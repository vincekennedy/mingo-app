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
| 2026-07 | Vercel Web Analytics (`@vercel/analytics/react`) | Implemented (`src/main.tsx`) | Yes | Visitors/pageviews only; enable in Vercel project dashboard; PostHog deferred until traffic justifies product events |
| 2026-07 | Stricter TypeScript (phase 1: `src/lib`) | Implemented — strict `tsc`, `src/lib` → `.ts` | Yes | `allowJs` for gradual migrate; `npm run typecheck` on PR lint |
| 2026-07 | Stricter TypeScript (phase 2: `src/services`) | Implemented — auth/game/board/claims/storage/feedback/generateItems → `.ts` | Yes | Local row types (no generated Supabase schema yet) |
| 2026-07 | Stricter TypeScript (phase 3: `src/hooks`) | Implemented — all domain hooks → `.ts`/`.tsx` + `src/types/app.ts` | Yes | Shared AppUser/Screen/ShowToast |
| 2026-07 | Stricter TypeScript (phase 4: UI + App) | Implemented — screens, components, `App.tsx`, `main.tsx` | Yes | `src/` app code is fully TypeScript; tooling (`api/`, e2e, vite config) still JS |
| 2026-07 | Roster board peek (participant spectator) | Implemented — click roster → read-only peer board | Yes | RLS SELECT for `is_participant_of`; no public `/watch`; self not clickable |

## How to add an entry

1. One row per meaningful trial (tool, architecture choice, failed fix).
2. Mark **Keep?** clearly so agents don’t re-propose rejected paths.
3. Link PRs or files when useful.

## Ideas backlog (not commitments)

### Product

- Roster board peek — **shipped** (any participant clicks roster → read-only board). Public `/watch/:code` / anonymous lobby spectators deferred (low value for party invite games). Optional later: host TV layout, live `board_states` realtime while peek modal is open.
- Called-items rail — host marks items as “called”; all players see a shared called list (classic bingo caller energy; separate from personal cell marks)
- Rematch / next round — same item pack + win mode, reshuffle boards, clear marks/claims without re-setup
- Saved packs / templates — host reuses favorite item lists across games (beyond today’s duplicate-from-past-game)
- Live reactions — lightweight emoji/burst on win confirm or host “cheer” (realtime, ephemeral; no chat spam)
- Prize / stakes line — optional short “playing for …” on host lobby + play header
- Dauber / stamp motion — richer mark animation + optional sound toggle (local preference)
- Multi-board player — optional 2–3 boards per player for bigger rooms / higher chaos
- Team mode — shared marks or shared win across a small team (heavier; park after rematch)

### Engineering / moderation

- Product analytics (PostHog or similar) — sparse events later once traffic justifies it (signup / guest join, game created / started, win confirmed); Vercel Web Analytics covers visitors now; no cell-toggle spam; no UX surface
- Sub-split `useActiveGame` into `useBoard` / `useWinClaims` if it grows again
- Stricter TypeScript follow-ups — optional: generated Supabase `Database` types; migrate `api/` + Vite/Playwright configs; eslint typescript-eslint for `.ts`/`.tsx`; drop `allowJs` once tooling is typed
- OR-combinable custom win patterns (“any of selected”)
- Join approval for games (`join_policy` + pending participant + host accept/reject UI)
- Anti-spam for public lobbies — claim hygiene later (one pending / post-reject cooldown); **host kick/ban per game** covers offensive names / trolls (see `host_remove_player` / `game_bans`)
