import { eq } from 'drizzle-orm'
import { postDocumentSchema } from '@/lib/posts'
import { db } from '@/server/infra/db/client'
import { posts } from '@/server/infra/db/schema/posts'

/** 创建数据库测试文章，公开版本与工作稿使用相同内容。 */
export async function createBlogPostFixture(
  slug: string,
  options?: { frontmatter?: Record<string, unknown>; content?: string; directory?: 'blog' | 'drafts' },
): Promise<() => Promise<void>> {
  const { draft, ...fields } = options?.frontmatter ?? {}
  const document = postDocumentSchema.parse({
    title: '测试文章',
    date: '2026-10-09',
    category: 'tech',
    description: '测试用文章',
    ...fields,
    aiGenerated: fields.aiGenerated === true,
    content: options?.content ?? '\n测试正文。\n',
  })
  const now = new Date().toISOString()
  const unpublished = draft === true || options?.directory === 'drafts'
  await db.insert(posts).values({
    id: slug,
    slug,
    document,
    published: unpublished ? null : document,
    publishedRevision: unpublished ? null : 1,
    slugLocked: !unpublished,
    createdAt: now,
    updatedAt: now,
  })
  return async () => {
    await db.delete(posts).where(eq(posts.id, slug))
  }
}
