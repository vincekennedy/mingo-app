-- SQL to verify and fix RLS policies for users table
-- Run this in Supabase SQL Editor

-- First, check if the policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- If the INSERT policy doesn't exist, create it
-- Drop it first if it exists (to avoid errors)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create the INSERT policy
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Verify all policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY cmd;
