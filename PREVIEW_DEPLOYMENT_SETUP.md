# Preview Deployment Setup Guide

This guide walks you through setting up a separate Supabase database for Vercel preview deployments.

## Why a Separate Test Database?

Preview deployments from pull requests should use a separate test database to:
- Avoid affecting production data
- Allow testing without risk
- Keep production data clean

## Step 1: Create a New Supabase Project for Testing

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: `mingo-preview` (or `mingo-test`)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the region closest to you
   - **Pricing Plan**: Free tier is fine for testing
4. Click "Create new project"
5. Wait 2-3 minutes for the project to be created

## Step 2: Get Your Preview Project Credentials

1. In your new Supabase project dashboard, click on **Settings** (gear icon)
2. Click on **API** in the Settings menu
3. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)
4. Save these for Step 4

## Step 3: Set Up the Database Schema

1. In your Supabase project dashboard, click on **SQL Editor** in the left sidebar
2. Click **New query**
3. Copy and paste the entire SQL schema from `IMPLEMENTATION_GUIDE.md` or `SUPABASE_SETUP.md`
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned" - this means it worked!

### Required SQL Scripts to Run (in order):

1. **Main Schema** - Run the SQL from `IMPLEMENTATION_GUIDE.md` or `SUPABASE_SETUP.md`:
   - Creates tables: `users`, `games`, `game_participants`, `board_states`, `win_claims`
   - Sets up indexes and RLS policies

2. **User Setup** - Run `COMPLETE_USER_SETUP.sql`:
   - Sets up the trigger for automatic user profile creation
   - Creates RLS policies for users table

3. **Games Update Policy** - Run `FIX_GAMES_UPDATE_POLICY.sql`:
   - Adds UPDATE policy for games table (allows hosts to end games)

4. **Storage Setup** - Run `SETUP_STORAGE.sql`:
   - Creates storage bucket for game images
   - Sets up storage policies for image uploads

## Step 4: Configure Environment Variables in Vercel

### Option A: Preview-Specific Environment Variables (Recommended)

1. Go to your Vercel dashboard: [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project (mingo)
3. Click on **Settings** in the top navigation
4. Click on **Environment Variables** in the left sidebar

5. Add preview-specific variables:

   **Variable 1 (Preview):**
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** `https://your-preview-project-id.supabase.co` (paste your preview project URL)
   - **Environments:** Select **Preview** only (uncheck Production and Development)

   **Variable 2 (Preview):**
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (paste your preview project anon key)
   - **Environments:** Select **Preview** only (uncheck Production and Development)

6. Click **Save** for each variable

### Option B: Same Database for All Environments

If you prefer to use the same database for all environments:
- Set the environment variables for **Production, Preview, and Development**
- Note: This means preview deployments will use the same database as production

## Step 5: Verify Setup

1. Create a test pull request (or wait for the next one)
2. Vercel will automatically create a preview deployment
3. Visit the preview deployment URL
4. Test the following:
   - Create an account
   - Create a game
   - Upload an image for a board item
   - Join a game
   - Play a game

## Step 6: Optional - Clean Up Old Preview Data

Periodically, you may want to clean up old test data from your preview database:

```sql
-- Clean up old ended games (optional)
DELETE FROM public.games WHERE status = 'ended' AND created_at < NOW() - INTERVAL '30 days';

-- Clean up old board states for ended games (optional)
DELETE FROM public.board_states 
WHERE game_code IN (
  SELECT code FROM public.games WHERE status = 'ended'
);

-- Clean up old win claims for ended games (optional)
DELETE FROM public.win_claims 
WHERE game_code IN (
  SELECT code FROM public.games WHERE status = 'ended'
);
```

## Troubleshooting

### Preview deployment still uses production database

- Check that environment variables are set for **Preview** environment
- Make sure you saved the variables after selecting Preview
- Redeploy the preview deployment to pick up new environment variables

### Images not uploading in preview

- Make sure you ran `SETUP_STORAGE.sql` in the preview Supabase project
- Check that the storage bucket exists: Go to Storage → Buckets in Supabase dashboard
- Verify storage policies are set correctly

### Authentication not working in preview

- Make sure you ran `COMPLETE_USER_SETUP.sql` in the preview Supabase project
- Check that RLS policies are enabled: Run `TEST_TRIGGER_SETUP.sql` to verify

## Summary

After completing these steps:
- ✅ Production deployments use your production Supabase database
- ✅ Preview deployments use your test/preview Supabase database
- ✅ Test data stays separate from production data
- ✅ You can test freely without affecting production
