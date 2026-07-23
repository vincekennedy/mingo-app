import { supabase } from '../lib/supabase'

/** Prefer friendly display_name; fall back to unique username or other fallback. */
export function resolveDisplayName(profile, fallback = 'User') {
  const fromProfile = profile?.display_name || profile?.username
  if (fromProfile && String(fromProfile).trim()) return String(fromProfile).trim()
  if (fallback && String(fallback).trim()) return String(fallback).trim()
  return 'User'
}

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
        // Email confirmation (or similar) left us without a JWT. The DB trigger still
        // creates public.users, but RLS blocks client reads/inserts until login.
        // Do not attempt a manual profile insert — it will always fail under RLS.
        console.warn('No session after signup - confirm email (or disable confirmations on mingo-local), then log in')
        return authData.user
      }

      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500))

      let profile = null
      for (let i = 0; i < 5; i++) {
        try {
          profile = await this.getUserProfile(authData.user.id)
          if (profile) break

          const { data: directProfile, error: directError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single()

          if (directProfile) {
            profile = directProfile
            break
          }

          if (directError && directError.code !== 'PGRST116') {
            console.warn(`Direct query error on attempt ${i + 1}:`, directError)
          }

          await new Promise(resolve => setTimeout(resolve, 400))
        } catch (err) {
          console.log(`Profile check attempt ${i + 1} failed:`, err.message)
        }
      }

      if (!profile) {
        // Session exists but profile not readable yet — try insert fallback once
        const { data: insertData, error: profileError } = await supabase
          .from('users')
          .insert({ id: authData.user.id, username })
          .select()
          .single()

        if (profileError) {
          if (
            profileError.code === '23505' ||
            profileError.message?.includes('duplicate key') ||
            profileError.message?.includes('already exists') ||
            profileError.message?.includes('unique constraint')
          ) {
            // Trigger won the race; profile exists
            return authData.user
          }
          if (profileError.message?.includes('row-level security') || profileError.code === '42501') {
            // Auth succeeded; profile may still be created by trigger. Allow login path.
            console.warn('Profile not readable yet after signup; try logging in', profileError)
            return authData.user
          }
          throw profileError
        }
        profile = insertData
      }

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
   * Create an anonymous Supabase session for guest play (join/play without email login).
   * Requires Anonymous provider enabled in Supabase → Authentication → Providers.
   * @param {string} displayName
   * @returns {Promise<Object>} Auth user
   */
  async signInAsGuest(displayName) {
    const base =
      String(displayName || '')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .slice(0, 24) || 'Guest'
    const username = `${base}-${Math.random().toString(36).slice(2, 6)}`

    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: { username, display_name: base },
      },
    })

    if (error) {
      console.error('Guest sign-in error:', error)
      const msg = error.message || ''
      if (/anonymous|disabled|not enabled/i.test(msg)) {
        throw new Error(
          'Guest join is not enabled for this Supabase project. Enable Authentication → Providers → Anonymous, or log in.'
        )
      }
      throw error
    }

    if (!data.user) {
      throw new Error('Guest sign-in failed - no user returned')
    }

    // Allow handle_new_user trigger to create public.users
    await new Promise((resolve) => setTimeout(resolve, 500))

    let profile = await this.getUserProfile(data.user.id)
    if (!profile) {
      const { error: insertError } = await supabase.from('users').insert({
        id: data.user.id,
        username,
        display_name: base,
      })
      if (
        insertError &&
        insertError.code !== '23505' &&
        !insertError.message?.includes('duplicate')
      ) {
        console.warn('Guest profile insert issue:', insertError)
      }
      profile = (await this.getUserProfile(data.user.id)) || { username, display_name: base }
    } else if (!profile.display_name) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ display_name: base, updated_at: new Date().toISOString() })
        .eq('id', data.user.id)
      if (updateError) {
        console.warn('Guest display_name update issue:', updateError)
      } else {
        profile = { ...profile, display_name: base }
      }
    }

    const resolved = resolveDisplayName(profile, base)
    return { user: data.user, username: profile.username || username, displayName: resolved }
  },

  /**
   * Base URL for auth email links (reset password, etc.).
   * Must match an entry in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
   */
  getAuthEmailRedirectUrl() {
    if (typeof window === 'undefined') return undefined
    const explicit = import.meta.env.VITE_SITE_URL
    if (explicit && typeof explicit === 'string') {
      return explicit.replace(/\/$/, '') + '/'
    }
    return `${window.location.origin}/`
  },

  /**
   * Send a password reset email (Supabase does not reveal whether the email exists).
   * @param {string} email
   * @returns {Promise<void>}
   */
  async requestPasswordReset(email) {
    try {
      const redirectTo = this.getAuthEmailRedirectUrl()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        ...(redirectTo ? { redirectTo } : {}),
      })
      if (error) throw error
    } catch (error) {
      console.error('Password reset request error:', error)
      throw error
    }
  },

  /**
   * Set a new password while in a recovery session (after user follows email link).
   * @param {string} newPassword
   * @returns {Promise<void>}
   */
  async updatePassword(newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    } catch (error) {
      console.error('Update password error:', error)
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
   * Ensure public.users has a row for this auth user (trigger may have been skipped).
   * @param {import('@supabase/supabase-js').User} user
   * @returns {Promise<Object|null>}
   */
  async ensureUserProfile(user) {
    if (!user?.id) return null

    let profile = await this.getUserProfile(user.id)
    if (profile) return profile

    const metaName =
      typeof user.user_metadata?.username === 'string'
        ? user.user_metadata.username.trim()
        : ''
    const emailLocal = user.email?.includes('@') ? user.email.split('@')[0] : ''
    const base = (metaName || emailLocal || 'user').slice(0, 40)
    let username = base

    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          username,
          display_name:
            typeof user.user_metadata?.display_name === 'string'
              ? user.user_metadata.display_name.trim() || null
              : null,
        })
        .select('*')
        .single()

      if (!error && data) return data

      // Insert race or username unique conflict — re-read, then retry with suffix.
      profile = await this.getUserProfile(user.id)
      if (profile) return profile

      if (error?.code === '23505') {
        username = `${base.slice(0, 32)}-${Math.random().toString(36).slice(2, 6)}`
        continue
      }

      console.error('ensureUserProfile insert failed:', error)
      throw error || new Error('Could not create user profile.')
    }

    return this.getUserProfile(user.id)
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
