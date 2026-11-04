import type { BlogPost } from '@/lib/content'
import type { ManagedPost, ManagedPostList, PostInput } from '@/lib/posts'
import type { AppDatabase } from '@/server/infra/db/client'
import type { PostRecord } from '@/server/infra/db/schema/posts'
import { createHash, randomUUID } from 'node:crypto'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { postInputSchema } from '@/lib/posts'
import { db as defaultDb } from '@/server/infra/db/client'
import { articleSummaries } from '@/server/infra/db/schema/ai'
import { comments } from '@/server/infra/db/schema/comments'
import { posts } from '@/server/infra/db/schema/posts'

export class PostServiceError extends Error {
  statusCode: 400 | 404 | 409 | 413

  constructor(statusCode: 400 | 404 | 409 | 413, message: string) {
    super(message)
    this.statusCode = statusCode
    this.name = 'PostServiceError'
  }
}

function fingerprint(document: unknown): string {
  return createHash('sha256').update(JSON.stringify(document)).digest('hex')
}

function toManagedPost(row: PostRecord): ManagedPost {
  return {
    ...row,
    published: row.published ?? null,
    hasUnpublishedChanges: !row.published || fingerprint(row.document) !== fingerprint(row.published),
  }
}

export function toPublicPost(row: PostRecord): BlogPost | undefined {
  if (!row.published) return undefined
  return { ...row.published, slug: row.slug, commentKey: row.id, draft: false }
}

function parseInput(input: unknown): PostInput {
  const parsed = postInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new PostServiceError(
      400,
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('；'),
    )
  }
  return parsed.data
}

function mapWriteError(error: unknown): never {
  if (
    error instanceof Error &&
    /SQLITE_BUSY|TRANSACTION_ACTIVE|SQLITE_LOCKED/i.test(error.message + String(error.cause))
  ) {
    throw new PostServiceError(409, '文章正在被其他请求修改，请稍后重试')
  }
  if (
    error instanceof Error &&
    /unique constraint|SQLITE_CONSTRAINT_UNIQUE/i.test(`${error.message} ${String(error.cause)}`)
  ) {
    throw new PostServiceError(409, '文章地址已被使用')
  }
  throw error
}

export async function listPublishedSlugs(database: AppDatabase = defaultDb): Promise<string[]> {
  return (await database.select({ slug: posts.slug }).from(posts).where(isNotNull(posts.published))).map(
    (row) => row.slug,
  )
}

export async function listPublishedPosts(database: AppDatabase = defaultDb): Promise<BlogPost[]> {
  const rows = await database.select().from(posts).where(isNotNull(posts.published))
  return rows
    .flatMap((row) => {
      const post = toPublicPost(row)
      return post ? [post] : []
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function findPublishedPost(
  slug: string,
  database: AppDatabase = defaultDb,
): Promise<BlogPost | undefined> {
  const [row] = await database
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), isNotNull(posts.published)))
    .limit(1)
  return row ? toPublicPost(row) : undefined
}

export async function listManagedPosts(database: AppDatabase = defaultDb): Promise<ManagedPost[]> {
  return (await database.select().from(posts).orderBy(desc(posts.updatedAt))).map(toManagedPost)
}

export async function getManagedPost(id: string, database: AppDatabase = defaultDb): Promise<ManagedPost> {
  const [row] = await database.select().from(posts).where(eq(posts.id, id)).limit(1)
  if (!row) throw new PostServiceError(404, '文章不存在')
  return toManagedPost(row)
}

export async function getManagedPostList(
  options: { query?: string; status?: string; page?: number } = {},
  database: AppDatabase = defaultDb,
): Promise<ManagedPostList> {
  const query = options.query?.trim().toLowerCase() ?? ''
  const filtered = (await listManagedPosts(database)).filter((post) => {
    if (options.status === 'draft' && post.published) return false
    if (options.status === 'published' && !post.published) return false
    return !query || `${post.document.title} ${post.slug}`.toLowerCase().includes(query)
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / 20))
  const page = Math.min(totalPages, Math.max(1, options.page ?? 1))
  return { posts: filtered.slice((page - 1) * 20, page * 20), total: filtered.length, page, totalPages }
}

export async function createPost(input: unknown, database: AppDatabase = defaultDb): Promise<ManagedPost> {
  const data = parseInput(input)
  const now = new Date().toISOString()
  try {
    const [row] = await database
      .insert(posts)
      .values({ id: randomUUID(), ...data, createdAt: now, updatedAt: now })
      .returning()
    return toManagedPost(row)
  } catch (error) {
    return mapWriteError(error)
  }
}

export async function savePost(
  id: string,
  revision: number,
  input: unknown,
  database: AppDatabase = defaultDb,
): Promise<ManagedPost> {
  const data = parseInput(input)
  try {
    return await database.transaction(async (tx) => {
      const [current] = await tx.select().from(posts).where(eq(posts.id, id)).limit(1)
      if (!current) throw new PostServiceError(404, '文章不存在')
      if (current.revision !== revision) throw new PostServiceError(409, '文章已在其他页面修改，请重新打开后合并修改')
      if (current.slugLocked && current.slug !== data.slug) throw new PostServiceError(400, '发布过的文章不能修改地址')
      const [row] = await tx
        .update(posts)
        .set({ ...data, revision: revision + 1, updatedAt: new Date().toISOString() })
        .where(and(eq(posts.id, id), eq(posts.revision, revision)))
        .returning()
      if (!row) throw new PostServiceError(409, '文章版本已变化，请重新打开后合并修改')
      return toManagedPost(row)
    })
  } catch (error) {
    return mapWriteError(error)
  }
}

export async function publishPost(
  id: string,
  revision: number,
  database: AppDatabase = defaultDb,
): Promise<ManagedPost> {
  try {
    const current = await getManagedPost(id, database)
    if (current.revision !== revision) throw new PostServiceError(409, '文章版本已变化，请重新预览')
    if (!current.document.title.trim() || !current.document.content.trim())
      throw new PostServiceError(400, '发布前请填写标题和正文')
    try {
      const { validatePostCompilation } = await import('./posts-compile')
      await validatePostCompilation(current.document.content)
    } catch (error) {
      throw new PostServiceError(400, `正文无法发布：${error instanceof Error ? error.message : 'MDX 校验失败'}`)
    }
    const [row] = await database
      .update(posts)
      .set({
        published: current.document,
        publishedRevision: revision,
        slugLocked: true,
        revision: revision + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(posts.id, id), eq(posts.revision, revision)))
      .returning()
    if (!row) throw new PostServiceError(409, '校验期间文章发生变化，请重新预览后发布')
    return toManagedPost(row)
  } catch (error) {
    return mapWriteError(error)
  }
}

export async function withdrawPost(
  id: string,
  revision: number,
  database: AppDatabase = defaultDb,
): Promise<ManagedPost> {
  const [row] = await database
    .update(posts)
    .set({ published: null, publishedRevision: null, revision: revision + 1, updatedAt: new Date().toISOString() })
    .where(and(eq(posts.id, id), eq(posts.revision, revision)))
    .returning()
  if (!row) {
    await getManagedPost(id, database)
    throw new PostServiceError(409, '文章版本已变化，请刷新后重试')
  }
  return toManagedPost(row)
}

export async function deletePost(id: string, revision: number, database: AppDatabase = defaultDb): Promise<void> {
  await database.transaction(async (tx) => {
    const [current] = await tx.select().from(posts).where(eq(posts.id, id)).limit(1)
    if (!current) throw new PostServiceError(404, '文章不存在')
    if (current.revision !== revision) throw new PostServiceError(409, '文章版本已变化，请刷新后重试')
    await tx.delete(comments).where(eq(comments.targetKey, id))
    await tx.delete(articleSummaries).where(eq(articleSummaries.slug, current.slug))
    await tx.delete(posts).where(and(eq(posts.id, id), eq(posts.revision, revision)))
  })
}
