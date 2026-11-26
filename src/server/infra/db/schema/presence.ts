import type { PresenceReport } from '@/lib/presence'
import { sql } from 'drizzle-orm'
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const presenceLatest = sqliteTable(
  'site_presence_latest',
  {
    id: integer('id').primaryKey(),
    generation: integer('generation').notNull(),
    seq: integer('seq').notNull(),
    report: text('report', { mode: 'json' }).$type<PresenceReport>().notNull(),
    receivedAt: text('received_at').notNull(),
    expiresAt: text('expires_at').notNull(),
  },
  (table) => [check('site_presence_singleton', sql`${table.id} = 1`)],
)
