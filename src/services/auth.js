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
        metadata: authData.user?.user_metadata
      })
      
      if (authError) {
        console.error('Supabase auth error:', authError)
        throw authError
      }
      
      if (!authData.user) {
        throw new Error('Failed to create user - no user data returned')
      }
      
      console.log('Auth user created, waiting for trigger to create profile...')
      
      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Try multiple times to get the profile (trigger might need a moment)
      let profile = null
      for (let i = 0; i < 3; i++) {
        try {
          profile = await this.getUserProfile(authData.user.id)
          if (profile) break
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (err) {
          console.log(`Profile check attempt ${i + 1} failed:`, err.message)
        }
      }
      
      if (!profile) {
        // If trigger didn't work, try manual insert as fallback
        console.warn('Profile not created by trigger, attempting manual insert...')
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            username,
          })
        
        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Provide helpful error message
          if (profileError.message?.includes('row-level security')) {
            throw new Error('Trigger failed and manual insert blocked by RLS. Please run FIX_TRIGGER_FINAL.sql in Supabase SQL Editor.')
          }
          throw profileError
        }
        console.log('Manual profile insert succeeded')
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
