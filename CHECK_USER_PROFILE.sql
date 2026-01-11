-- SQL to check if user profiles exist
-- Run this in Supabase SQL Editor to debug the foreign key constraint issue

-- Check all auth users
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data->>'username' as username_in_metadata
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Check all user profiles in public.users
SELECT 
  id,
  username,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- Check which auth users don't have profiles
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  pu.id as profile_id,
  pu.username,
  pu.created_at as profile_created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- If you see users without profiles, you need to either:
-- 1. Re-run the trigger setup (FIX_TRIGGER_FINAL.sql)
-- 2. Manually create the missing profiles (see FIX_MISSING_PROFILES.sql)
