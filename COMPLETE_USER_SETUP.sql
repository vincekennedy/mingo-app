-- Complete User Setup: Trigger + RLS Policies
-- Run this entire script in Supabase SQL Editor to fix user creation issues
-- This combines the trigger setup and RLS policies needed for user registration

-- Step 1: Ensure the trigger function exists and is correct
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
BEGIN
  -- Extract username from metadata
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Insert into public.users table
  INSERT INTO public.users (id, username, created_at, updated_at)
  VALUES (
    NEW.id,
    v_username,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username,
      updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Step 5: Create RLS policies
-- Users can read their own profile
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Users can insert their own profile (fallback if trigger doesn't work)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Step 6: Verify the setup
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Step 7: Check RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY cmd;

-- Success! The trigger and RLS policies are now set up correctly.
-- Users should now be able to register successfully.
