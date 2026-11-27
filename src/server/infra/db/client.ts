import type { Client } from '@libsql/client'
import type { ResolvedDatabaseConfig } from './config'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import {
  formatDatabaseProviderLabel,
  isDatabaseAutoMigrateEnabled,
  maskDatabaseUrl,
  resolveDatabaseConfig,
} from './config'
import { runDatabaseMigrations } from './migrate'
import { schema } from './schema'

export interface DatabaseBundle {
  client: Client
  db: ReturnType<typeof drizzle<typeof schema>>
  config: ResolvedDatabaseConfig
}

const LOCAL_SQLITE_PRAGMAS = [
  'PRAGMA journal_mode = WAL',
  'PRAGMA busy_timeout = 5000',
  'PRAGMA foreign_keys = ON',
  'PRAGMA synchronous = NORMAL',
] as const

const pragmaTasks = new WeakMap<Client, Promise<void>>()
const initTasks = new WeakMap<Client, Promise<void>>()

function ensureLocalDatabaseDirectory(config: ResolvedDatabaseConfig) {
  if (!config.isLocalFile || !config.localFilePath) return
  const dir = path.dirname(path.resolve(config.localFilePath))
  mkdirSync(dir, { recursive: true })
}

export function configureLocalSqlitePragmas(targetClient: Client, config: ResolvedDatabaseConfig): Promise<void> {
  if (!config.isLocalFile) {
    return Promise.resolve()
  }

  const existing = pragmaTasks.get(targetClient)
  if (existing) return existing

  const task = (async () => {
    for (const statement of LOCAL_SQLITE_PRAGMAS) {
      await targetClient.execute(statement)
    }
  })().catch((error) => {
    pragmaTasks.delete(targetClient)
    throw error
  })

  pragmaTasks.set(targetClient, task)
  return task
}

export function createDatabase(url?: string, authToken?: string): DatabaseBundle {
  const config = resolveDatabaseConfig({ url, authToken, context: 'Database' })
  ensureLocalDatabaseDirectory(config)

  const client = createClient({
    url: config.url,
    authToken: config.authToken,
  })

  const db = drizzle(client, { schema })
  return { client, db, config }
}

const defaultBundle = createDatabase()

export const { client, db, config: databaseConfig } = defaultBundle
export type AppDatabase = typeof db

/**
 * 服务启动初始化：为本地 SQLite 配置并发 PRAGMA，并按开关执行自动迁移。
 */
export function initializeDatabase(bundle: DatabaseBundle = defaultBundle): Promise<void> {
  const existing = initTasks.get(bundle.client)
  if (existing) return existing

  const task = (async () => {
    await configureLocalSqlitePragmas(bundle.client, bundle.config)

    const label = formatDatabaseProviderLabel(bundle.config.provider)
    const displayUrl = maskDatabaseUrl(bundle.config.url)

    if (isDatabaseAutoMigrateEnabled()) {
      await runDatabaseMigrations(bundle.db)
      console.log(`[Database] 已就绪: ${label} (${displayUrl})，自动迁移完成`)
    } else {
      console.log(`[Database] 已就绪: ${label} (${displayUrl})，已跳过自动迁移 (DATABASE_AUTO_MIGRATE=false)`)
    }
  })().catch((error) => {
    initTasks.delete(bundle.client)
    throw error
  })

  initTasks.set(bundle.client, task)
  return task
}
