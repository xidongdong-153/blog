import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'drizzle-kit'
import { resolveDatabaseConfig } from './src/server/infra/db/config'

if (existsSync('.env.local')) {
  process.loadEnvFile?.('.env.local')
}
if (existsSync('.env')) {
  process.loadEnvFile?.('.env')
}

const config = resolveDatabaseConfig({ context: 'drizzle.config' })

if (config.isLocalFile && config.localFilePath) {
  mkdirSync(path.dirname(path.resolve(config.localFilePath)), { recursive: true })
}

export default defineConfig({
  schema: './src/server/infra/db/schema/index.ts',
  out: './src/server/infra/db/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: config.url,
    authToken: config.authToken,
  },
})
