-- Diagnostic Script: Check if User Setup is Complete
-- Run this to see what's missing

-- 1. Check if trigger exists
SELECT 
  'TRIGGER CHECK' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') 
    THEN '✓ Trigger exists'
    ELSE '✗ Trigger MISSING'
  END as status,
  COALESCE(
    (SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created' LIMIT 1),
    'N/A'
  ) as trigger_name,
  COALESCE(
    (SELECT event_manipulation FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created' LIMIT 1),
    'N/A'
  ) as event_manipulation,
  COALESCE(
    (SELECT event_object_table FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created' LIMIT 1),
    'N/A'
  ) as event_object_table;

-- 2. Check if trigger function exists
SELECT 
  'FUNCTION CHECK' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user' AND routine_schema = 'public')
    THEN '✓ Function exists'
    ELSE '✗ Function MISSING'
  END as status,
  COALESCE(
    (SELECT routine_name FROM information_schema.routines WHERE routine_name = 'handle_new_user' AND routine_schema = 'public' LIMIT 1),
    'N/A'
  ) as routine_name,
  COALESCE(
    (SELECT security_type FROM information_schema.routines WHERE routine_name = 'handle_new_user' AND routine_schema = 'public' LIMIT 1),
    'N/A'
  ) as security_type;

-- 3. Check RLS policies
SELECT 
  'RLS POLICY CHECK' as check_type,
  policyname,
  cmd as policy_type,
  CASE 
    WHEN cmd = 'SELECT' THEN '✓ SELECT policy exists'
    WHEN cmd = 'INSERT' THEN '✓ INSERT policy exists'
    WHEN cmd = 'UPDATE' THEN '✓ UPDATE policy exists'
    ELSE cmd
  END as status
FROM pg_policies
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY cmd;

-- 4. Check if RLS is enabled
SELECT 
  'RLS ENABLED CHECK' as check_type,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✓ RLS is enabled'
    ELSE '✗ RLS is DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

-- 5. Summary
SELECT 
  'SUMMARY' as check_type,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') > 0
     AND (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'handle_new_user' AND routine_schema = 'public') > 0
     AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public' AND cmd = 'INSERT') > 0
     AND (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') = true
    THEN '✓ Everything is set up correctly!'
    ELSE '✗ Something is missing - run COMPLETE_USER_SETUP.sql'
  END as status;
