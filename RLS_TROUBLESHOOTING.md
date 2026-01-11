# Fixing "new row violates row-level security policy" Error

## Issue
When trying to register a user, you get: `new row violates row-level security policy for table "users"`

## Root Cause
The INSERT policy for the `users` table is either missing or not working correctly.

## Solution 1: Verify and Add INSERT Policy (Recommended)

1. **Go to Supabase SQL Editor**
2. **Run this SQL to check existing policies:**
   ```sql
   SELECT policyname, cmd 
   FROM pg_policies 
   WHERE tablename = 'users' AND schemaname = 'public'
   ORDER BY cmd;
   ```

3. **You should see policies for SELECT, INSERT, and UPDATE. If INSERT is missing:**

   ```sql
   -- Drop if exists (to avoid errors)
   DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
   
   -- Create the INSERT policy
   CREATE POLICY "Users can insert own profile" ON public.users
     FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
   ```

4. **Verify it was created:**
   ```sql
   SELECT policyname, cmd 
   FROM pg_policies 
   WHERE tablename = 'users' AND schemaname = 'public'
   ORDER BY cmd;
   ```

5. **Try registering again**

## Solution 2: Use Database Trigger (More Robust)

If Solution 1 doesn't work, use a database trigger to automatically create user profiles:

1. **Run the trigger SQL** from `ALTERNATIVE_FIX_TRIGGER.sql`

2. **Update `src/services/auth.js`** to pass username in metadata instead of manually inserting:

   Change the `signUp` function to:
   ```javascript
   async signUp(username, email, password) {
     // Create auth user with username in metadata
     const { data: authData, error: authError } = await supabase.auth.signUp({
       email,
       password,
       options: {
         data: {
           username: username
         }
       }
     })
     
     if (authError) throw authError
     if (!authData.user) throw new Error('Failed to create user')
     
     // Trigger will automatically create the profile, but wait a moment
     await new Promise(resolve => setTimeout(resolve, 500))
     
     return authData.user
   }
   ```

## Solution 3: Temporarily Disable RLS (NOT Recommended for Production)

**Only use this for testing/debugging:**

```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

**Remember to re-enable it:**
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

## Debugging Steps

1. **Check if RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' AND tablename = 'users';
   ```
   Should show `rowsecurity = true`

2. **List all policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```

3. **Check if user is authenticated:**
   - In browser console, after attempting signup, check if `auth.uid()` returns a value
   - The user should be authenticated immediately after `signUp()` call

4. **Test the policy directly:**
   ```sql
   -- This should return true if you're logged in
   SELECT auth.uid();
   ```

## Most Common Issues

1. **Policy doesn't exist** - Run Solution 1
2. **Policy exists but not working** - User might not be authenticated at insert time
3. **Timing issue** - User profile insert happens before auth is fully set up
4. **Policy syntax error** - Check the SQL syntax in Supabase SQL Editor

## Recommended Fix

I recommend **Solution 2 (Database Trigger)** because:
- More reliable (doesn't depend on client-side timing)
- Automatically handles user profile creation
- More secure (runs with elevated privileges)
- Standard pattern in Supabase applications

If you use Solution 2, you'll need to update the `signUp` function in `src/services/auth.js` as shown above.
