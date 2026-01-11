-- Alternative Fix: Use a Database Trigger to Automatically Create User Profiles
-- This is a more robust solution that doesn't rely on the client inserting into users table
-- 
-- IMPORTANT: If you use this approach, you need to UPDATE the auth.js signUp function
-- to NOT manually insert into the users table (the trigger will do it automatically)
--
-- This approach is recommended if the RLS policy approach doesn't work

-- Step 1: Create a function that creates a user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table
  -- Note: This runs with elevated privileges, so RLS doesn't apply
  INSERT INTO public.users (id, username, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create a trigger that fires when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Note: If you use this trigger approach, you'll need to update the signUp function
-- in src/services/auth.js to NOT manually insert into the users table, OR
-- you can pass the username in the signup metadata and let the trigger handle it.
