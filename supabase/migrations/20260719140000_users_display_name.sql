-- Guest-friendly display names: keep username unique (Name-xxxx), show entered name separately.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS display_name TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
BEGIN
  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1),
    'user'
  );

  v_display_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), '');

  INSERT INTO public.users (id, username, display_name, created_at, updated_at)
  VALUES (NEW.id, v_username, v_display_name, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username,
      display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
      updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Backfill entered names for existing anonymous guests (strip trailing -xxxx suffix).
UPDATE public.users u
SET display_name = regexp_replace(u.username, '-[a-z0-9]{4}$', '', 'i'),
    updated_at = NOW()
FROM auth.users au
WHERE au.id = u.id
  AND au.is_anonymous IS TRUE
  AND u.display_name IS NULL
  AND u.username ~* '-[a-z0-9]{4}$';
