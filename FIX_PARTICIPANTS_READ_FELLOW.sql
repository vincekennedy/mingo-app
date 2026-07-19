-- Fix: Joiners can see fellow players in the same game
-- Run this in Supabase SQL Editor (mingo-local) if you are not using `npx supabase db push`.

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
