-- Photo-proof (scavenger) marks: one compressed image per board cell per player.
-- Private bucket cell-proofs; path {game_id}/{user_id}/{cell_index}.jpg

CREATE TABLE IF NOT EXISTS public.board_cell_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cell_index INTEGER NOT NULL CHECK (cell_index >= 0),
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  byte_size INTEGER NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (game_id, user_id, cell_index)
);

CREATE INDEX IF NOT EXISTS idx_board_cell_proofs_game ON public.board_cell_proofs(game_id);
CREATE INDEX IF NOT EXISTS idx_board_cell_proofs_user_game
  ON public.board_cell_proofs(game_id, user_id);

ALTER TABLE public.board_cell_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can read cell proofs" ON public.board_cell_proofs;
DROP POLICY IF EXISTS "Users can insert own cell proofs" ON public.board_cell_proofs;
DROP POLICY IF EXISTS "Users can update own cell proofs" ON public.board_cell_proofs;
DROP POLICY IF EXISTS "Users can delete own cell proofs" ON public.board_cell_proofs;
DROP POLICY IF EXISTS "Hosts can delete game cell proofs" ON public.board_cell_proofs;

CREATE POLICY "Participants can read cell proofs" ON public.board_cell_proofs
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_participant_of(game_id)
    OR EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = board_cell_proofs.game_id
        AND g.host_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own cell proofs" ON public.board_cell_proofs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_participant_of(game_id)
  );

CREATE POLICY "Users can update own cell proofs" ON public.board_cell_proofs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cell proofs" ON public.board_cell_proofs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Hosts can delete game cell proofs" ON public.board_cell_proofs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = board_cell_proofs.game_id
        AND g.host_id = auth.uid()
    )
  );

-- Private proof photos (not public game-images art)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cell-proofs',
  'cell-proofs',
  false,
  1048576,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Participants can read cell proof objects" ON storage.objects;
DROP POLICY IF EXISTS "Players can upload own cell proof objects" ON storage.objects;
DROP POLICY IF EXISTS "Players can update own cell proof objects" ON storage.objects;
DROP POLICY IF EXISTS "Players can delete own cell proof objects" ON storage.objects;
DROP POLICY IF EXISTS "Hosts can delete cell proof objects" ON storage.objects;

-- Path: {game_id}/{user_id}/{cell_index}.jpg
CREATE POLICY "Participants can read cell proof objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cell-proofs'
    AND (
      public.is_participant_of(((storage.foldername(name))[1])::uuid)
      OR EXISTS (
        SELECT 1 FROM public.games g
        WHERE g.id = ((storage.foldername(name))[1])::uuid
          AND g.host_id = auth.uid()
      )
    )
  );

CREATE POLICY "Players can upload own cell proof objects" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cell-proofs'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.is_participant_of(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Players can update own cell proof objects" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cell-proofs'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'cell-proofs'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Players can delete own cell proof objects" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'cell-proofs'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Hosts can delete cell proof objects" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'cell-proofs'
    AND EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = ((storage.foldername(name))[1])::uuid
        AND g.host_id = auth.uid()
    )
  );

-- Drop kick cleanup also removes that player's photo proof rows (paths predictable for later storage purge).
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

  DELETE FROM public.board_cell_proofs
  WHERE game_id = p_game_id
    AND user_id = p_user_id;

  DELETE FROM public.board_states
  WHERE game_id = p_game_id
    AND user_id = p_user_id;

  DELETE FROM public.game_participants
  WHERE game_id = p_game_id
    AND user_id = p_user_id;
END;
$$;

-- Paths for host/end-game purge and scheduled cleanup (service role / host client).
CREATE OR REPLACE FUNCTION public.list_cell_proof_paths_for_game(p_game_id uuid)
RETURNS TABLE (storage_path text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.storage_path
  FROM public.board_cell_proofs p
  WHERE p.game_id = p_game_id
    AND (
      EXISTS (
        SELECT 1 FROM public.games g
        WHERE g.id = p_game_id AND g.host_id = auth.uid()
      )
      OR public.is_participant_of(p_game_id)
    );
$$;

REVOKE ALL ON FUNCTION public.list_cell_proof_paths_for_game(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_cell_proof_paths_for_game(uuid) TO authenticated;

-- Stale photo proofs: ended/inactive games older than p_older_than (default 7 days).
-- Returns paths for the caller (edge function with service role) to delete from storage,
-- then this function can delete rows when p_delete_rows is true.
CREATE OR REPLACE FUNCTION public.cleanup_stale_cell_proofs(
  p_older_than interval DEFAULT interval '7 days',
  p_limit integer DEFAULT 500,
  p_dry_run boolean DEFAULT true,
  p_delete_rows boolean DEFAULT false
)
RETURNS TABLE (storage_path text, game_id uuid, dry_run boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := GREATEST(1, LEAST(COALESCE(p_limit, 500), 2000));
  v_game_ids uuid[];
BEGIN
  SELECT ARRAY(
    SELECT g.id
    FROM public.games g
    WHERE COALESCE(g.updated_at, g.created_at) < NOW() - COALESCE(p_older_than, interval '7 days')
      AND EXISTS (
        SELECT 1 FROM public.board_cell_proofs p WHERE p.game_id = g.id
      )
    ORDER BY COALESCE(g.updated_at, g.created_at) ASC
    LIMIT v_limit
  ) INTO v_game_ids;

  RETURN QUERY
  SELECT p.storage_path, p.game_id, p_dry_run AS dry_run
  FROM public.board_cell_proofs p
  WHERE p.game_id = ANY (v_game_ids);

  IF NOT p_dry_run AND p_delete_rows AND v_game_ids IS NOT NULL THEN
    DELETE FROM public.board_cell_proofs p
    WHERE p.game_id = ANY (v_game_ids);
  END IF;
END;
$$;

COMMENT ON FUNCTION public.cleanup_stale_cell_proofs IS
  'List (and optionally delete rows for) cell proof paths on games idle/ended past p_older_than. Storage blob delete is the edge function / host client.';

REVOKE ALL ON FUNCTION public.cleanup_stale_cell_proofs(interval, integer, boolean, boolean) FROM PUBLIC;
-- Callable only with service_role key (edge cron); not granted to authenticated.
