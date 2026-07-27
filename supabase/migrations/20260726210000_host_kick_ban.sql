-- Host can remove (kick) players and optionally ban them from rejoining this game.
-- Especially important for public lobbies (offensive display names, trolls).
-- Use gen_random_uuid() (pgcrypto) so migrations succeed when uuid-ossp is not on search_path

CREATE TABLE IF NOT EXISTS public.game_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (game_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_bans_game ON public.game_bans(game_id);
CREATE INDEX IF NOT EXISTS idx_game_bans_user ON public.game_bans(user_id);

ALTER TABLE public.game_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read bans for their games" ON public.game_bans;
DROP POLICY IF EXISTS "Users can read own bans" ON public.game_bans;
DROP POLICY IF EXISTS "Hosts can insert bans for their games" ON public.game_bans;
DROP POLICY IF EXISTS "Hosts can delete bans for their games" ON public.game_bans;

CREATE POLICY "Hosts can read bans for their games" ON public.game_bans
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_bans.game_id
        AND g.host_id = auth.uid()
    )
  );

CREATE POLICY "Users can read own bans" ON public.game_bans
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Hosts can insert bans for their games" ON public.game_bans
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = banned_by
    AND EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_bans.game_id
        AND g.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can delete bans for their games" ON public.game_bans
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_bans.game_id
        AND g.host_id = auth.uid()
    )
  );

-- Block rejoining a game after a ban (client also checks for a clear error).
DROP POLICY IF EXISTS "Users can join games" ON public.game_participants;
CREATE POLICY "Users can join games" ON public.game_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.game_bans b
      WHERE b.game_id = game_participants.game_id
        AND b.user_id = auth.uid()
    )
  );

-- Atomic host remove: optional ban + drop pending claims, board, participant.
CREATE OR REPLACE FUNCTION public.host_remove_player(
  p_game_id uuid,
  p_user_id uuid,
  p_ban boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = p_game_id AND g.host_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = p_game_id AND g.host_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'cannot remove the host';
  END IF;

  IF p_ban THEN
    INSERT INTO public.game_bans (game_id, user_id, banned_by)
    VALUES (p_game_id, p_user_id, auth.uid())
    ON CONFLICT (game_id, user_id) DO NOTHING;
  END IF;

  DELETE FROM public.win_claims
  WHERE game_id = p_game_id
    AND user_id = p_user_id
    AND status = 'pending';

  DELETE FROM public.board_states
  WHERE game_id = p_game_id
    AND user_id = p_user_id;

  DELETE FROM public.game_participants
  WHERE game_id = p_game_id
    AND user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.host_remove_player(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.host_remove_player(uuid, uuid, boolean) TO authenticated;
