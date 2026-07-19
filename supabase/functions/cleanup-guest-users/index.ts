// Guest cleanup Edge Function — invokes public.cleanup_guest_users (service role).
// Schedule: pg_cron job cleanup-guest-users-daily (see migration). This HTTP entrypoint
// is for dry-runs and manual ops: POST with Authorization: Bearer <service_role_or_cron_secret>.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization') || ''
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
  const cronSecret = Deno.env.get('GUEST_CLEANUP_CRON_SECRET') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  const authorized =
    (serviceKey && bearer === serviceKey) || (cronSecret && bearer === cronSecret)

  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!serviceKey || !Deno.env.get('SUPABASE_URL')) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let dryRun = true
  let olderThan = '24 hours'
  let limit = 100

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      if (typeof body?.dry_run === 'boolean') dryRun = body.dry_run
      if (typeof body?.older_than === 'string' && body.older_than.trim()) {
        olderThan = body.older_than.trim()
      }
      if (typeof body?.limit === 'number' && body.limit > 0) {
        limit = Math.min(Math.floor(body.limit), 500)
      }
    } catch {
      // empty body ok — defaults to dry_run true
    }
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('cleanup_guest_users', {
    p_older_than: olderThan,
    p_limit: limit,
    p_dry_run: dryRun,
  })

  if (error) {
    console.error('cleanup_guest_users error', error)
    return new Response(JSON.stringify({ error: error.message, details: error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rows = Array.isArray(data) ? data : []
  return new Response(
    JSON.stringify({
      dry_run: dryRun,
      older_than: olderThan,
      limit,
      count: rows.length,
      user_ids: rows.map((r: { user_id: string }) => r.user_id),
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
