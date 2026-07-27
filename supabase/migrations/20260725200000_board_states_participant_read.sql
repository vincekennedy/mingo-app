-- Allow fellow participants (and own user) to SELECT board_states for peek/verify.
-- Keep INSERT/UPDATE/DELETE restricted to the board owner.

DROP POLICY IF EXISTS "Users can update own board" ON public.board_states;
DROP POLICY IF EXISTS "Users can insert own board" ON public.board_states;
DROP POLICY IF EXISTS "Participants can read boards" ON public.board_states;
DROP POLICY IF EXISTS "Users can update own board row" ON public.board_states;
DROP POLICY IF EXISTS "Users can delete own board" ON public.board_states;

CREATE POLICY "Participants can read boards" ON public.board_states
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_participant_of(game_id)
  );

CREATE POLICY "Users can insert own board" ON public.board_states
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own board row" ON public.board_states
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own board" ON public.board_states
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
