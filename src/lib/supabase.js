import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Better error messages for debugging
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = []
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  
  const errorMsg = `Missing Supabase environment variables: ${missing.join(', ')}\n\n` +
    `Please check your .env.local file in the project root.\n` +
    `Required variables:\n` +
    `- VITE_SUPABASE_URL=your-project-url\n` +
    `- VITE_SUPABASE_ANON_KEY=your-anon-key\n\n` +
    `After adding them, restart your dev server (npm run dev)`
  
  console.error(errorMsg)
  throw new Error(errorMsg)
}

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
