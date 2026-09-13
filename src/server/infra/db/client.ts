import type { Client } from '@libsql/client'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { schema } from './schema'

export interface DatabaseBundle {
  client: Client
  db: ReturnType<typeof drizzle<typeof schema>>
}

export function createDatabase(url?: string, authToken?: string): DatabaseBundle {
  const isProduction = process.env.NODE_ENV === 'production'
  const isCi = Boolean(process.env.CI)
  const targetUrl = (url || process.env.TURSO_DATABASE_URL || '').trim()
  const token = (authToken || process.env.TURSO_AUTH_TOKEN || '').trim()

  if (isProduction) {
    if (!targetUrl) {
      throw new Error('[Database] 生产环境缺少有效的 TURSO_DATABASE_URL 配置，禁止启动服务')
    }
    if (!isCi && targetUrl.startsWith('file:')) {
      throw new Error('[Database] 生产环境禁止使用本地 SQLite 文件数据库 (file:)，请配置线上 Turso 实例')
    }
    if (!isCi && !token) {
      throw new Error('[Database] 生产环境缺少有效的 TURSO_AUTH_TOKEN 配置，禁止启动服务')
    }
  }

  const effectiveUrl = targetUrl || 'file:local.db'
  const effectiveToken = token || undefined

  const client = createClient({
    url: effectiveUrl,
    authToken: effectiveToken,
  })

  const db = drizzle(client, { schema })
  return { client, db }
}

export const { client, db } = createDatabase()
export type AppDatabase = typeof db
