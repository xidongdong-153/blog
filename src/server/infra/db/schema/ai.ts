import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const aiSummaryConfig = sqliteTable('site_ai_summary_config', {
  id: text('id').primaryKey(),
  protocol: text('protocol').notNull(),
  baseUrl: text('base_url').notNull(),
  modelId: text('model_id').notNull(),
  credentialCiphertext: text('credential_ciphertext'),
  credentialIv: text('credential_iv'),
  credentialAuthTag: text('credential_auth_tag'),
  credentialMask: text('credential_mask'),
  status: text('status').notNull().default('needs_check'),
  revision: integer('revision').notNull().default(1),
  checkedAt: integer('checked_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export type AiSummaryConfigRecord = typeof aiSummaryConfig.$inferSelect
export type NewAiSummaryConfigRecord = typeof aiSummaryConfig.$inferInsert
