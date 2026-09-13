import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

if (existsSync('.env.local')) {
  process.loadEnvFile?.('.env.local')
}

const isProduction = process.env.NODE_ENV === 'production'
const isCi = Boolean(process.env.CI)
const dbUrl = (process.env.TURSO_DATABASE_URL || '').trim()
const dbToken = (process.env.TURSO_AUTH_TOKEN || '').trim()

if (isProduction) {
  if (!dbUrl) {
    throw new Error('[drizzle.config] 生产环境缺少有效的 TURSO_DATABASE_URL 配置，禁止回退本地 SQLite')
  }
  if (!isCi && dbUrl.startsWith('file:')) {
    throw new Error('[drizzle.config] 生产环境禁止使用本地 SQLite 文件数据库 (file:)，请配置线上 Turso 实例')
  }
  if (!isCi && !dbToken) {
    throw new Error('[drizzle.config] 生产环境缺少有效的 TURSO_AUTH_TOKEN 配置')
  }
}

export default defineConfig({
  schema: './src/server/infra/db/schema/index.ts',
  out: './src/server/infra/db/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: dbUrl || 'file:local.db',
    authToken: dbToken || undefined,
  },
})
