import { supabase } from '../lib/supabase'

export const authService = {
  /**
   * Register a new user
   * @param {string} username - Username (must be unique)
   * @param {string} email - Email address (used for Supabase auth)
   * @param {string} password - Password (min 6 characters)
   * @returns {Promise<Object>} User data
   */
  async signUp(username, email, password) {
    try {
      console.log('Attempting to sign up user:', { username, email })
      
      // Create auth user in Supabase with username in metadata
      // The database trigger will automatically create the profile
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      })
      
      console.log('Auth user created:', {
        id: authData.user?.id,
        email: authData.user?.email,
        session: !!authData.session,
        metadata: authData.user?.user_metadata
      })
      
      if (authError) {
        console.error('Supabase auth error:', authError)
        throw authError
      }
      
      if (!authData.user) {
        throw new Error('Failed to create user - no user data returned')
      }
      
      // Check if we have a session (user is authenticated)
      // If email confirmation is required, session might be null
      const hasSession = !!authData.session
      console.log('Auth user created, waiting for trigger to create profile...')
      console.log('User details:', {
        id: authData.user.id,
        email: authData.user.email,
        emailConfirmed: authData.user.email_confirmed_at,
        hasSession,
        metadata: authData.user.user_metadata
      })
      
      if (!hasSession) {
        console.warn('No session after signup - email confirmation may be required')
        console.warn('The trigger should still fire, but RLS policies may block reads until email is confirmed')
      }
      
      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Try multiple times to get the profile (trigger might need a moment)
      // Also try direct query in case getUserProfile has RLS issues
      let profile = null
      for (let i = 0; i < 5; i++) {
        try {
          // First try the getUserProfile method
          profile = await this.getUserProfile(authData.user.id)
          if (profile) {
            console.log(`Profile found via getUserProfile on attempt ${i + 1}`)
            break
          }
          
          // If getUserProfile returns null, try direct query to check if profile exists
          const { data: directProfile, error: directError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single()
          
          if (directProfile) {
            console.log(`Profile found via direct query on attempt ${i + 1}`)
            profile = directProfile
            break
          }
          
          if (directError && directError.code !== 'PGRST116') {
            console.warn(`Direct query error on attempt ${i + 1}:`, directError)
          }
          
          console.log(`Profile check attempt ${i + 1}: not found yet, waiting...`)
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (err) {
          console.log(`Profile check attempt ${i + 1} failed:`, err.message)
        }
      }
      
      if (!profile) {
        // Profile not found - try manual insert as fallback
        // If it fails with duplicate key, the profile exists but RLS is blocking reads
        console.warn('Profile not found after 5 attempts, attempting manual insert...')
        console.warn('If this fails with "duplicate key", the profile exists but RLS is blocking reads')
        
        const { data: insertData, error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            username,
          })
          .select()
          .single()
        
        if (profileError) {
          // Check if it's a duplicate key error (profile already exists)
          if (profileError.code === '23505' || 
              profileError.message?.includes('duplicate key') || 
              profileError.message?.includes('already exists') ||
              profileError.message?.includes('unique constraint')) {
            console.log('Profile already exists (duplicate key error) - RLS may be blocking reads')
            console.log('This means the trigger worked, but we cannot read the profile due to RLS')
            
            // Profile exists but we can't read it - this is an RLS SELECT policy issue
            // The account was created successfully, so we should return success
            // The user can log in and the profile will be accessible then
            console.warn('Account created successfully, but profile cannot be read immediately')
            console.warn('This is likely due to RLS SELECT policy or session not being fully established')
            console.warn('User should be able to log in and access their profile')
            
            // Return the user anyway - the profile exists, we just can't read it yet
            // The user can log in and it will work
            return authData.user
          } else if (profileError.message?.includes('row-level security') || profileError.code === '42501') {
            // RLS is blocking the insert
            console.error('Profile creation error details:', {
              message: profileError.message,
              code: profileError.code,
              details: profileError.details,
              hint: profileError.hint
            })
            
            throw new Error(
              'User profile creation failed. The trigger did not create the profile and manual insert was blocked by RLS.\n\n' +
              'DIAGNOSIS:\n' +
              '1. Run TEST_TRIGGER_SETUP.sql in Supabase SQL Editor to check setup\n' +
              '2. Check if email confirmation is required (Settings → Authentication → Email Auth)\n' +
              '3. Check Supabase Logs → Postgres Logs for trigger errors\n\n' +
              'FIX:\n' +
              '1. If email confirmation is enabled, either:\n' +
              '   - Disable it temporarily for testing, OR\n' +
              '   - Confirm your email first, then the trigger will fire\n' +
              '2. If trigger errors appear in logs, fix the trigger function\n' +
              '3. Ensure COMPLETE_USER_SETUP.sql was run successfully\n' +
              '4. Run DIAGNOSE_USER_SETUP.sql to verify all policies exist'
            )
          } else {
            throw profileError
          }
        } else {
          console.log('Manual profile insert succeeded:', insertData)
          profile = insertData
        }
      } else {
        console.log('Profile created by trigger:', profile)
      }
      
      console.log('User profile created successfully')
      return authData.user
    } catch (error) {
      console.error('Sign up error:', error)
      
      // Provide more helpful error messages
      if (error.message?.includes('fetch')) {
        throw new Error('Network error: Could not connect to Supabase. Please check your internet connection and Supabase URL in .env.local')
      } else if (error.message?.includes('Invalid API key')) {
        throw new Error('Invalid Supabase API key. Please check VITE_SUPABASE_ANON_KEY in .env.local')
      } else if (error.message?.includes('already registered')) {
        throw new Error('Email already registered. Please use a different email or login.')
      } else if (error.message?.includes('row-level security')) {
        throw new Error('Permission error. Please check that the database trigger is set up correctly. See RLS_TROUBLESHOOTING.md')
      }
      
      throw error
    }
  },
  
  /**
   * Sign in an existing user
   * @param {string} email - Email address
   * @param {string} password - Password
   * @returns {Promise<Object>} User data
   */
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      if (!data.user) {
        throw new Error('Sign in failed - no user returned')
      }
      
      return data.user
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  },
  
  /**
   * Sign out the current user
   * @returns {Promise<void>}
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  },
  
  /**
   * Get the current authenticated user
   * @returns {Promise<Object|null>} User data or null if not authenticated
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        // User not authenticated is not an error
        if (error.message?.includes('JWT')) {
          return null
        }
        throw error
      }
      
      return user
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  },
  
  /**
   * Get user profile from users table
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        // If user not found, it's okay - might be new user
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Get user profile error:', error)
      throw error
    }
  },
  
  /**
   * Listen to auth state changes
   * @param {Function} callback - Callback function that receives the user and event
   * @returns {Object} Subscription object with unsubscribe method
   */
  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null, event)
    })
    return { data: { subscription } }
  },
}
