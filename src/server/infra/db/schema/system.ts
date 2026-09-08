import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const healthChecks = sqliteTable('system_health_checks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  service: text('service').notNull().default('turso'),
  status: text('status').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  checkedAt: integer('checked_at', { mode: 'timestamp_ms' }).notNull(),
})
