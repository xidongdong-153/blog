import crypto from 'node:crypto'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { getAllBlogPosts, getBlogPost, resolvePostCommentKey } from '@/lib/content'
import { sendCommentNotifyEmail } from '@/lib/email'
import { isSiteAdmin } from '@/server/auth/session'
import { db } from '@/server/infra/db/client'
import { account, user } from '@/server/infra/db/schema/auth'
import { comments } from '@/server/infra/db/schema/comments'

export type CommentSortOrder = 'default' | 'newest' | 'oldest'

export interface CommentAuthor {
  id: string
  name: string
  image: string | null
  providers: string[]
  isOwner: boolean
}

export interface CommentReplyView {
  id: number
  parentId: number
  replyToId: number | null
  replyToUser: {
    id: string
    name: string
  } | null
  author: CommentAuthor
  content: string
  isPinned: boolean
  deleted: boolean
  createdAt: string
  updatedAt: string
}

export interface CommentItemView {
  id: number
  parentId: null
  replyToId: null
  author: CommentAuthor
  content: string
  isPinned: boolean
  deleted: boolean
  createdAt: string
  updatedAt: string
  replies: CommentReplyView[]
}

export interface CommentsResult {
  targetKey: string
  totalCount: number
  comments: CommentItemView[]
  isOwner: boolean
}

export interface CommentDeletePreview {
  id: number
  articleTitle: string
  articleSlug: string
  authorName: string
  contentSnippet: string
  createdAt: string
}

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
      authorEmail: user.email,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .where(eq(comments.targetKey, targetKey))
    .orderBy(desc(comments.createdAt))

  if (allComments.length === 0) {
    return {
      targetKey,
      totalCount: 0,
      comments: [],
      isOwner,
    }
  }

  // 2. 收集所有作者的 userId 并批量查询所有关联 providerId
  const userIds = Array.from(new Set(allComments.map((c) => c.userId)))
  const accounts =
    userIds.length > 0
      ? await db
          .select({ userId: account.userId, providerId: account.providerId })
          .from(account)
          .where(inArray(account.userId, userIds))
      : []

  const userProvidersMap = new Map<string, Set<string>>()
  for (const acc of accounts) {
    if (!userProvidersMap.has(acc.userId)) {
      userProvidersMap.set(acc.userId, new Set())
    }
    userProvidersMap.get(acc.userId)?.add(acc.providerId)
  }

  // 快速映射作者与评论
  const commentsById = new Map<number, (typeof allComments)[0]>()
  for (const item of allComments) {
    commentsById.set(item.id, item)
  }

  // 3. 构建作者视图转换辅助函数
  const toAuthorView = (item: (typeof allComments)[0]): CommentAuthor => {
    const providerSet = userProvidersMap.get(item.userId)
    const providers = providerSet ? Array.from(providerSet).sort() : []
    return {
      id: item.authorId,
      name: item.authorName,
      image: item.authorImage,
      providers,
      isOwner: isSiteAdmin(item.authorEmail),
    }
  }

  // 4. 区分顶级评论和回复
  const topLevelList: (typeof allComments)[0][] = []
  const repliesByParentId = new Map<number, (typeof allComments)[0][]>()

  let validCommentCount = 0

  for (const c of allComments) {
    if (!c.deletedAt) {
      validCommentCount++
    }
    if (c.parentId === null) {
      topLevelList.push(c)
    } else {
      const list = repliesByParentId.get(c.parentId) || []
      list.push(c)
      repliesByParentId.set(c.parentId, list)
    }
  }

  // 5. 回复排序：所有回复恒定按 createdAt 正序（最早发表的在最前）
  for (const [parentId, replyList] of repliesByParentId.entries()) {
    replyList.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    repliesByParentId.set(parentId, replyList)
  }

  // 6. 顶级评论排序
  if (sort === 'oldest') {
    topLevelList.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  } else if (sort === 'newest') {
    topLevelList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } else {
    // default: 置顶优先（按 createdAt 倒序），其余非置顶按 createdAt 倒序
    topLevelList.sort((a, b) => {
      const aPinned = a.isPinned && !a.deletedAt
      const bPinned = b.isPinned && !b.deletedAt
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
  }

  // 7. 组装最终评论树
  const commentsResult: CommentItemView[] = []

  for (const top of topLevelList) {
    const isDeleted = Boolean(top.deletedAt)
    const rawReplies = repliesByParentId.get(top.id) || []

    // 格式化当前讨论下的所有回复
    const formattedReplies: CommentReplyView[] = rawReplies.map((r) => {
      const replyIsDeleted = Boolean(r.deletedAt)
      let replyToUser: { id: string; name: string } | null = null
      if (r.replyToId) {
        const targetComment = commentsById.get(r.replyToId)
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
export async function createComment(params: {
  slug: string
  userId: string
  userEmail: string
  userName: string
  content: string
  replyToId?: number | null
}): Promise<{ id: number; parentId: number | null }> {
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
export async function togglePinComment(
  commentId: number,
  isOwner: boolean,
): Promise<{ id: number; isPinned: boolean }> {
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
export async function softDeleteCommentByOwner(commentId: number, isOwner: boolean): Promise<{ success: boolean }> {
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
export async function confirmDeleteCommentByToken(token: string): Promise<{ success: boolean }> {
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
