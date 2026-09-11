import type {
  AppDatabase,
  Clock,
  ViewerSession,
  VisitorBootstrapResponse,
  VisitorSnapshotMessage,
  VisitorsServiceDeps,
  VisitorStatsResponse,
} from './visitors.types'
import { randomUUID } from 'node:crypto'
import { count } from 'drizzle-orm'
import { isValidVisitorUuid, VISITOR_SESSION_TTL_MS } from '@/lib/visitor'
import { db as defaultDb } from '@/server/infra/db/client'
import { visitorRecords } from '@/server/infra/db/schema/visitors'
import { VisitorsServiceError } from './visitors.types'

const defaultClock: Clock = {
  now: () => Date.now(),
}

/**
 * 访客统计与在线状态业务服务。
 * 负责匿名访客持久化登记、内存会话生命周期维护及公开状态快照计算。
 */
export class VisitorsService {
  private db: AppDatabase
  private clock: Clock
  private uuidGenerator: () => string
  private sessions = new Map<string, ViewerSession>()
  private cachedUniqueVisitorCount: number | null = null

  constructor(deps?: VisitorsServiceDeps) {
    this.db = deps?.db ?? defaultDb
    this.clock = deps?.clock ?? defaultClock
    this.uuidGenerator = deps?.uuidGenerator ?? randomUUID
  }

  /**
   * 匿名访客首次访问或续期登记。
   * 仅持久化存储随机 visitorId 与首次访问时间戳，不保存 IP 或任何隐私信息。
   */
  async bootstrapVisitor(cookieVisitorId?: string | null): Promise<{
    visitorId: string
    isNew: boolean
    response: VisitorBootstrapResponse
  }> {
    let visitorId = cookieVisitorId?.trim()
    if (visitorId?.startsWith('"') && visitorId.endsWith('"')) {
      visitorId = visitorId.slice(1, -1)
    }
    let isNew = false

    if (!isValidVisitorUuid(visitorId)) {
      visitorId = this.uuidGenerator()
      isNew = true
    }

    try {
      if (isNew) {
        await this.db
          .insert(visitorRecords)
          .values({
            visitorId,
            firstSeenAt: new Date(this.clock.now()),
          })
          .onConflictDoNothing()
      }

      if (this.cachedUniqueVisitorCount === null || isNew) {
        const result = await this.db.select({ total: count() }).from(visitorRecords)
        const totalCount = result[0]?.total ?? 0
        this.cachedUniqueVisitorCount = totalCount
      }

      return {
        visitorId,
        isNew,
        response: {
          status: 'ready',
          uniqueVisitorCount: this.cachedUniqueVisitorCount ?? 0,
        },
      }
    } catch (err) {
      console.error('[VisitorsService] 访客登记失败:', err)
      throw new VisitorsServiceError('service_unavailable', 503, '访客服务暂不可用')
    }
  }

  /** 清理超过租约时长的过期会话 */
  cleanupExpiredSessions(): number {
    const now = this.clock.now()
    let removedCount = 0
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastSeenAt + VISITOR_SESSION_TTL_MS <= now) {
        this.sessions.delete(sessionId)
        removedCount++
      }
    }
    return removedCount
  }

  /**
   * 登记或更新页面会话。
   * 若同一 sessionId 存在旧连接，覆盖为新 connectionId 并刷新心跳。
   */
  registerSession(params: {
    sessionId: string
    connectionId: string
    visitorId: string
    articleSlug: string | null
  }): void {
    this.cleanupExpiredSessions()
    this.sessions.set(params.sessionId, {
      ...params,
      lastSeenAt: this.clock.now(),
    })
  }

  /**
   * 客户端心跳续期。
   * 必须校验 connectionId，防止已被新连接替换的旧连接延迟心跳覆盖。
   */
  heartbeatSession(sessionId: string, connectionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session || session.connectionId !== connectionId) {
      return false
    }
    session.lastSeenAt = this.clock.now()
    return true
  }

  /**
   * 移除会话。
   * 传入 connectionId 时仅在连接实例匹配时才删除，防止重连期间新连接被旧连接 close 事件误删。
   */
  removeSession(sessionId: string, connectionId?: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false
    if (connectionId && session.connectionId !== connectionId) {
      return false
    }
    this.sessions.delete(sessionId)
    return true
  }

  /** 按连接 ID 移除其名下的所有会话（连接异常中断或关闭时使用） */
  removeSessionsByConnectionId(connectionId: string): number {
    let count = 0
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.connectionId === connectionId) {
        this.sessions.delete(sessionId)
        count++
      }
    }
    return count
  }

  /** 获取当前所有有效会话数量（包含未去重的 session 记录） */
  getActiveSessionCount(): number {
    this.cleanupExpiredSessions()
    return this.sessions.size
  }

  /**
   * 计算公开状态快照。
   * 在线访客数按 visitorId 去重；每篇文章的在线人数按 visitorId + articleSlug 去重。
   */
  async getPublicSnapshot(): Promise<VisitorSnapshotMessage> {
    this.cleanupExpiredSessions()

    const onlineVisitors = new Set<string>()
    const articleVisitorsMap = new Map<string, Set<string>>()

    for (const session of this.sessions.values()) {
      onlineVisitors.add(session.visitorId)
      if (session.articleSlug) {
        let set = articleVisitorsMap.get(session.articleSlug)
        if (!set) {
          set = new Set<string>()
          articleVisitorsMap.set(session.articleSlug, set)
        }
        set.add(session.visitorId)
      }
    }

    const articleViewerCounts: Record<string, number> = {}
    for (const [slug, set] of articleVisitorsMap.entries()) {
      if (set.size > 0) {
        articleViewerCounts[slug] = set.size
      }
    }

    let uniqueVisitorCount = this.cachedUniqueVisitorCount
    let status: 'ready' | 'degraded' = 'ready'

    if (uniqueVisitorCount === null) {
      try {
        const result = await this.db.select({ total: count() }).from(visitorRecords)
        uniqueVisitorCount = result[0]?.total ?? 0
        this.cachedUniqueVisitorCount = uniqueVisitorCount
      } catch {
        status = 'degraded'
        uniqueVisitorCount = null
      }
    }

    return {
      type: 'snapshot',
      status,
      uniqueVisitorCount,
      onlineVisitorCount: onlineVisitors.size,
      articleViewerCounts,
    }
  }

  /** 获取公开只读统计 */
  async getStats(targetSlug?: string): Promise<VisitorStatsResponse> {
    const snapshot = await this.getPublicSnapshot()
    if (targetSlug) {
      return {
        status: snapshot.status,
        uniqueVisitorCount: snapshot.uniqueVisitorCount,
        onlineVisitorCount: snapshot.onlineVisitorCount,
        articleViewerCounts: {
          [targetSlug]: snapshot.articleViewerCounts[targetSlug] ?? 0,
        },
      }
    }
    return {
      status: snapshot.status,
      uniqueVisitorCount: snapshot.uniqueVisitorCount,
      onlineVisitorCount: snapshot.onlineVisitorCount,
      articleViewerCounts: snapshot.articleViewerCounts,
    }
  }

  /** 测试辅助：清空所有内存会话与缓存计数 */
  reset(): void {
    this.sessions.clear()
    this.cachedUniqueVisitorCount = null
  }
}

export const visitorsService = new VisitorsService()
