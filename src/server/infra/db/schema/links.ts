import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const friendLinks = sqliteTable('site_friend_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  description: text('description').notNull(),
  avatarUrl: text('avatar_url'),
  ownerName: text('owner_name').notNull(),
  email: text('email').notNull(),
  hasAddedUs: integer('has_added_us').notNull().default(0),
  // 状态：pending（待审核）| approved（已通过）| rejected（已拒绝）
  status: text('status').notNull().default('pending'),
  // 一次性审批令牌与有效期
  reviewToken: text('review_token'),
  tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp_ms' }),
  // 排序权重：数字越大越靠前
  sortOrder: integer('sort_order').notNull().default(0),
  // 掉链标记：0 正常，1 失效
  isBroken: integer('is_broken').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export type FriendLinkRecord = typeof friendLinks.$inferSelect
export type NewFriendLinkRecord = typeof friendLinks.$inferInsert
