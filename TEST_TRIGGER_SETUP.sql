-- Test Script: Verify Trigger and RLS Setup
-- Run this to see detailed information about what's happening

-- 1. Check trigger exists and is active
SELECT 
  'Trigger Status' as check_type,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Check function exists and has correct security
SELECT 
  'Function Status' as check_type,
  routine_name,
  routine_type,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '✓ Has SECURITY DEFINER (can bypass RLS)'
    ELSE '✗ Missing SECURITY DEFINER'
  END as security_status
FROM information_schema.routines
WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';

-- 3. Check all RLS policies in detail
SELECT 
  'RLS Policies' as check_type,
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY cmd;

-- 4. Check if RLS is enabled
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '✓ RLS is ENABLED'
    ELSE '✗ RLS is DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

-- 5. Check recent auth users and their profiles
SELECT 
  'Recent Users' as check_type,
  au.id,
  au.email,
  au.created_at as auth_created,
  au.email_confirmed_at,
  CASE 
    WHEN au.email_confirmed_at IS NULL THEN '⚠ Email NOT confirmed'
    ELSE '✓ Email confirmed'
  END as email_status,
  pu.id as profile_id,
  pu.username,
  CASE 
    WHEN pu.id IS NULL THEN '✗ NO PROFILE'
    ELSE '✓ Profile exists'
  END as profile_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 5;

-- 6. Check for any trigger errors in logs (if accessible)
-- Note: This may not work in Supabase SQL Editor, but worth trying
SELECT 
  'Trigger Errors' as check_type,
  'Check Supabase Logs → Postgres Logs for any errors from handle_new_user function' as note;
