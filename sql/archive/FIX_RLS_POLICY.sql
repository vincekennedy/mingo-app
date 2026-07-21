-- Fix: Add missing INSERT policy for users table
-- This fixes the "new row violates row-level security policy" error

-- Add INSERT policy for users table (allows users to create their own profile)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- That's it! This policy allows authenticated users to insert their own profile
-- when they sign up, as long as the id matches their authenticated user ID.
