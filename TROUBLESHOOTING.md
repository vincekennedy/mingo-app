# Troubleshooting Guide

## NetworkError when attempting to fetch resource

This error typically means the Supabase client cannot connect to your Supabase project. Here's how to fix it:

### Step 1: Verify Environment Variables

1. **Check that `.env.local` exists** in your project root (same directory as `package.json`)

2. **Verify the file contents** - Open `.env.local` and make sure it looks like this:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Check for common mistakes:**
   - ❌ No spaces around the `=` sign
   - ❌ No quotes around the values (unless the value itself contains spaces)
   - ❌ No trailing slashes in the URL
   - ✅ URL should start with `https://`
   - ✅ Key should start with `eyJ`

### Step 2: Get Your Supabase Credentials

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Select your project (or create one if you haven't)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### Step 3: Update .env.local

Replace the values in `.env.local` with your actual credentials:

```env
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### Step 4: Restart Dev Server

**IMPORTANT**: Vite only loads environment variables when the server starts. After updating `.env.local`:

1. Stop your dev server (Ctrl+C or Cmd+C)
2. Start it again: `npm run dev`
3. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)

### Step 5: Check Browser Console

Open your browser's developer console (F12) and look for:
- Any error messages about missing environment variables
- Connection errors
- The Supabase initialization log (should show URL and key info in dev mode)

### Step 6: Verify Supabase Project Status

1. In Supabase dashboard, check that your project status is "Active"
2. If the project is still setting up, wait a few minutes
3. Check the project URL is accessible (try opening it in a browser - should show Supabase API docs)

### Common Issues and Solutions

#### Issue: "Missing Supabase environment variables"
**Solution**: 
- Make sure `.env.local` is in the project root (not in `src/`)
- Check variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server after creating/updating `.env.local`

#### Issue: "Invalid API key"
**Solution**:
- Make sure you copied the **anon public** key (not the service_role key)
- Check there are no extra spaces or line breaks
- The key should be very long (hundreds of characters)

#### Issue: "Network error" or "Failed to fetch"
**Solution**:
- Check your internet connection
- Verify the Supabase URL is correct (should end with `.supabase.co`)
- Try opening the Supabase URL in a browser to verify it's accessible
- Check if your firewall or VPN is blocking the connection
- Make sure the Supabase project is active (not paused)

#### Issue: "relation does not exist" or "permission denied"
**Solution**:
- Make sure you've run the SQL schema in Supabase SQL Editor
- Check that all tables were created (go to Table Editor in Supabase)
- Verify RLS policies were created

### Testing the Connection

You can test if your Supabase connection works by opening the browser console and running:

```javascript
// This should show your Supabase URL (truncated)
console.log(import.meta.env.VITE_SUPABASE_URL)

// This should show true if the key exists
console.log(!!import.meta.env.VITE_SUPABASE_ANON_KEY)
```

### Still Having Issues?

1. **Check Supabase Dashboard**:
   - Go to Settings → API
   - Verify your Project URL and anon key match what's in `.env.local`

2. **Check Network Tab**:
   - Open browser DevTools → Network tab
   - Try to register again
   - Look for failed requests to `supabase.co`
   - Check the error details in the failed request

3. **Verify Database Schema**:
   - Go to Supabase → Table Editor
   - Make sure the `users` table exists
   - If it doesn't, run the SQL schema from `SUPABASE_SETUP.md`

4. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs
   - Check for any errors related to your requests
