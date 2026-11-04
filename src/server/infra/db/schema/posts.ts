import type { PostDocument } from '@/lib/posts'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const posts = sqliteTable(
  'site_posts',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    document: text('document', { mode: 'json' }).$type<PostDocument>().notNull(),
    published: text('published', { mode: 'json' }).$type<PostDocument | null>(),
    revision: integer('revision').notNull().default(1),
    publishedRevision: integer('published_revision'),
    slugLocked: integer('slug_locked', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('posts_updated_at_idx').on(table.updatedAt)],
)

export type PostRecord = typeof posts.$inferSelect
