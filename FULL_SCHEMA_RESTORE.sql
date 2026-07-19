-- =============================================================================
-- Mingo: full Supabase schema restore (fresh project)
-- =============================================================================
-- Run this once in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
--
-- After running:
-- 1. Confirm tables in Table Editor: users, games, game_participants,
--    board_states, win_claims
-- 2. Confirm Storage bucket: game-images
-- 3. Auth → URL Configuration: add your Vercel + localhost redirect URLs
-- 4. Point VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY at this project and redeploy
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.games (
  code VARCHAR(5) PRIMARY KEY,
  host_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_code VARCHAR(5) REFERENCES public.games(code) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_code, user_id)
);

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

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_games_host ON public.games(host_id);
CREATE INDEX IF NOT EXISTS idx_participants_game ON public.game_participants(game_code);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.game_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_board_states_game_user ON public.board_states(game_code, user_id);
CREATE INDEX IF NOT EXISTS idx_win_claims_game ON public.win_claims(game_code);
CREATE INDEX IF NOT EXISTS idx_win_claims_status ON public.win_claims(status) WHERE status = 'pending';

-- Feedback / issue reports (unauthenticated submit allowed via RLS INSERT)
CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  details TEXT NOT NULL,
  user_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  screen TEXT NULL,
  app_version TEXT NOT NULL,
  game_code TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT feedback_reports_category_check CHECK (
    category IN ('bug', 'feature', 'enhancement', 'account', 'other')
  ),
  CONSTRAINT feedback_reports_email_check CHECK (char_length(trim(email)) > 0),
  CONSTRAINT feedback_reports_subject_check CHECK (char_length(trim(subject)) > 0),
  CONSTRAINT feedback_reports_details_check CHECK (char_length(trim(details)) > 0),
  CONSTRAINT feedback_reports_app_version_check CHECK (char_length(trim(app_version)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_feedback_reports_created_at
  ON public.feedback_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_reports_category
  ON public.feedback_reports(category);

-- -----------------------------------------------------------------------------
-- Enable RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.win_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Drop policies (idempotent re-run)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Authenticated can read usernames" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

DROP POLICY IF EXISTS "Anyone can read games" ON public.games;
DROP POLICY IF EXISTS "Hosts can create games" ON public.games;
DROP POLICY IF EXISTS "Hosts can update their games" ON public.games;

DROP POLICY IF EXISTS "Participants can read their games" ON public.game_participants;
DROP POLICY IF EXISTS "Hosts can read participants of their games" ON public.game_participants;
DROP POLICY IF EXISTS "Participants can read fellow participants" ON public.game_participants;
DROP POLICY IF EXISTS "Users can join games" ON public.game_participants;

DROP POLICY IF EXISTS "Users can update own board" ON public.board_states;
DROP POLICY IF EXISTS "Users can insert own board" ON public.board_states;

DROP POLICY IF EXISTS "Participants can read claims" ON public.win_claims;
DROP POLICY IF EXISTS "Players can create claims" ON public.win_claims;
DROP POLICY IF EXISTS "Hosts can update claims" ON public.win_claims;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback_reports;

-- -----------------------------------------------------------------------------
-- RLS: users
-- -----------------------------------------------------------------------------
-- Own profile (auth + profile screen)
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Needed so hosts see other players' usernames (player list / win claims)
CREATE POLICY "Authenticated can read usernames" ON public.users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- RLS: games
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can read games" ON public.games
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Hosts can create games" ON public.games
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their games" ON public.games
  FOR UPDATE TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- -----------------------------------------------------------------------------
-- RLS: game_participants
-- -----------------------------------------------------------------------------
CREATE POLICY "Participants can read their games" ON public.game_participants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Host player list (avoids recursive policy on game_participants)
CREATE POLICY "Hosts can read participants of their games" ON public.game_participants
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.code = game_participants.game_code
        AND g.host_id = auth.uid()
    )
  );

-- Fellow participants (SECURITY DEFINER avoids recursive RLS on game_participants)
CREATE OR REPLACE FUNCTION public.is_participant_of(p_game_code text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_participants
    WHERE game_code = p_game_code
      AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_participant_of(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_participant_of(text) TO authenticated;

CREATE POLICY "Participants can read fellow participants"
  ON public.game_participants
  FOR SELECT
  TO authenticated
  USING (public.is_participant_of(game_code));

CREATE POLICY "Users can join games" ON public.game_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- RLS: board_states
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can update own board" ON public.board_states
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own board" ON public.board_states
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- RLS: win_claims
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- RLS: feedback_reports (insert-only for clients)
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can submit feedback" ON public.feedback_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    category IN ('bug', 'feature', 'enhancement', 'account', 'other')
    AND char_length(trim(email)) > 0
    AND char_length(trim(subject)) > 0
    AND char_length(trim(details)) > 0
    AND char_length(trim(app_version)) > 0
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- Auth → public.users profile trigger (signup)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
BEGIN
  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1),
    'user'
  );

  INSERT INTO public.users (id, username, created_at, updated_at)
  VALUES (NEW.id, v_username, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username,
      updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Storage: game images (optional; used when uploading board item images)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-images', 'game-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload game images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view game images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own game images" ON storage.objects;

CREATE POLICY "Users can upload game images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'game-images');

CREATE POLICY "Anyone can view game images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'game-images');

CREATE POLICY "Users can delete own game images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'game-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- Guest cleanup (anonymous users with no active games, age ≥ 24h)
-- Full schedule + grants: see supabase/migrations/20260719120000_guest_user_cleanup.sql
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_guest_users_for_cleanup(
  p_older_than interval DEFAULT interval '24 hours',
  p_limit integer DEFAULT 100
)
RETURNS TABLE (user_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE u.is_anonymous IS TRUE
    AND GREATEST(
      COALESCE(u.last_sign_in_at, u.created_at),
      COALESCE(u.updated_at, u.created_at),
      u.created_at
    ) < (now() - p_older_than)
    AND NOT EXISTS (
      SELECT 1
      FROM public.game_participants gp
      INNER JOIN public.games g ON g.code = gp.game_code
      WHERE gp.user_id = u.id
        AND g.status = 'active'
    )
  ORDER BY u.created_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
$$;

CREATE OR REPLACE FUNCTION public.cleanup_guest_users(
  p_older_than interval DEFAULT interval '24 hours',
  p_limit integer DEFAULT 100,
  p_dry_run boolean DEFAULT false
)
RETURNS TABLE (user_id uuid, dry_run boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ids uuid[];
BEGIN
  SELECT coalesce(array_agg(l.user_id), ARRAY[]::uuid[])
  INTO ids
  FROM public.list_guest_users_for_cleanup(p_older_than, p_limit) AS l;

  IF p_dry_run THEN
    RETURN QUERY SELECT unnest(ids), true;
    RETURN;
  END IF;

  IF cardinality(ids) = 0 THEN
    RETURN;
  END IF;

  DELETE FROM auth.users au
  WHERE au.id = ANY (ids)
    AND au.is_anonymous IS TRUE;

  RETURN QUERY SELECT unnest(ids), false;
END;
$$;

REVOKE ALL ON FUNCTION public.list_guest_users_for_cleanup(interval, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_guest_users(interval, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_guest_users_for_cleanup(interval, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_guest_users(interval, integer, boolean) TO service_role;

-- -----------------------------------------------------------------------------
-- Quick verification
-- -----------------------------------------------------------------------------
SELECT 'tables' AS check_type, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'games', 'game_participants', 'board_states', 'win_claims', 'feedback_reports')
ORDER BY tablename;

SELECT 'trigger' AS check_type, trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

SELECT 'bucket' AS check_type, id, public
FROM storage.buckets
WHERE id = 'game-images';
