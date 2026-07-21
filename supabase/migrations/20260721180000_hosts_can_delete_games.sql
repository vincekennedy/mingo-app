-- Allow hosts to permanently delete their own games (cascades participants, boards, claims).

DROP POLICY IF EXISTS "Hosts can delete their games" ON public.games;

CREATE POLICY "Hosts can delete their games"
  ON public.games
  FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);
