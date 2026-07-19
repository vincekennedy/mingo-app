-- Guest cleanup: list and delete anonymous users with no active games after a grace period.
-- Deleting auth.users cascades public.users → participants, boards, claims (feedback user_id SET NULL).

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

COMMENT ON FUNCTION public.list_guest_users_for_cleanup(interval, integer) IS
  'Anonymous auth users with no active-game membership and last activity older than p_older_than.';

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

COMMENT ON FUNCTION public.cleanup_guest_users(interval, integer, boolean) IS
  'Deletes (or dry-runs) eligible anonymous guests. Service role / cron only.';

REVOKE ALL ON FUNCTION public.list_guest_users_for_cleanup(interval, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_guest_users(interval, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_guest_users_for_cleanup(interval, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_guest_users(interval, integer, boolean) TO service_role;

-- Daily cleanup at 06:00 UTC (requires pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-guest-users-daily');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'cleanup-guest-users-daily',
    '0 6 * * *',
    $cron$SELECT public.cleanup_guest_users(interval '24 hours', 100, false);$cron$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cleanup-guest-users-daily: %', SQLERRM;
END;
$$;
