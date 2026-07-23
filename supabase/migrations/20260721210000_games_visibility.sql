-- Public vs private games: visibility column, tightened SELECT RLS,
-- code-based join RPC, and public lobby listing RPC.

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'games_visibility_check'
      AND conrelid = 'public.games'::regclass
  ) THEN
    ALTER TABLE public.games
      ADD CONSTRAINT games_visibility_check
      CHECK (visibility IN ('private', 'public'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_games_public_lobby
  ON public.games (status, visibility, created_at DESC)
  WHERE status = 'active' AND visibility = 'public';

-- Replace broad SELECT: public games are listable; private only for host/participants.
-- Join-by-code for private games uses get_active_game_by_code (SECURITY DEFINER).
DROP POLICY IF EXISTS "Anyone can read games" ON public.games;
DROP POLICY IF EXISTS "Read public, hosted, or participating games" ON public.games;

CREATE POLICY "Read public, hosted, or participating games"
  ON public.games
  FOR SELECT
  TO authenticated
  USING (
    visibility = 'public'
    OR host_id = auth.uid()
    OR public.is_participant_of(code)
  );

-- Load any active game by exact code (private join path before participant row exists).
CREATE OR REPLACE FUNCTION public.get_active_game_by_code(p_code text)
RETURNS SETOF public.games
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM public.games
  WHERE code = upper(trim(p_code))
    AND status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_active_game_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_game_by_code(text) TO anon, authenticated;

-- Lobby: ~10 open public games with participant counts (bypasses private rows).
CREATE OR REPLACE FUNCTION public.list_public_games(p_limit int DEFAULT 10)
RETURNS TABLE (
  code varchar(5),
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
    g.code,
    NULLIF(trim(g.config->>'title'), '') AS title,
    (
      SELECT count(*)::bigint
      FROM public.game_participants gp
      WHERE gp.game_code = g.code
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
