/**
 * 访客统计与实时在线状态共享协议定义。
 * 包含 HTTP DTO、WebSocket 消息结构、常量及路由路径解析工具。
 */

export const VISITOR_COOKIE_NAME = 'site_visitor_id'
export const VISITOR_SOCKET_PATH = '/api/visitors/socket'

/** 访客 Cookie 有效期：1 年 (秒) */
export const VISITOR_COOKIE_MAX_AGE_SECONDS = 31_536_000

/** 客户端心跳间隔：10 秒 */
export const VISITOR_HEARTBEAT_INTERVAL_MS = 10_000

/** 会话租约时长：45 秒 */
export const VISITOR_SESSION_TTL_MS = 45_000

/** 服务端清理过期会话轮询周期：15 秒 */
export const VISITOR_SESSION_CLEANUP_INTERVAL_MS = 15_000

/** 服务端 WebSocket ping 心跳周期：30 秒 */
export const VISITOR_PING_INTERVAL_MS = 30_000

/** 状态：就绪或降级（数据库异常但进程内会话仍可用） */
export type VisitorSnapshotStatus = 'ready' | 'degraded'

/** 客户端连接状态 */
export type VisitorConnectionState = 'connecting' | 'connected' | 'unavailable'

/** POST /api/visitors/bootstrap 成功响应 */
export interface VisitorBootstrapResponse {
  status: 'ready'
  uniqueVisitorCount: number
}

/** GET /api/visitors/stats 响应 */
export interface VisitorStatsResponse {
  status: VisitorSnapshotStatus
  uniqueVisitorCount: number | null
  onlineVisitorCount: number
  articleViewerCounts: Record<string, number>
}

/** 服务端 WebSocket 广播快照 */
export interface VisitorSnapshotMessage {
  type: 'snapshot'
  status: VisitorSnapshotStatus
  uniqueVisitorCount: number | null
  onlineVisitorCount: number
  articleViewerCounts: Record<string, number>
}

/** 错误码定义 */
export type VisitorErrorCode =
  'invalid_message' | 'invalid_session' | 'invalid_article' | 'visitor_cookie_required' | 'service_unavailable'

/** 服务端 WebSocket 错误消息 */
export interface VisitorErrorMessage {
  type: 'error'
  code: VisitorErrorCode
}

export type VisitorServerMessage = VisitorSnapshotMessage | VisitorErrorMessage

/** 客户端同步页面状态消息 */
export interface VisitorSyncMessage {
  type: 'sync'
  sessionId: string
  articleSlug: string | null
}

/** 客户端心跳续期消息 */
export interface VisitorHeartbeatMessage {
  type: 'heartbeat'
  sessionId: string
}

/** 客户端正常离开消息 */
export interface VisitorLeaveMessage {
  type: 'leave'
  sessionId: string
}

export type VisitorClientMessage = VisitorSyncMessage | VisitorHeartbeatMessage | VisitorLeaveMessage

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** 校验字符串是否为标准 UUID 格式（支持去除两端外层引号） */
export function isValidVisitorUuid(value: string | null | undefined): value is string {
  if (!value || typeof value !== 'string') return false
  const trimmed = value.trim().replace(/^"(.*)"$/, '$1')
  return UUID_REGEX.test(trimmed)
}

/**
 * 从当前路径解析文章 slug。
 * 仅匹配 /blog/:slug，排除 /blog、/blog/archives、/blog/tags 等非文章页面。
 */
export function parseArticleSlug(pathname: string | null | undefined): string | null {
  if (!pathname || typeof pathname !== 'string') return null
  const cleanPath = pathname.split('?')[0].split('#')[0]
  const segments = cleanPath.split('/').filter(Boolean)

  if (segments.length !== 2) return null
  if (segments[0] !== 'blog') return null

  const slug = segments[1].trim()
  if (slug === 'archives' || slug === 'tags') return null

  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}
