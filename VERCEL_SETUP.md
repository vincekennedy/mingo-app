# Vercel Deployment Setup Guide

## Setting Up Environment Variables in Vercel

Your app requires Supabase environment variables to work. These need to be configured in Vercel for your deployment to work.

### Step 1: Get Your Supabase Credentials

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### Step 2: Add Environment Variables in Vercel

1. Go to your Vercel dashboard: [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project (mingo)
3. Click on **Settings** in the top navigation
4. Click on **Environment Variables** in the left sidebar
5. Add the following variables:

   **Variable 1:**
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** `https://your-project-id.supabase.co` (paste your actual URL)
   - **Environments:** Select all (Production, Preview, Development)

   **Variable 2:**
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (paste your actual key)
   - **Environments:** Select all (Production, Preview, Development)

6. Click **Save** for each variable

### Step 3: Redeploy

After adding the environment variables:

1. Go to the **Deployments** tab in Vercel
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

### Step 4: Verify

1. After deployment completes, visit your Vercel URL
2. Open browser DevTools (F12) → Console tab
3. You should NOT see the error: "Missing Supabase environment variables"
4. The app should load normally

## Important Notes

- **Environment variables are case-sensitive**: Must be exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **VITE_ prefix is required**: Vite only exposes environment variables that start with `VITE_` to the client
- **No quotes needed**: Don't add quotes around the values in Vercel
- **Redeploy required**: After adding/changing environment variables, you must redeploy for changes to take effect

## Troubleshooting

### Still seeing a blank page?

1. **Check Vercel build logs:**
   - Go to your deployment in Vercel
   - Click on the deployment
   - Check the **Build Logs** for any errors

2. **Check browser console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for error messages

3. **Verify variables are set:**
   - In Vercel Settings → Environment Variables
   - Make sure both variables are listed
   - Make sure they're enabled for the environment (Production/Preview/Development)

4. **Check variable values:**
   - Make sure the URL starts with `https://`
   - Make sure the key starts with `eyJ`
   - No extra spaces or quotes

### Build succeeds but page is blank?

- Check browser console for JavaScript errors
- Verify environment variables are set in Vercel (not just locally)
- Make sure you redeployed after adding the variables
