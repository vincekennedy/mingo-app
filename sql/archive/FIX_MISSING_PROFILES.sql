-- Fix: Create missing user profiles for existing auth users
-- Run this in Supabase SQL Editor if users were created before the trigger was set up

-- Create a function to sync missing profiles
CREATE OR REPLACE FUNCTION sync_missing_user_profiles()
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  -- Insert profiles for auth users that don't have profiles yet
  INSERT INTO public.users (id, username, created_at, updated_at)
  SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
    au.created_at,
    NOW()
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL
  ON CONFLICT (id) DO NOTHING;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to sync missing profiles
SELECT sync_missing_user_profiles() as profiles_created;

-- Verify all users now have profiles
SELECT 
  COUNT(*) as total_auth_users,
  COUNT(pu.id) as users_with_profiles,
  COUNT(*) - COUNT(pu.id) as missing_profiles
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id;

-- Drop the function if you don't need it anymore
-- DROP FUNCTION IF EXISTS sync_missing_user_profiles();
