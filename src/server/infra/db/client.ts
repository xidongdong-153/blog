import type { Client } from '@libsql/client'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { schema } from './schema'

export interface DatabaseBundle {
  client: Client
  db: ReturnType<typeof drizzle<typeof schema>>
}

export function createDatabase(url?: string, authToken?: string): DatabaseBundle {
  const targetUrl = url || process.env.TURSO_DATABASE_URL || 'file:local.db'
  const token = authToken || process.env.TURSO_AUTH_TOKEN

  const client = createClient({
    url: targetUrl,
    authToken: token,
  })

  const db = drizzle(client, { schema })
  return { client, db }
}

export const { client, db } = createDatabase()
export type AppDatabase = typeof db
