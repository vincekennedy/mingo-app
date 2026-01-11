-- Final Fix: Database Trigger with Better Error Handling
-- This version includes error logging so we can see what's happening

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create function with error logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
BEGIN
  -- Extract username from metadata
  -- In Supabase, metadata is stored in raw_user_meta_data JSONB column
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Insert into public.users table
  -- SECURITY DEFINER allows this to bypass RLS
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
    -- Log the error to PostgreSQL logs
    RAISE LOG 'Error in handle_new_user trigger: % - User ID: % - Email: %', 
      SQLERRM, NEW.id, NEW.email;
    -- Return NEW anyway so auth user creation doesn't fail
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Verify it was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Step 5: Test by checking if function is callable
-- (We can't test the trigger directly without creating a user)
SELECT routine_name, security_type 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';
