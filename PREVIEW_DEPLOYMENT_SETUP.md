# Preview Deployment Setup

## Current setup (Supabase free tier — two projects)

Preview shares **Mingo-local** with local Vite. Production stays on **Mingo**.

| Surface | Supabase | Credentials |
|---------|----------|-------------|
| `npm run dev` | Mingo-local | `.env.local` |
| Vercel Preview | Mingo-local | Vercel env → **Preview only** |
| Vercel Production | Mingo | Vercel env → **Production only** |

Same users work locally and on Preview. Schema stays aligned because CI pushes `develop` migrations to Mingo-local.

### Vercel env (Preview → Mingo-local)

1. Vercel → Project → **Settings** → **Environment Variables**
2. Set **separate** values (do not use “all environments” with production credentials):

| Name | Environment | Value |
|------|-------------|--------|
| `VITE_SUPABASE_URL` | **Preview** only | Mingo-local project URL |
| `VITE_SUPABASE_ANON_KEY` | **Preview** only | Mingo-local anon key |
| `VITE_SUPABASE_URL` | **Production** only | Production Mingo URL |
| `VITE_SUPABASE_ANON_KEY` | **Production** only | Production Mingo anon key |
| `GEMINI_API_KEY` | Preview (+ Production if needed) | Server-side; for AI generate-items |

3. **Redeploy** the Preview deployment after changing vars (old builds keep old env).

### Auth redirects (Mingo-local)

Supabase → Authentication → URL Configuration → Redirect URLs, add:

- `http://localhost:5173/**`
- `https://*.vercel.app/**`

### Tradeoffs of sharing Mingo-local

- Preview and local see the same games/users (good for not recreating accounts).
- Preview testing can mutate local data; avoid destructive cleanup on shared accounts.
- Do **not** point Preview at Production.

---

## Optional later: dedicated `mingo-preview` project

If you add a paid Supabase project, create **mingo-preview**, set Vercel Preview `VITE_SUPABASE_*` to that project, push migrations there (extend CI), and keep Mingo-local for laptop-only use. Until then, ignore the rest of this section.

<details>
<summary>Historical steps for a third project (not used on free tier)</summary>

1. Create Supabase project `mingo-preview`
2. Apply migrations (`supabase link` + `db push`, or restore from `FULL_SCHEMA_RESTORE.sql`)
3. Set Vercel Preview-only `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to that project
4. Add Auth redirect URLs for `https://*.vercel.app/**`
5. Redeploy Preview

</details>
