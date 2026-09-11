import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * 站点匿名访客累计记录表。
 * 每个有效 site_visitor_id 写入一条记录，仅存储随机 visitor_id 与首次访问毫秒时间戳。
 */
export const visitorRecords = sqliteTable('site_visitor_records', {
  visitorId: text('visitor_id').primaryKey(),
  firstSeenAt: integer('first_seen_at', { mode: 'timestamp_ms' }).notNull(),
})
