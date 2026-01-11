import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __COMMIT_HASH__: JSON.stringify(getCommitHash()),
    __APP_VERSION__: JSON.stringify(getPackageVersion()),
  },
})
