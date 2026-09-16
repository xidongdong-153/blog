export interface AdminUserSummary {
  name: string
  email: string
  image?: string | null
}

export interface AdminSystemStatus {
  nodeVersion: string
  platform: string
  uptimeSeconds: number
  dbLatencyMs: number
  dbStatus: 'connected' | 'error'
  dbProvider: 'turso' | 'local-sqlite'
}

export interface AdminContentStats {
  totalPosts: number
  publishedPosts: number
  draftPosts: number
  totalNotes: number
  categoryDistribution: Record<string, number>
}

export interface AdminEngagementStats {
  totalComments: number
  activeComments: number
  deletedComments: number
  totalFriends: number
  pendingFriendsCount: number
  onlineVisitorsCount: number
  uniqueVisitorsCount: number | null
}

export interface AdminAiServiceStatus {
  masterKeyConfigured: boolean
  status: 'ready' | 'needs_check' | 'no_credential'
  modelId: string
  protocol: string
}

export interface AdminPendingFriendLink {
  id: number
  name: string
  url: string
  ownerName: string
  email: string
  description: string
  hasAddedUs: boolean
  reviewToken: string | null
  createdAt: string
}

export interface AdminRecentComment {
  id: number
  targetKey: string
  postTitle: string
  postSlug: string
  authorName: string
  authorImage: string | null
  contentSnippet: string
  createdAt: string
  isPinned: boolean
}

export interface AdminDashboardData {
  /** 站长个人信息摘要 */
  adminUser: AdminUserSummary
  /** 系统运行环境指标 */
  system: AdminSystemStatus
  /** 全站内容与资产统计 */
  content: AdminContentStats
  /** 社交与互动数据 */
  engagement: AdminEngagementStats
  /** AI 服务就绪状态 */
  aiService: AdminAiServiceStatus
  /** 待办队列：待审核友链 (至多 5 条) */
  pendingFriendLinks: AdminPendingFriendLink[]
  /** 动态流：全站最新评论 (至多 5 条) */
  recentComments: AdminRecentComment[]
}
