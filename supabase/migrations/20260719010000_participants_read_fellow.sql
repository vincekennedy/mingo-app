-- Allow non-host participants to read fellow players in the same game.
-- A naive EXISTS subquery on game_participants would recurse under RLS;
-- SECURITY DEFINER bypasses RLS for the membership check only.

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

DROP POLICY IF EXISTS "Participants can read fellow participants" ON public.game_participants;

CREATE POLICY "Participants can read fellow participants"
  ON public.game_participants
  FOR SELECT
  TO authenticated
  USING (public.is_participant_of(game_code));
