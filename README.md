# Mingo

**Mingo** is a browser-based bingo game creator built for **distributed play**. A host builds a game from a custom item list, shares a short join code, and each player gets a unique randomized board—no app install required.

Hosts sign in to create and manage games. Players can join with a code as a **guest** (display name only) or while logged in.

This project was intentionally built as a **hands-on experiment in modern, AI-assisted web development**, leveraging tools like **Claude**, **Cursor**, **Linear**, and **Vercel** to explore how they can accelerate ideation, execution, and iteration for a simple but complete product.

---

## Project Intent

Mingo was created to:

- Explore **AI-assisted development workflows** (“vibe coding”) end to end
- Practice shipping a **small, well-scoped web product** quickly
- Evaluate how modern tools can reduce friction across:
  - Product definition
  - Implementation
  - Iteration
  - Deployment

As a full-time mobile engineer with web experience, this project served as a focused way to apply product thinking and modern web tooling outside my primary platform.

---

## Features

- **Custom bingo creation** — Title, board size, optional free space, text items, and optional images
- **Shareable game codes** — Short alphanumeric codes players use to join
- **Host accounts & dashboard** — Create games, reopen active ones, and see pending win claims
- **Guest join** — Join with a display name via Supabase Anonymous auth (no email required)
- **Randomized boards** — Every participant gets a unique board from the same item pool
- **Win claims** — Players claim bingo; hosts confirm or reject
- **Optional AI items** — Generate a bingo list from a game title (Gemini; server-side key)
- **Browser-based & serverless** — App on Vercel; Auth, Postgres, and Storage on Supabase

---

## Tooling & Workflow

This project emphasizes **tool integration and effective usage**, not just the final result.

### AI-Assisted Development

- **Claude** — Feature ideation, product framing, game-flow logic, iterative problem-solving
- **Cursor** — In-editor AI-assisted coding and rapid iteration on UI, state, and edge cases

### Product & Planning

- **Linear** — Lightweight issue tracking and scoped, shippable units of work

### Deployment

- **Vercel** — Production and preview deploys
- **Supabase** — Auth, database, storage, and migrations via CLI (see [`supabase/README.md`](supabase/README.md))

---

## What This Project Demonstrates

- Ability to **scope and ship** a complete product independently
- Practical use of **AI tools as accelerators**, not replacements
- Comfort moving between **product thinking and implementation**
- Clear, maintainable execution of a simple but real-world web app
- Willingness to experiment, evaluate tooling, and iterate quickly

---

## Getting Started

### Prerequisites

- Node.js (current LTS recommended)
- A [Supabase](https://supabase.com) project
- Anonymous sign-ins enabled for guest join: **Authentication → Providers → Anonymous**

### Local development

```bash
git clone https://github.com/vincekennedy/mingo-app.git
cd mingo-app
npm install
```

Create `.env.local` in the repo root:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Optional (AI bingo item generation via the Vite/Vercel `/api/generate-items` route):

```bash
GEMINI_API_KEY=your-google-ai-studio-key
# optional override; default is gemini-flash-latest with fallbacks
# GEMINI_BINGO_MODEL=gemini-3.5-flash
```

On **Vercel**, set `GEMINI_API_KEY` for Production (and Preview if needed), then **redeploy**. This is a server env var (not `VITE_*`). Confirm `/api/health` returns JSON after deploy — see [`SMOKE.md`](SMOKE.md).

Then:

```bash
npm run dev
```

Schema and migrations: see [`supabase/README.md`](supabase/README.md) (`npm run db:link`, `npm run db:push`). Deeper architecture notes for contributors live in [`ai/project-context.md`](ai/project-context.md).

Pre-release smoke checklist (manual + Playwright): [`SMOKE.md`](SMOKE.md).
