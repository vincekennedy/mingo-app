-- Debug: Check if trigger exists and is working
-- Run this in Supabase SQL Editor

-- 1. Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Check if function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';

-- 3. Check recent users in auth.users (last 5)
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check if corresponding profiles exist
SELECT 
  u.id,
  u.email,
  p.id as profile_id,
  p.username
FROM auth.users u
LEFT JOIN public.users p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;

-- 5. Test the function manually (replace USER_ID_HERE with an actual user ID from auth.users)
-- This will show any errors in the function
-- SELECT public.handle_new_user() FROM auth.users WHERE id = 'USER_ID_HERE';
