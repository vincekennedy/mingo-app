-- Smoke e2e leftovers: delete games with known smoke titles, then anonymous
-- guests named SmokeGuest / CornerGuest / LobbyGuest. Preserves the dedicated
-- SMOKE_HOST account (non-anonymous). Intended for Mingo-local / shared preview DB.

CREATE OR REPLACE FUNCTION public.is_smoke_test_game_title(p_title text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_title, '') ~* '(smoke test|corners smoke|lobby (private|public) smoke)';
$$;

COMMENT ON FUNCTION public.is_smoke_test_game_title(text) IS
  'True when games.config title matches Playwright smoke e2e titles.';

CREATE OR REPLACE FUNCTION public.is_smoke_test_guest_name(p_username text, p_display_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    COALESCE(p_display_name, '') ~* '^(SmokeGuest|CornerGuest|LobbyGuest)'
    OR COALESCE(p_username, '') ~* '^(SmokeGuest|CornerGuest|LobbyGuest)';
$$;

COMMENT ON FUNCTION public.is_smoke_test_guest_name(text, text) IS
  'True when public.users name matches Playwright smoke guest prefixes.';

CREATE OR REPLACE FUNCTION public.list_smoke_test_games_for_cleanup(p_limit integer DEFAULT 100)
RETURNS TABLE (game_code varchar(5))
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT g.code
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
      INNER JOIN public.games g ON g.code = gp.game_code
      WHERE gp.user_id = u.id
        AND g.status = 'active'
        AND NOT public.is_smoke_test_game_title(g.config->>'title')
    )
  ORDER BY u.created_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
$$;

COMMENT ON FUNCTION public.list_smoke_test_users_for_cleanup(integer) IS
  'Anonymous smoke e2e guests. Skips users still in a non-smoke active game.';

-- Deletes smoke-titled games first, then eligible smoke guest users.
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
  game_codes varchar(5)[];
  user_ids uuid[];
  lim integer := GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
BEGIN
  SELECT coalesce(array_agg(l.game_code), ARRAY[]::varchar(5)[])
    INTO game_codes
  FROM public.list_smoke_test_games_for_cleanup(lim) AS l;

  IF p_dry_run THEN
    RETURN QUERY
      SELECT 'game'::text, c::text, true
      FROM unnest(game_codes) AS c;
  ELSIF cardinality(game_codes) > 0 THEN
    DELETE FROM public.games g
    WHERE g.code = ANY (game_codes)
      AND public.is_smoke_test_game_title(g.config->>'title');

    RETURN QUERY
      SELECT 'game'::text, c::text, false
      FROM unnest(game_codes) AS c;
  END IF;

  -- Re-list users after games are gone so active-smoke membership no longer blocks.
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

COMMENT ON FUNCTION public.cleanup_smoke_test_data(integer, boolean) IS
  'Deletes (or dry-runs) smoke e2e games then anonymous smoke guests. Service role / cron only.';

REVOKE ALL ON FUNCTION public.is_smoke_test_game_title(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_smoke_test_guest_name(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_smoke_test_games_for_cleanup(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_smoke_test_users_for_cleanup(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_smoke_test_data(integer, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_smoke_test_game_title(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_smoke_test_guest_name(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_smoke_test_games_for_cleanup(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_smoke_test_users_for_cleanup(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_smoke_test_data(integer, boolean) TO service_role;

-- Daily after general guest cleanup (06:15 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-smoke-test-data-daily');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'cleanup-smoke-test-data-daily',
    '15 6 * * *',
    $cron$SELECT public.cleanup_smoke_test_data(100, false);$cron$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cleanup-smoke-test-data-daily: %', SQLERRM;
END;
$$;
