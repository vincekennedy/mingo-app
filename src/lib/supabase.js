import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check for missing environment variables
let supabaseConfigError = null
let supabase

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = []
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  
  supabaseConfigError = `Missing Supabase environment variables: ${missing.join(', ')}`
  const helpMsg = `Please set these environment variables:\n` +
    `- VITE_SUPABASE_URL=your-project-url\n` +
    `- VITE_SUPABASE_ANON_KEY=your-anon-key\n\n` +
    `For local development: Add them to .env.local file\n` +
    `For Vercel: Add them in Project Settings → Environment Variables\n\n` +
    `See VERCEL_SETUP.md for detailed instructions.`
  
  console.error(supabaseConfigError)
  console.error(helpMsg)
  
  // In production, create a dummy client so the app doesn't crash completely
  // This allows the UI to render and show an error message
  if (import.meta.env.PROD) {
    console.warn('Creating dummy Supabase client - app will not function correctly')
    // Create client with placeholder values (will fail on API calls, but app won't crash)
    supabase = createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder')
  } else {
    // In development, throw error immediately to catch issues early
    throw new Error(supabaseConfigError + '\n\n' + helpMsg)
  }
} else {
  // Validate URL format
  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    console.error('Invalid Supabase URL format. Should start with http:// or https://')
    console.error('Current value:', supabaseUrl)
  }

  // Validate key format (JWT tokens start with 'eyJ')
  if (!supabaseAnonKey.startsWith('eyJ')) {
    console.warn('Supabase anon key format looks incorrect. Should start with "eyJ"')
    console.warn('Current value starts with:', supabaseAnonKey.substring(0, 10))
  }

  // Create the actual Supabase client
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })

  // Log connection info in development
  if (import.meta.env.DEV) {
    console.log('Supabase client initialized:', {
      url: supabaseUrl.substring(0, 30) + '...',
      hasKey: !!supabaseAnonKey,
      keyLength: supabaseAnonKey?.length
    })
  }
}

export { supabase, supabaseConfigError }
