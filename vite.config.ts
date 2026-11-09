import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { version: string }

function resolveCommit(): string {
  const environmentCommit = [process.env.CF_PAGES_COMMIT_SHA, process.env.GITHUB_SHA]
    .find(value => value && /^[a-f0-9]{40,64}$/i.test(value))
  if (environmentCommit) return environmentCommit
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}
const buildCommit = resolveCommit()
const buildId = buildCommit ? buildCommit.slice(0, 7) : 'local'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_ID__: JSON.stringify(buildId),
    __BUILD_COMMIT__: JSON.stringify(buildCommit),
  },
})
