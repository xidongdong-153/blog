import type {
  AdminAiServiceStatus,
  AdminContentStats,
  AdminDashboardData,
  AdminEngagementStats,
  AdminPendingFriendLink,
  AdminRecentComment,
  AdminSystemStatus,
  AdminUserSummary,
} from './admin.types'
import type { BlogPost } from '@/lib/content'
import type { AppDatabase } from '@/server/infra/db/client'
import { count, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import { getAllBlogPosts, getAllNotes, resolvePostCommentKey } from '@/lib/content'
import { db as defaultDb } from '@/server/infra/db/client'
import { comments, friendLinks, user } from '@/server/infra/db/schema'
import { getAiSummaryConfig, isAiMasterKeyAvailable } from '@/server/modules/ai/summary-config.service'
import { checkDatabase, getSystemProcessHealth } from '@/server/modules/system/system.service'
import { visitorsService } from '@/server/modules/visitors/visitors.service'

/**
 * 格式化时间为 ISO 字符串
 */
function toIsoString(dateValue: unknown): string {
  if (dateValue instanceof Date) {
    return dateValue.toISOString()
  }
  if (typeof dateValue === 'number' || typeof dateValue === 'string') {
    const d = new Date(dateValue)
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString()
    }
  }
  return new Date().toISOString()
}

/**
 * 获取友链状态与待办队列
 */
async function fetchFriendLinksOverview(targetDb: AppDatabase): Promise<{
  totalFriends: number
  pendingFriendsCount: number
  pendingFriendLinks: AdminPendingFriendLink[]
}> {
  try {
    const [approvedRes, pendingRes, pendingRows] = await Promise.all([
      targetDb.select({ val: count() }).from(friendLinks).where(eq(friendLinks.status, 'approved')),
      targetDb.select({ val: count() }).from(friendLinks).where(eq(friendLinks.status, 'pending')),
      targetDb
        .select({
          id: friendLinks.id,
          name: friendLinks.name,
          url: friendLinks.url,
          ownerName: friendLinks.ownerName,
          email: friendLinks.email,
          description: friendLinks.description,
          hasAddedUs: friendLinks.hasAddedUs,
          reviewToken: friendLinks.reviewToken,
          createdAt: friendLinks.createdAt,
        })
        .from(friendLinks)
        .where(eq(friendLinks.status, 'pending'))
        .orderBy(desc(friendLinks.createdAt))
        .limit(5),
    ])

    const totalFriends = approvedRes[0]?.val ?? 0
    const pendingFriendsCount = pendingRes[0]?.val ?? 0

    const pendingFriendLinks: AdminPendingFriendLink[] = pendingRows.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      ownerName: row.ownerName,
      email: row.email,
      description: row.description,
      hasAddedUs: Boolean(row.hasAddedUs),
      reviewToken: row.reviewToken,
      createdAt: toIsoString(row.createdAt),
    }))

    return { totalFriends, pendingFriendsCount, pendingFriendLinks }
  } catch (err) {
    console.error('[AdminService] 获取友链信息失败:', err)
    return { totalFriends: 0, pendingFriendsCount: 0, pendingFriendLinks: [] }
  }
}

/**
 * 获取全站评论统计与最新动态流
 */
async function fetchCommentsOverview(
  targetDb: AppDatabase,
  allPosts: BlogPost[],
): Promise<{
  totalComments: number
  activeComments: number
  deletedComments: number
  recentComments: AdminRecentComment[]
}> {
  try {
    const [totalRes, deletedRes, recentRows] = await Promise.all([
      targetDb.select({ val: count() }).from(comments),
      targetDb.select({ val: count() }).from(comments).where(isNotNull(comments.deletedAt)),
      targetDb
        .select({
          id: comments.id,
          targetKey: comments.targetKey,
          content: comments.content,
          isPinned: comments.isPinned,
          createdAt: comments.createdAt,
          authorName: user.name,
          authorImage: user.image,
        })
        .from(comments)
        .innerJoin(user, eq(comments.userId, user.id))
        .where(isNull(comments.deletedAt))
        .orderBy(desc(comments.createdAt))
        .limit(5),
    ])

    const totalComments = totalRes[0]?.val ?? 0
    const deletedComments = deletedRes[0]?.val ?? 0
    const activeComments = Math.max(0, totalComments - deletedComments)

    const recentComments: AdminRecentComment[] = recentRows.map((row) => {
      const matchedPost = allPosts.find((p) => resolvePostCommentKey(p) === row.targetKey)
      const contentSnippet = row.content.length > 80 ? `${row.content.slice(0, 80)}...` : row.content

      return {
        id: row.id,
        targetKey: row.targetKey,
        postTitle: matchedPost?.title ?? '未知文章',
        postSlug: matchedPost?.slug ?? '',
        authorName: row.authorName?.trim() || '访客',
        authorImage: row.authorImage ?? null,
        contentSnippet,
        createdAt: toIsoString(row.createdAt),
        isPinned: Boolean(row.isPinned),
      }
    })

    return { totalComments, activeComments, deletedComments, recentComments }
  } catch (err) {
    console.error('[AdminService] 获取评论信息失败:', err)
    return { totalComments: 0, activeComments: 0, deletedComments: 0, recentComments: [] }
  }
}

/**
 * 统计全站 MDX 内容与资产
 */
function fetchContentOverview(posts: BlogPost[]): AdminContentStats {
  const notes = getAllNotes()
  const publishedPosts = posts.filter((p) => !p.draft).length
  const draftPosts = posts.filter((p) => Boolean(p.draft)).length

  const categoryDistribution: Record<string, number> = {}
  for (const post of posts) {
    const category = post.category || 'other'
    categoryDistribution[category] = (categoryDistribution[category] || 0) + 1
  }

  return {
    totalPosts: posts.length,
    publishedPosts,
    draftPosts,
    totalNotes: notes.length,
    categoryDistribution,
  }
}

/**
 * 聚合管理面板所需的全部大盘数据
 */
export async function getAdminDashboardData(
  currentUser?: { name?: string | null; email?: string | null; image?: string | null },
  options?: { customDb?: AppDatabase },
): Promise<AdminDashboardData> {
  const targetDb = options?.customDb ?? defaultDb
  const allPosts = getAllBlogPosts()

  const [dbResult, aiConfigResult, visitorStats, linksOverview, commentsOverview] = await Promise.all([
    checkDatabase({ customDb: targetDb }).catch(() => ({
      status: 'error' as const,
      operationalStatus: 'degraded' as const,
      latencyMs: -1,
      provider: (process.env.TURSO_DATABASE_URL ? 'turso' : 'local-sqlite') as 'turso' | 'local-sqlite',
      message: '连接失败',
    })),
    getAiSummaryConfig({ database: targetDb }).catch(() => null),
    visitorsService.getStats().catch(() => ({
      status: 'degraded' as const,
      uniqueVisitorCount: null,
      onlineVisitorCount: 0,
      articleViewerCounts: {},
    })),
    fetchFriendLinksOverview(targetDb),
    fetchCommentsOverview(targetDb, allPosts),
  ])

  const processHealth = getSystemProcessHealth()
  const contentStats = fetchContentOverview(allPosts)

  const adminUser: AdminUserSummary = {
    name: currentUser?.name?.trim() || '站长',
    email: currentUser?.email?.trim() || '',
    image: currentUser?.image || null,
  }

  const system: AdminSystemStatus = {
    nodeVersion: processHealth.nodeVersion,
    platform: processHealth.platform,
    uptimeSeconds: processHealth.uptime,
    dbLatencyMs: dbResult.latencyMs,
    dbStatus: dbResult.status === 'connected' ? 'connected' : 'error',
    dbProvider: dbResult.provider,
  }

  const aiService: AdminAiServiceStatus = {
    masterKeyConfigured: aiConfigResult?.masterKeyAvailable ?? isAiMasterKeyAvailable(),
    status: !aiConfigResult?.hasCredential
      ? 'no_credential'
      : aiConfigResult.status === 'ready'
        ? 'ready'
        : 'needs_check',
    modelId: aiConfigResult?.modelId || '',
    protocol: aiConfigResult?.protocol || 'openai-completions',
  }

  const engagement: AdminEngagementStats = {
    totalComments: commentsOverview.totalComments,
    activeComments: commentsOverview.activeComments,
    deletedComments: commentsOverview.deletedComments,
    totalFriends: linksOverview.totalFriends,
    pendingFriendsCount: linksOverview.pendingFriendsCount,
    onlineVisitorsCount: visitorStats.onlineVisitorCount,
    uniqueVisitorsCount: visitorStats.uniqueVisitorCount,
  }

  return {
    adminUser,
    system,
    content: contentStats,
    engagement,
    aiService,
    pendingFriendLinks: linksOverview.pendingFriendLinks,
    recentComments: commentsOverview.recentComments,
  }
}
