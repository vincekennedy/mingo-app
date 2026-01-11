# Supabase Setup Guide

This guide walks you through setting up Supabase for the Mingo application.

## Step 1: Create a Supabase Account and Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign in"
3. Sign in with GitHub (recommended) or create an account with email
4. Click "New Project"
5. Fill in the project details:
   - **Name**: `mingo` (or any name you prefer)
   - **Database Password**: Create a strong password (save this somewhere safe!)
   - **Region**: Choose the region closest to you
   - **Pricing Plan**: Free tier is fine for development
6. Click "Create new project"
7. Wait 2-3 minutes for the project to be created

## Step 2: Get Your Project Credentials

1. In your Supabase project dashboard, click on **Settings** (gear icon in the left sidebar)
2. Click on **API** in the Settings menu
3. You'll see:
   - **Project URL** - Copy this (looks like `https://xxxxx.supabase.co`)
   - **anon public key** - Copy this (long string starting with `eyJ...`)

4. Keep these handy - you'll need them in Step 4!

## Step 3: Set Up the Database Schema

1. In your Supabase project dashboard, click on **SQL Editor** in the left sidebar
2. Click **New query**
3. Copy and paste the entire SQL schema below into the editor
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned" - this means it worked!

### SQL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table
CREATE TABLE IF NOT EXISTS public.games (
  code VARCHAR(5) PRIMARY KEY,
  host_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game participants
CREATE TABLE IF NOT EXISTS public.game_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_code VARCHAR(5) REFERENCES public.games(code) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_code, user_id)
);

-- Board states
CREATE TABLE IF NOT EXISTS public.board_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_code VARCHAR(5) REFERENCES public.games(code) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  board JSONB NOT NULL,
  marked_indices INTEGER[] DEFAULT '{}',
  has_won BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_code, user_id)
);

-- Win claims
CREATE TABLE IF NOT EXISTS public.win_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_code VARCHAR(5) REFERENCES public.games(code) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  claim_type VARCHAR(20) NOT NULL,
  claimed_indices INTEGER[] NOT NULL,
  claimed_items TEXT[] NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  incorrect_indices INTEGER[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_host ON public.games(host_id);
CREATE INDEX IF NOT EXISTS idx_participants_game ON public.game_participants(game_code);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.game_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_board_states_game_user ON public.board_states(game_code, user_id);
CREATE INDEX IF NOT EXISTS idx_win_claims_game ON public.win_claims(game_code);
CREATE INDEX IF NOT EXISTS idx_win_claims_status ON public.win_claims(status) WHERE status = 'pending';

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.win_claims ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can read games" ON public.games;
DROP POLICY IF EXISTS "Hosts can create games" ON public.games;
DROP POLICY IF EXISTS "Participants can read their games" ON public.game_participants;
DROP POLICY IF EXISTS "Users can join games" ON public.game_participants;
DROP POLICY IF EXISTS "Users can update own board" ON public.board_states;
DROP POLICY IF EXISTS "Users can insert own board" ON public.board_states;
DROP POLICY IF EXISTS "Participants can read claims" ON public.win_claims;
DROP POLICY IF EXISTS "Players can create claims" ON public.win_claims;
DROP POLICY IF EXISTS "Hosts can update claims" ON public.win_claims;

-- Policies: Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Policies: Games are readable by all authenticated users
CREATE POLICY "Anyone can read games" ON public.games
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Hosts can create games" ON public.games
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

-- Policies: Participants can read their games
CREATE POLICY "Participants can read their games" ON public.game_participants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can join games" ON public.game_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policies: Users can update their own board states
CREATE POLICY "Users can update own board" ON public.board_states
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own board" ON public.board_states
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policies: Win claims readable by game participants
CREATE POLICY "Participants can read claims" ON public.win_claims
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.game_participants
      WHERE game_code = win_claims.game_code
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Players can create claims" ON public.win_claims
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hosts can update claims" ON public.win_claims
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE code = win_claims.game_code
      AND host_id = auth.uid()
    )
  );
```

## Step 4: Set Up Environment Variables

1. In your project root directory, create a file named `.env.local` (if it doesn't exist)
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace:
- `your-project-url-here` with your **Project URL** from Step 2
- `your-anon-key-here` with your **anon public key** from Step 2

Example:
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.abcdefghijklmnopqrstuvwxyz1234567890
```

**Important**: The `.env.local` file is already in `.gitignore`, so your secrets won't be committed to git.

## Step 5: Verify the Setup

1. Make sure your development server is stopped (if running)
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. The app should start without errors
4. Try to register a new user:
   - Go to the app
   - Click "Create Account"
   - Enter a username, email, and password
   - You should be able to register successfully

## Step 6: Verify Database Tables

1. In Supabase dashboard, go to **Table Editor** (left sidebar)
2. You should see these tables:
   - `users`
   - `games`
   - `game_participants`
   - `board_states`
   - `win_claims`

3. Try creating a game in the app, then check the `games` table - you should see a new row!

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure `.env.local` exists in the project root
- Check that variable names are exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Make sure there are no extra spaces or quotes around the values
- Restart your dev server after creating/modifying `.env.local`

### Error: "permission denied for table"
- Make sure you ran the RLS policies SQL
- Check that Row Level Security is enabled on all tables
- Verify you're logged in when testing (authentication required)

### Error: "relation does not exist"
- Make sure you ran the entire SQL schema
- Check that all tables were created (see Step 6)

### Error: "new row violates row-level security policy for table 'users'"
**Solution**: This means the INSERT policy for the `users` table is missing. Run this SQL in Supabase SQL Editor:

```sql
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
```

Or run the complete schema again from Step 3 (it now includes this policy).

### Registration works but login fails
- Check the `users` table in Table Editor
- Make sure the user profile was created (check `public.users` table)
- Try registering again - the profile should be created automatically

### Games not appearing
- Check browser console for errors
- Verify you're logged in
- Check the `game_participants` table in Supabase to see if the game was added

## Next Steps

Once everything is set up:
1. ✅ Test user registration
2. ✅ Test user login
3. ✅ Create a game
4. ✅ Join a game from another browser/device
5. ✅ Test board state persistence
6. ✅ Test win claims flow

## Need Help?

- Check the Supabase documentation: https://supabase.com/docs
- Check the browser console for detailed error messages
- Check Supabase logs: Dashboard → Logs → Postgres Logs
