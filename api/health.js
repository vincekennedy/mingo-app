/**
 * Lightweight health check so smoke tests can verify /api serverless routes
 * are wired on Vercel (not swallowed by the SPA rewrite).
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return res.status(200).json({
    ok: true,
    service: 'mingo-api',
  })
}
