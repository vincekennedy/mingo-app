-- Fix: Add UPDATE policy for games table
-- This allows hosts to update their games (e.g., change status to 'ended')
-- Run this in Supabase SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Hosts can update their games" ON public.games;

-- Create UPDATE policy: Hosts can update their own games
CREATE POLICY "Hosts can update their games" ON public.games
  FOR UPDATE TO authenticated 
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'games' AND schemaname = 'public'
ORDER BY cmd;
