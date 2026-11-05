import type { AppDatabase } from '@/server/infra/db/client'
import type { AuthSession } from '@/server/modules/auth/auth.service'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'
import { MAX_IMPORT_BYTES } from '@/lib/posts'
import { getReadySummaryConfig } from '@/server/modules/ai/summary-config.service'
import { generateSummaryForPost } from '@/server/modules/ai/summary.service'
import { getSession, isSiteAdmin } from '@/server/modules/auth/auth.service'
import { createFailureResponse, createSuccessResponse } from '@/server/shared/response'
import { generatePostDraft, PostDraftServiceError } from './posts-draft.service'
import { exportPosts, importPosts, preflightImport } from './posts-transfer'
import {
  createPost,
  deletePost,
  findPublishedPost,
  getManagedPost,
  getManagedPostList,
  PostServiceError,
  publishPost,
  savePost,
  withdrawPost,
} from './posts.service'

const revisionSchema = z.number().int().positive()

export function createPostsRoute(
  options: { database?: AppDatabase; session?: (headers: Headers) => Promise<AuthSession | null> } = {},
) {
  const database = options.database
  const route = new Hono()
  route.use('*', async (c, next) => {
    c.header('Cache-Control', 'private, no-store, max-age=0')
    c.header('X-Robots-Tag', 'noindex, nofollow')
    const session = await (options.session ?? getSession)(c.req.raw.headers)
    if (!session?.user?.id) return c.json(createFailureResponse('请先登录'), 401)
    if (!isSiteAdmin(session.user)) return c.json(createFailureResponse('仅站长可管理文章'), 403)
    if (!['GET', 'HEAD'].includes(c.req.method)) {
      const expectedOrigin = new URL(process.env.BETTER_AUTH_URL || c.req.url).origin
      const origin = c.req.header('Origin')
      if ((origin && origin !== expectedOrigin) || c.req.header('Sec-Fetch-Site') === 'cross-site')
        return c.json(createFailureResponse('请求来源不受支持'), 403)
    }
    await next()
  })
  route.use(
    '*',
    bodyLimit({
      maxSize: MAX_IMPORT_BYTES + 128 * 1024,
      onError: (c) => c.json(createFailureResponse('请求内容过大'), 413),
    }),
  )
  route.onError((error, c) => {
    if (error instanceof PostDraftServiceError) return c.json(createFailureResponse(error.message), error.statusCode)
    if (error instanceof PostServiceError) return c.json(createFailureResponse(error.message), error.statusCode)
    if (error instanceof z.ZodError)
      return c.json(createFailureResponse(error.issues.map((issue) => issue.message).join('；')), 400)
    if (error instanceof SyntaxError) return c.json(createFailureResponse('请求格式无效'), 400)
    console.error('[Posts] 操作失败:', error.name)
    return c.json(createFailureResponse('文章操作失败，请稍后重试'), 500)
  })

  route.get('/', async (c) => {
    const query = z
      .object({
        q: z.string().max(240).optional(),
        status: z.enum(['all', 'draft', 'published']).default('all'),
        page: z.coerce.number().int().min(1).default(1),
      })
      .parse(c.req.query())
    return c.json(
      createSuccessResponse(
        await getManagedPostList({ query: query.q, status: query.status, page: query.page }, database),
      ),
    )
  })
  route.post('/', async (c) => c.json(createSuccessResponse(await createPost(await c.req.json(), database)), 201))

  route.post(
    '/generate-draft',
    bodyLimit({
      maxSize: 32 * 1024,
      onError: (c) => c.json(createFailureResponse('内容概述请求过大'), 413),
    }),
    async (c) =>
      c.json(
        createSuccessResponse(await generatePostDraft(await c.req.json(), { database, signal: c.req.raw.signal })),
      ),
  )

  route.post('/import/preview', async (c) => {
    const form = await c.req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) throw new PostServiceError(400, '请选择导入文件')
    if (file.size > MAX_IMPORT_BYTES) throw new PostServiceError(413, '导入文件不能超过 20 MiB')
    return c.json(
      createSuccessResponse(await preflightImport(file.name, new Uint8Array(await file.arrayBuffer()), database)),
    )
  })
  route.post('/import', async (c) => {
    const body = z
      .object({ posts: z.array(z.unknown()).min(1).max(100) })
      .strict()
      .parse(await c.req.json())
    return c.json(createSuccessResponse({ imported: await importPosts(body.posts, database) }), 201)
  })
  route.get('/export', async (c) => {
    const version = z.enum(['draft', 'published']).parse(c.req.query('version'))
    const result = await exportPosts(version, undefined, database)
    return new Response(Buffer.from(result.data), {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  })
  route.get('/:id', async (c) => c.json(createSuccessResponse(await getManagedPost(c.req.param('id'), database))))
  route.put('/:id', async (c) => {
    const body = z
      .object({ revision: revisionSchema, slug: z.unknown(), document: z.unknown() })
      .strict()
      .parse(await c.req.json())
    return c.json(
      createSuccessResponse(
        await savePost(c.req.param('id'), body.revision, { slug: body.slug, document: body.document }, database),
      ),
    )
  })
  route.post('/:id/publish', async (c) => {
    const { revision } = z
      .object({ revision: revisionSchema })
      .strict()
      .parse(await c.req.json())
    return c.json(createSuccessResponse(await publishPost(c.req.param('id'), revision, database)))
  })
  route.post('/:id/withdraw', async (c) => {
    const { revision } = z
      .object({ revision: revisionSchema })
      .strict()
      .parse(await c.req.json())
    return c.json(createSuccessResponse(await withdrawPost(c.req.param('id'), revision, database)))
  })
  route.delete('/:id', async (c) => {
    const { revision } = z
      .object({ revision: revisionSchema })
      .strict()
      .parse(await c.req.json())
    await deletePost(c.req.param('id'), revision, database)
    return c.json(createSuccessResponse({ deleted: true }))
  })
  route.get('/:id/export', async (c) => {
    const version = z.enum(['draft', 'published']).parse(c.req.query('version'))
    const result = await exportPosts(version, c.req.param('id'), database)
    return new Response(Buffer.from(result.data), {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  })
  route.post('/:id/summary', async (c) => {
    const post = await getManagedPost(c.req.param('id'), database)
    const published = await findPublishedPost(post.slug, database)
    if (!published) throw new PostServiceError(400, '请先发布文章')
    if (published.disableAiSummary) throw new PostServiceError(400, '此文章已关闭 AI 摘要')
    const config = await getReadySummaryConfig(database)
    if (!config) throw new PostServiceError(400, '请先配置并启用 AI 摘要模型')
    await generateSummaryForPost(published, config, { database })
    return c.json(createSuccessResponse({ generated: true }))
  })
  return route
}

export const postsRoute = createPostsRoute()
