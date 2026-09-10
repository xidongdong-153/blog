import type {
  CommentAuthor,
  CommentDeletePreview,
  CommentItemView,
  CommentReplyView,
  CommentSortOrder,
  CommentsResult,
  CreateCommentInput,
  CreateCommentResult,
  DeleteCommentResult,
  TogglePinResult,
} from './comments.types'
import crypto from 'node:crypto'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { getAllBlogPosts, getBlogPost, resolvePostCommentKey } from '@/lib/content'
import { db } from '@/server/infra/db/client'
import { account, user } from '@/server/infra/db/schema/auth'
import { comments } from '@/server/infra/db/schema/comments'
import { sendCommentNotifyEmail } from '@/server/infra/email'
import { isSiteAdmin } from '@/server/modules/auth/auth.service'

export class CommentServiceError extends Error {
  statusCode: 400 | 401 | 403 | 404 | 500

  constructor(statusCode: 400 | 401 | 403 | 404 | 500, message: string) {
    super(message)
    this.name = 'CommentServiceError'
    this.statusCode = statusCode
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex')
}

/**
 * 根据文章 slug 与排序规则查询评论树。
 */
export async function getCommentsBySlug(
  slug: string,
  sort: CommentSortOrder = 'default',
  currentUserEmail?: string | null,
): Promise<CommentsResult> {
  const post = getBlogPost(slug)
  if (!post) {
    throw new CommentServiceError(404, `文章不存在: ${slug}`)
  }

  const targetKey = resolvePostCommentKey(post)
  const isOwner = isSiteAdmin(currentUserEmail)

  // 1. 获取该文章下的所有评论
  const allComments = await db
    .select({
      id: comments.id,
      targetKey: comments.targetKey,
      parentId: comments.parentId,
      replyToId: comments.replyToId,
      userId: comments.userId,
      content: comments.content,
      isPinned: comments.isPinned,
      deletedAt: comments.deletedAt,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .where(eq(comments.targetKey, targetKey))

  // 2. 获取涉及的所有用户的 OAuth Providers
  const userIds = Array.from(new Set(allComments.map((c) => c.userId)))
  const userProvidersMap = new Map<string, string[]>()

  if (userIds.length > 0) {
    const accounts = await db
      .select({
        userId: account.userId,
        providerId: account.providerId,
      })
      .from(account)
      .where(inArray(account.userId, userIds))

    for (const acc of accounts) {
      const list = userProvidersMap.get(acc.userId) || []
      list.push(acc.providerId)
      userProvidersMap.set(acc.userId, list)
    }
  }

  // 构建作者视图对象工具函数
  const toAuthorView = (c: (typeof allComments)[0]): CommentAuthor => {
    const rawProviders = userProvidersMap.get(c.userId) || []
    return {
      id: c.authorId,
      name: c.authorName,
      image: c.authorImage,
      providers: Array.from(new Set(rawProviders)).sort(),
      isOwner: isSiteAdmin(c.authorName === '站长本人' ? process.env.ADMIN_EMAIL : undefined),
    }
  }

  // 3. 评论统计与树形组装
  const topLevelComments: typeof allComments = []
  const repliesByParentId = new Map<number, typeof allComments>()

  let validCommentCount = 0

  for (const c of allComments) {
    if (!c.deletedAt) {
      validCommentCount++
    }

    if (c.parentId === null) {
      topLevelComments.push(c)
    } else {
      const list = repliesByParentId.get(c.parentId) || []
      list.push(c)
      repliesByParentId.set(c.parentId, list)
    }
  }

  // 4. 顶级评论排序
  topLevelComments.sort((a, b) => {
    // 仅 default 模式下置顶优先
    if (sort === 'default') {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
    }

    // 默认或最新：按创建时间倒序（最新在前）
    if (sort === 'default' || sort === 'newest') {
      return b.createdAt.getTime() - a.createdAt.getTime()
    }
    // 最早：按创建时间正序
    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  // 5. 组装最终嵌套视图
  const commentsResult: CommentItemView[] = []

  // 建立 ID 到单条评论的快速映射用于解析 replyToAuthorName
  const allCommentsById = new Map<number, (typeof allComments)[0]>()
  for (const c of allComments) {
    allCommentsById.set(c.id, c)
  }

  for (const top of topLevelComments) {
    const isDeleted = Boolean(top.deletedAt)
    const replies = repliesByParentId.get(top.id) || []

    // 回复列表按时间正序排列（最旧在先，按对话脉络递进）
    replies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    const formattedReplies: CommentReplyView[] = replies.map((r) => {
      const replyIsDeleted = Boolean(r.deletedAt)
      let replyToUser: { id: string; name: string } | null = null

      if (r.replyToId) {
        const targetComment = allCommentsById.get(r.replyToId)
        if (targetComment) {
          replyToUser = {
            id: targetComment.authorId,
            name: targetComment.authorName,
          }
        }
      }

      return {
        id: r.id,
        parentId: r.parentId!,
        replyToId: r.replyToId,
        replyToUser,
        author: toAuthorView(r),
        content: replyIsDeleted ? '' : r.content,
        isPinned: false,
        deleted: replyIsDeleted,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }
    })

    // 如果顶级评论已删除且没有任何回复，仍然保留删除占位卡片让读者知晓上下文
    commentsResult.push({
      id: top.id,
      parentId: null,
      replyToId: null,
      author: toAuthorView(top),
      content: isDeleted ? '' : top.content,
      isPinned: isDeleted ? false : top.isPinned,
      deleted: isDeleted,
      createdAt: top.createdAt.toISOString(),
      updatedAt: top.updatedAt.toISOString(),
      replies: formattedReplies,
    })
  }

  return {
    targetKey,
    totalCount: validCommentCount,
    comments: commentsResult,
    isOwner,
  }
}

/**
 * 创建新评论或回复。
 */
export async function createComment(params: CreateCommentInput): Promise<CreateCommentResult> {
  const post = getBlogPost(params.slug)
  if (!post) {
    throw new CommentServiceError(404, `文章不存在: ${params.slug}`)
  }

  const targetKey = resolvePostCommentKey(post)
  const trimmed = params.content.trim()

  if (trimmed.length < 1 || trimmed.length > 1000) {
    throw new CommentServiceError(400, '评论内容去除首尾空白后长度需在 1 到 1000 字之间')
  }

  let resolvedParentId: number | null = null
  let resolvedReplyToId: number | null = null
  let replyToAuthorName: string | undefined

  if (params.replyToId) {
    const targetComment = await db
      .select({
        id: comments.id,
        targetKey: comments.targetKey,
        parentId: comments.parentId,
        deletedAt: comments.deletedAt,
        authorName: user.name,
      })
      .from(comments)
      .innerJoin(user, eq(comments.userId, user.id))
      .where(eq(comments.id, params.replyToId))
      .get()

    if (!targetComment || targetComment.targetKey !== targetKey) {
      throw new CommentServiceError(400, '回复的目标评论不存在或不属于当前文章')
    }

    if (targetComment.deletedAt) {
      throw new CommentServiceError(400, '不能回复已被删除的评论')
    }

    replyToAuthorName = targetComment.authorName

    // 核心平铺逻辑：所有回复的 parentId 指向顶级评论
    if (targetComment.parentId === null) {
      // 目标是顶级评论：parentId 为该评论 ID，replyToId 置空
      resolvedParentId = targetComment.id
      resolvedReplyToId = null
    } else {
      // 目标本身是回复：parentId 为顶层评论 ID，replyToId 指向被回复的单条评论
      resolvedParentId = targetComment.parentId
      resolvedReplyToId = targetComment.id
    }
  }

  // 生成 32 字节删除 Token 并计算 SHA-256 哈希
  const rawDeleteToken = crypto.randomBytes(32).toString('hex')
  const deleteTokenHash = hashToken(rawDeleteToken)
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 天有效期
  const now = new Date()

  const [inserted] = await db
    .insert(comments)
    .values({
      targetKey,
      parentId: resolvedParentId,
      replyToId: resolvedReplyToId,
      userId: params.userId,
      content: trimmed,
      isPinned: false,
      deleteTokenHash,
      tokenExpiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: comments.id })

  // 异步发送邮件提醒站长，失败不回滚评论创建
  void sendCommentNotifyEmail({
    articleTitle: post.title,
    articleSlug: post.slug,
    authorName: params.userName,
    authorEmail: params.userEmail,
    content: trimmed,
    createdAt: now,
    isReply: Boolean(resolvedParentId),
    replyToAuthorName,
    deleteToken: rawDeleteToken,
  }).catch((err) => {
    console.error('[CommentNotify Email] 异步发送通知失败:', err instanceof Error ? err.name : 'UnknownError')
  })

  return {
    id: inserted.id,
    parentId: resolvedParentId,
  }
}

/**
 * 站长切换置顶状态（仅限顶级评论）。
 */
export async function togglePinComment(commentId: number, isOwner: boolean): Promise<TogglePinResult> {
  if (!isOwner) {
    throw new CommentServiceError(403, '无权进行此操作，仅站长可置顶评论')
  }

  const comment = await db
    .select({
      id: comments.id,
      parentId: comments.parentId,
      isPinned: comments.isPinned,
      deletedAt: comments.deletedAt,
    })
    .from(comments)
    .where(eq(comments.id, commentId))
    .get()

  if (!comment) {
    throw new CommentServiceError(404, '评论不存在')
  }

  if (comment.deletedAt) {
    throw new CommentServiceError(400, '已被删除的评论无法置顶')
  }

  if (comment.parentId !== null) {
    throw new CommentServiceError(400, '只有顶级评论可以置顶')
  }

  const nextPinned = !comment.isPinned
  await db
    .update(comments)
    .set({
      isPinned: nextPinned,
      updatedAt: new Date(),
    })
    .where(eq(comments.id, commentId))

  return { id: comment.id, isPinned: nextPinned }
}

/**
 * 站长软删除评论。
 */
export async function softDeleteCommentByOwner(commentId: number, isOwner: boolean): Promise<DeleteCommentResult> {
  if (!isOwner) {
    throw new CommentServiceError(403, '无权进行此操作，仅站长可删除评论')
  }

  const comment = await db
    .select({
      id: comments.id,
      deletedAt: comments.deletedAt,
    })
    .from(comments)
    .where(eq(comments.id, commentId))
    .get()

  if (!comment) {
    throw new CommentServiceError(404, '评论不存在')
  }

  if (comment.deletedAt) {
    return { success: true }
  }

  await db
    .update(comments)
    .set({
      content: '',
      isPinned: false,
      deleteTokenHash: null,
      tokenExpiresAt: null,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(comments.id, commentId))

  return { success: true }
}

/**
 * 使用邮件删除 Token 查询确认信息（GET 只读接口，不执行任何写操作）。
 */
export async function getCommentDeletePreviewByToken(token: string): Promise<CommentDeletePreview> {
  if (!token || token.trim() === '') {
    throw new CommentServiceError(400, '缺少删除凭证')
  }

  const hashed = hashToken(token)
  const comment = await db
    .select({
      id: comments.id,
      targetKey: comments.targetKey,
      content: comments.content,
      tokenExpiresAt: comments.tokenExpiresAt,
      deletedAt: comments.deletedAt,
      createdAt: comments.createdAt,
      authorName: user.name,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .where(and(eq(comments.deleteTokenHash, hashed), isNull(comments.deletedAt)))
    .get()

  if (!comment) {
    throw new CommentServiceError(404, '删除凭证无效、已使用或评论已被删除')
  }

  if (
    !comment.tokenExpiresAt ||
    Number.isNaN(comment.tokenExpiresAt.getTime()) ||
    comment.tokenExpiresAt < new Date()
  ) {
    throw new CommentServiceError(400, '删除凭证已过期或无效')
  }

  // 根据 targetKey 查找文章标题和 slug
  const allPosts = getAllBlogPosts()
  const matchedPost = allPosts.find((p) => resolvePostCommentKey(p) === comment.targetKey)

  const snippet = comment.content.length > 80 ? `${comment.content.slice(0, 80)}...` : comment.content

  return {
    id: comment.id,
    articleTitle: matchedPost?.title || '未知文章',
    articleSlug: matchedPost?.slug || '',
    authorName: comment.authorName,
    contentSnippet: snippet,
    createdAt: comment.createdAt.toISOString(),
  }
}

/**
 * 使用邮件删除 Token 确认执行软删除（POST 写入操作）。
 */
export async function confirmDeleteCommentByToken(token: string): Promise<DeleteCommentResult> {
  if (!token || token.trim() === '') {
    throw new CommentServiceError(400, '缺少删除凭证')
  }

  const hashed = hashToken(token)
  const comment = await db
    .select({
      id: comments.id,
      tokenExpiresAt: comments.tokenExpiresAt,
      deletedAt: comments.deletedAt,
    })
    .from(comments)
    .where(and(eq(comments.deleteTokenHash, hashed), isNull(comments.deletedAt)))
    .get()

  if (!comment) {
    throw new CommentServiceError(404, '删除凭证无效、已使用或评论已被删除')
  }

  if (
    !comment.tokenExpiresAt ||
    Number.isNaN(comment.tokenExpiresAt.getTime()) ||
    comment.tokenExpiresAt < new Date()
  ) {
    throw new CommentServiceError(400, '删除凭证已过期或无效')
  }

  await db
    .update(comments)
    .set({
      content: '',
      isPinned: false,
      deleteTokenHash: null,
      tokenExpiresAt: null,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(comments.id, comment.id))

  return { success: true }
}
