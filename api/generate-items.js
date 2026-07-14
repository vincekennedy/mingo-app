import { generateBingoItems } from './lib/generateBingoItems.js'

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { title, count } = req.body || {}
    const items = await generateBingoItems({ title, count })
    return res.status(200).json({ items })
  } catch (error) {
    console.error('generate-items error:', error)
    const status = error.status || 500
    return res.status(status).json({
      error: error.message || 'Failed to generate bingo items',
    })
  }
}
