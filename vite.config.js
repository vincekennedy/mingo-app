import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { generateBingoItems } from './api/lib/generateBingoItems.js'

// Get git commit hash
function getCommitHash() {
  try {
    return execSync('git rev-parse HEAD').toString().trim()
  } catch (error) {
    return 'unknown'
  }
}

// Get version from package.json
function getPackageVersion() {
  try {
    const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
    return packageJson.version || '0.0.0'
  } catch (error) {
    return '0.0.0'
  }
}

// Get Vercel environment (development, preview, production)
function getVercelEnv() {
  return process.env.VERCEL_ENV || 'development'
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function generateItemsDevApi() {
  return {
    name: 'generate-items-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/generate-items', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        if (req.method !== 'POST') {
          next()
          return
        }

        res.setHeader('Content-Type', 'application/json')
        try {
          const body = await readJsonBody(req)
          const items = await generateBingoItems({
            title: body.title,
            count: body.count,
            apiKey:
              process.env.GEMINI_API_KEY ||
              process.env.GOOGLE_GENERATIVE_AI_API_KEY,
          })
          res.statusCode = 200
          res.end(JSON.stringify({ items }))
        } catch (error) {
          console.error('generate-items (vite) error:', error)
          res.statusCode = error.status || 500
          res.end(JSON.stringify({ error: error.message || 'Failed to generate bingo items' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load non-VITE env (e.g. GEMINI_API_KEY) into process.env for the dev API middleware
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_BINGO_MODEL']) {
    if (env[key] && !process.env[key]) {
      process.env[key] = env[key]
    }
  }

  return {
    plugins: [react(), generateItemsDevApi()],
    define: {
      __COMMIT_HASH__: JSON.stringify(getCommitHash()),
      __APP_VERSION__: JSON.stringify(getPackageVersion()),
      __VERCEL_ENV__: JSON.stringify(getVercelEnv()),
    },
  }
})
