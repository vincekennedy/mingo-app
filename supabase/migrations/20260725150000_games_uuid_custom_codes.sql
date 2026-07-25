-- Custom entry codes: games.id UUID PK; code unique only among active games;
-- child tables key off game_id so vanity codes can be reused after end.

-- ---------------------------------------------------------------------------
-- 1. games.id
-- ---------------------------------------------------------------------------
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS id UUID;

-- gen_random_uuid() (pgcrypto) — uuid_generate_v4() may be missing from search_path
UPDATE public.games
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.games
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS games_id_unique ON public.games (id);

-- ---------------------------------------------------------------------------
-- 2. Child game_id columns + backfill
-- ---------------------------------------------------------------------------
ALTER TABLE public.game_participants
  ADD COLUMN IF NOT EXISTS game_id UUID;

ALTER TABLE public.board_states
  ADD COLUMN IF NOT EXISTS game_id UUID;

ALTER TABLE public.win_claims
  ADD COLUMN IF NOT EXISTS game_id UUID;

UPDATE public.game_participants gp
SET game_id = g.id
FROM public.games g
WHERE upper(gp.game_code) = upper(g.code)
  AND gp.game_id IS NULL;

UPDATE public.board_states bs
SET game_id = g.id
FROM public.games g
WHERE upper(bs.game_code) = upper(g.code)
  AND bs.game_id IS NULL;

UPDATE public.win_claims wc
SET game_id = g.id
FROM public.games g
WHERE upper(wc.game_code) = upper(g.code)
  AND wc.game_id IS NULL;

-- Drop orphans whose game_code no longer matches a game (ended/deleted leftovers)
DELETE FROM public.game_participants WHERE game_id IS NULL;
DELETE FROM public.board_states WHERE game_id IS NULL;
DELETE FROM public.win_claims WHERE game_id IS NULL;

ALTER TABLE public.game_participants
  ALTER COLUMN game_id SET NOT NULL;

ALTER TABLE public.board_states
  ALTER COLUMN game_id SET NOT NULL;

ALTER TABLE public.win_claims
  ALTER COLUMN game_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Drop policies / functions that depend on game_code before column drop
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read public, hosted, or participating games" ON public.games;
DROP POLICY IF EXISTS "Hosts can read participants of their games" ON public.game_participants;
DROP POLICY IF EXISTS "Participants can read fellow participants" ON public.game_participants;
DROP POLICY IF EXISTS "Participants can read claims" ON public.win_claims;
DROP POLICY IF EXISTS "Hosts can update claims" ON public.win_claims;

DROP FUNCTION IF EXISTS public.is_participant_of(text);
DROP FUNCTION IF EXISTS public.list_public_games(int);
DROP FUNCTION IF EXISTS public.list_smoke_test_games_for_cleanup(integer);
DROP FUNCTION IF EXISTS public.list_smoke_test_users_for_cleanup(integer);
DROP FUNCTION IF EXISTS public.cleanup_smoke_test_data(integer, boolean);
DROP FUNCTION IF EXISTS public.list_guest_users_for_cleanup(interval, integer);

-- ---------------------------------------------------------------------------
-- 4. Drop old FKs / uniques / indexes on game_code; add game_id constraints
-- ---------------------------------------------------------------------------
ALTER TABLE public.game_participants
  DROP CONSTRAINT IF EXISTS game_participants_game_code_fkey,
  DROP CONSTRAINT IF EXISTS game_participants_game_code_user_id_key;

ALTER TABLE public.board_states
  DROP CONSTRAINT IF EXISTS board_states_game_code_fkey,
  DROP CONSTRAINT IF EXISTS board_states_game_code_user_id_key;

ALTER TABLE public.win_claims
  DROP CONSTRAINT IF EXISTS win_claims_game_code_fkey;

DROP INDEX IF EXISTS idx_participants_game;
DROP INDEX IF EXISTS idx_board_states_game_user;
DROP INDEX IF EXISTS idx_win_claims_game;

-- Swap games PK: code → id
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_pkey;
ALTER TABLE public.games ADD PRIMARY KEY (id);
DROP INDEX IF EXISTS games_id_unique;

-- Widen code for vanity (4–12); keep NOT NULL
ALTER TABLE public.games
  ALTER COLUMN code TYPE TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS games_code_active_unique
  ON public.games (upper(code))
  WHERE status = 'active';

-- Child FKs / uniques on game_id
ALTER TABLE public.game_participants
  ADD CONSTRAINT game_participants_game_id_fkey
    FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE,
  ADD CONSTRAINT game_participants_game_id_user_id_key UNIQUE (game_id, user_id);

ALTER TABLE public.board_states
  ADD CONSTRAINT board_states_game_id_fkey
    FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE,
  ADD CONSTRAINT board_states_game_id_user_id_key UNIQUE (game_id, user_id);

ALTER TABLE public.win_claims
  ADD CONSTRAINT win_claims_game_id_fkey
    FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_participants_game ON public.game_participants(game_id);
CREATE INDEX IF NOT EXISTS idx_board_states_game_user ON public.board_states(game_id, user_id);
CREATE INDEX IF NOT EXISTS idx_win_claims_game ON public.win_claims(game_id);

-- Drop legacy game_code columns
ALTER TABLE public.game_participants DROP COLUMN IF EXISTS game_code;
ALTER TABLE public.board_states DROP COLUMN IF EXISTS game_code;
ALTER TABLE public.win_claims DROP COLUMN IF EXISTS game_code;

-- ---------------------------------------------------------------------------
-- 5. RPCs + RLS (game_id based)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_participant_of(p_game_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_participants
    WHERE game_id = p_game_id
      AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_participant_of(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_participant_of(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_active_game_by_code(p_code text)
RETURNS SETOF public.games
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM public.games
  WHERE upper(code) = upper(trim(p_code))
    AND status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_active_game_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_game_by_code(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_public_games(p_limit int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  code text,
  title text,
  player_count bigint,
  board_size int,
  win_mode text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    g.id,
    g.code,
    NULLIF(trim(g.config->>'title'), '') AS title,
    (
      SELECT count(*)::bigint
      FROM public.game_participants gp
      WHERE gp.game_id = g.id
    ) AS player_count,
    COALESCE((g.config->>'boardSize')::int, 5) AS board_size,
    COALESCE(NULLIF(trim(g.config->>'winMode'), ''), 'standard') AS win_mode,
    g.created_at
  FROM public.games g
  WHERE g.status = 'active'
    AND g.visibility = 'public'
  ORDER BY g.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
$$;

REVOKE ALL ON FUNCTION public.list_public_games(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_games(int) TO anon, authenticated;

CREATE POLICY "Read public, hosted, or participating games" ON public.games
  FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR host_id = auth.uid()
    OR public.is_participant_of(id)
  );

CREATE POLICY "Hosts can read participants of their games" ON public.game_participants
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_participants.game_id
        AND g.host_id = auth.uid()
    )
  );

CREATE POLICY "Participants can read fellow participants"
  ON public.game_participants
  FOR SELECT
  TO authenticated
  USING (public.is_participant_of(game_id));

CREATE POLICY "Participants can read claims" ON public.win_claims
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.game_participants
      WHERE game_id = win_claims.game_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update claims" ON public.win_claims
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE id = win_claims.game_id
        AND host_id = auth.uid()
    )
  );

-- Guest cleanup join on game_id
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
      INNER JOIN public.games g ON g.id = gp.game_id
      WHERE gp.user_id = u.id
        AND g.status = 'active'
    )
  ORDER BY u.created_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
$$;

REVOKE ALL ON FUNCTION public.list_guest_users_for_cleanup(interval, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_guest_users_for_cleanup(interval, integer) TO service_role;

-- Smoke cleanup by game id (codes may repeat across ended games)
CREATE OR REPLACE FUNCTION public.list_smoke_test_games_for_cleanup(p_limit integer DEFAULT 100)
RETURNS TABLE (game_id uuid, game_code text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT g.id, g.code
  FROM public.games g
  WHERE public.is_smoke_test_game_title(g.config->>'title')
  ORDER BY g.created_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
$$;

CREATE OR REPLACE FUNCTION public.list_smoke_test_users_for_cleanup(p_limit integer DEFAULT 100)
RETURNS TABLE (user_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.id
  FROM auth.users u
  INNER JOIN public.users p ON p.id = u.id
  WHERE u.is_anonymous IS TRUE
    AND public.is_smoke_test_guest_name(p.username, p.display_name)
    AND NOT EXISTS (
      SELECT 1
      FROM public.game_participants gp
      INNER JOIN public.games g ON g.id = gp.game_id
      WHERE gp.user_id = u.id
        AND g.status = 'active'
        AND NOT public.is_smoke_test_game_title(g.config->>'title')
    )
  ORDER BY u.created_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
$$;

CREATE OR REPLACE FUNCTION public.cleanup_smoke_test_data(
  p_limit integer DEFAULT 100,
  p_dry_run boolean DEFAULT false
)
RETURNS TABLE (kind text, id text, dry_run boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  game_ids uuid[];
  user_ids uuid[];
  lim integer := GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
BEGIN
  SELECT coalesce(array_agg(l.game_id), ARRAY[]::uuid[])
    INTO game_ids
  FROM public.list_smoke_test_games_for_cleanup(lim) AS l;

  IF p_dry_run THEN
    RETURN QUERY
      SELECT 'game'::text, i::text, true
      FROM unnest(game_ids) AS i;
  ELSIF cardinality(game_ids) > 0 THEN
    DELETE FROM public.games g
    WHERE g.id = ANY (game_ids)
      AND public.is_smoke_test_game_title(g.config->>'title');

    RETURN QUERY
      SELECT 'game'::text, i::text, false
      FROM unnest(game_ids) AS i;
  END IF;

  SELECT coalesce(array_agg(l.user_id), ARRAY[]::uuid[])
    INTO user_ids
  FROM public.list_smoke_test_users_for_cleanup(lim) AS l;

  IF p_dry_run THEN
    RETURN QUERY
      SELECT 'user'::text, i::text, true
      FROM unnest(user_ids) AS i;
    RETURN;
  END IF;

  IF cardinality(user_ids) = 0 THEN
    RETURN;
  END IF;

  DELETE FROM auth.users au
  WHERE au.id = ANY (user_ids)
    AND au.is_anonymous IS TRUE;

  RETURN QUERY
    SELECT 'user'::text, i::text, false
    FROM unnest(user_ids) AS i;
END;
$$;

REVOKE ALL ON FUNCTION public.list_smoke_test_games_for_cleanup(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_smoke_test_users_for_cleanup(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_smoke_test_data(integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_smoke_test_games_for_cleanup(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_smoke_test_users_for_cleanup(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_smoke_test_data(integer, boolean) TO service_role;

-- Widen smoke title matcher for new e2e titles
CREATE OR REPLACE FUNCTION public.is_smoke_test_game_title(p_title text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_title, '') ~* '(smoke test|corners smoke|lobby (private|public) smoke|theme ocean smoke|custom code smoke)';
$$;
