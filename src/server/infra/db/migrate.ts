import type { AppDatabase } from './client'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { migrate } from 'drizzle-orm/libsql/migrator'

export const DATABASE_MIGRATIONS_DIR = path.resolve(process.cwd(), 'src/server/infra/db/migrations')

/**
 * 执行 Drizzle 增量迁移（幂等，已应用的迁移会被自动跳过）。
 */
export async function runDatabaseMigrations(database: AppDatabase, migrationsFolder = DATABASE_MIGRATIONS_DIR) {
  if (!existsSync(migrationsFolder)) {
    throw new Error(`[Database] 找不到迁移目录: ${migrationsFolder}`)
  }

  await migrate(database, { migrationsFolder })
}
