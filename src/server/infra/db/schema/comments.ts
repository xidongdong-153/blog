import { relations } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './auth'

export const comments = sqliteTable(
  'site_comments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    targetKey: text('target_key').notNull(),
    parentId: integer('parent_id'),
    replyToId: integer('reply_to_id'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
    deleteTokenHash: text('delete_token_hash'),
    tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp_ms' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('comments_target_key_idx').on(table.targetKey),
    index('comments_parent_id_idx').on(table.parentId),
    index('comments_user_id_idx').on(table.userId),
  ],
)

export const commentsRelations = relations(comments, ({ one, many }) => ({
  author: one(user, {
    fields: [comments.userId],
    references: [user.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'commentReplies',
  }),
  replyTo: one(comments, {
    fields: [comments.replyToId],
    references: [comments.id],
    relationName: 'commentReplyTarget',
  }),
  replies: many(comments, {
    relationName: 'commentReplies',
  }),
}))

export type CommentRecord = typeof comments.$inferSelect
export type NewCommentRecord = typeof comments.$inferInsert
