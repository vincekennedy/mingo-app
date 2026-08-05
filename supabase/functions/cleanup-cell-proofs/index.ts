// Cell-proof storage cleanup — for idle/ended scavenger games (default age 7 days).
// POST Authorization: Bearer <service_role_or_CELL_PROOF_CLEANUP_CRON_SECRET>
// Body optional: { dry_run?: boolean, older_than?: string, limit?: number }

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
  const cronSecret = Deno.env.get('CELL_PROOF_CLEANUP_CRON_SECRET') || ''
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
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  let dryRun = true
  let olderThan = '7 days'
  let limit = 500

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      if (typeof body?.dry_run === 'boolean') dryRun = body.dry_run
      if (typeof body?.older_than === 'string' && body.older_than.trim()) {
        olderThan = body.older_than.trim()
      }
      if (typeof body?.limit === 'number' && body.limit > 0) {
        limit = Math.min(Math.floor(body.limit), 2000)
      }
    } catch {
      // empty body ok
    }
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: rows, error } = await supabase.rpc('cleanup_stale_cell_proofs', {
    p_older_than: olderThan,
    p_limit: limit,
    p_dry_run: dryRun,
    p_delete_rows: false,
  })

  if (error) {
    console.error('cleanup_stale_cell_proofs error', error)
    return new Response(JSON.stringify({ error: error.message, details: error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const paths = (rows || [])
    .map((r: { storage_path?: string }) => r.storage_path)
    .filter((p: string | undefined): p is string => Boolean(p))

  let removed = 0
  if (!dryRun && paths.length > 0) {
    const chunk = 100
    for (let i = 0; i < paths.length; i += chunk) {
      const slice = paths.slice(i, i + chunk)
      const { error: rmError } = await supabase.storage.from('cell-proofs').remove(slice)
      if (rmError) {
        console.error('storage remove error', rmError)
      } else {
        removed += slice.length
      }
    }

    const { error: rowError } = await supabase.rpc('cleanup_stale_cell_proofs', {
      p_older_than: olderThan,
      p_limit: limit,
      p_dry_run: false,
      p_delete_rows: true,
    })
    if (rowError) {
      console.error('row delete error', rowError)
      return new Response(
        JSON.stringify({
          error: rowError.message,
          listed: paths.length,
          removed,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
  }

  return new Response(
    JSON.stringify({
      dry_run: dryRun,
      listed: paths.length,
      removed: dryRun ? 0 : removed,
      sample_paths: paths.slice(0, 10),
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})
