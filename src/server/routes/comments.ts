import type { Context } from 'hono'
import type { CommentSortOrder } from '@/server/services/comments'
import { Hono } from 'hono'
import { getSession, isSiteAdmin } from '@/server/auth/session'
import {
  CommentServiceError,
  confirmDeleteCommentByToken,
  createComment,
  getCommentDeletePreviewByToken,
  getCommentsBySlug,
  softDeleteCommentByOwner,
  togglePinComment,
} from '@/server/services/comments'
import { createFailureResponse, createSuccessResponse } from '@/server/shared/response'

export const commentsRoute = new Hono()

function sanitizeErrorLog(err: unknown): string {
  return err instanceof Error ? err.name || 'Error' : typeof err
}

/**
 * 辅助函数：统一处理服务层异常
 */
function handleServiceError(c: Context, err: unknown) {
  if (err instanceof CommentServiceError) {
    return c.json(createFailureResponse(err.message), err.statusCode)
  }
  console.error('[Comments API] 未捕获服务异常:', sanitizeErrorLog(err))
  return c.json(createFailureResponse('服务器内部错误，请稍后重试'), 500)
}

/**
 * GET /api/comments/delete?token=<token>
 * 邮件一次性凭证删除预览（只读，不执行删除）
 */
commentsRoute.get('/delete', async (c) => {
  try {
    const token = c.req.query('token')
    if (!token) {
      return c.json(createFailureResponse('缺少删除凭证 token'), 400)
    }

    const preview = await getCommentDeletePreviewByToken(token)
    return c.json(createSuccessResponse(preview))
  } catch (err) {
    return handleServiceError(c, err)
  }
})

/**
 * POST /api/comments/delete
 * 凭邮件一次性凭证确认软删除评论
 */
commentsRoute.post('/delete', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    if (!token) {
      return c.json(createFailureResponse('缺少删除凭证 token'), 400)
    }

    const result = await confirmDeleteCommentByToken(token)
    return c.json(createSuccessResponse(result))
  } catch (err) {
    return handleServiceError(c, err)
  }
})

/**
 * GET /api/comments?slug=<slug>&sort=default|newest|oldest
 * 公开读取指定文章的评论树
 */
commentsRoute.get('/', async (c) => {
  try {
    const slug = c.req.query('slug')
    if (!slug) {
      return c.json(createFailureResponse('缺少文章标识 slug 参数'), 400)
    }

    const rawSort = c.req.query('sort')
    const sort: CommentSortOrder =
      rawSort === 'newest' || rawSort === 'oldest' || rawSort === 'default' ? rawSort : 'default'

    const session = await getSession(c.req.raw.headers)
    const result = await getCommentsBySlug(slug, sort, session?.user?.email)

    return c.json(createSuccessResponse(result))
  } catch (err) {
    return handleServiceError(c, err)
  }
})

/**
 * POST /api/comments
 * 登录用户提交新评论或回复
 */
commentsRoute.post('/', async (c) => {
  try {
    const session = await getSession(c.req.raw.headers)
    if (!session?.user?.id) {
      return c.json(createFailureResponse('请先登录后再发表评论'), 401)
    }

    const body = await c.req.json().catch(() => ({}))
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''
    const content = typeof body?.content === 'string' ? body.content : ''
    const replyToId = typeof body?.replyToId === 'number' ? body.replyToId : null

    if (!slug) {
      return c.json(createFailureResponse('缺少文章标识 slug'), 400)
    }

    if (!content.trim()) {
      return c.json(createFailureResponse('评论内容不能为空'), 400)
    }

    const result = await createComment({
      slug,
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      content,
      replyToId,
    })

    return c.json(createSuccessResponse(result), 201)
  } catch (err) {
    return handleServiceError(c, err)
  }
})

/**
 * PATCH /api/comments/:id/pin
 * 站长置顶或取消置顶顶级评论
 */
commentsRoute.patch('/:id/pin', async (c) => {
  try {
    const session = await getSession(c.req.raw.headers)
    if (!session?.user?.id) {
      return c.json(createFailureResponse('未登录'), 401)
    }

    const isOwner = isSiteAdmin(session.user.email)
    if (!isOwner) {
      return c.json(createFailureResponse('无权进行此操作，仅站长可置顶评论'), 403)
    }

    const id = Number.parseInt(c.req.param('id'), 10)
    if (Number.isNaN(id)) {
      return c.json(createFailureResponse('无效的评论 ID'), 400)
    }

    const result = await togglePinComment(id, true)
    return c.json(createSuccessResponse(result))
  } catch (err) {
    return handleServiceError(c, err)
  }
})

/**
 * DELETE /api/comments/:id
 * 站长通过 session 软删除评论
 */
commentsRoute.delete('/:id', async (c) => {
  try {
    const session = await getSession(c.req.raw.headers)
    if (!session?.user?.id) {
      return c.json(createFailureResponse('未登录'), 401)
    }

    const isOwner = isSiteAdmin(session.user.email)
    if (!isOwner) {
      return c.json(createFailureResponse('无权进行此操作，仅站长可删除评论'), 403)
    }

    const id = Number.parseInt(c.req.param('id'), 10)
    if (Number.isNaN(id)) {
      return c.json(createFailureResponse('无效的评论 ID'), 400)
    }

    const result = await softDeleteCommentByOwner(id, true)
    return c.json(createSuccessResponse(result))
  } catch (err) {
    return handleServiceError(c, err)
  }
})
