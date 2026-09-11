import type {
  VisitorBootstrapResponse,
  VisitorConnectionState,
  VisitorErrorCode,
  VisitorSnapshotMessage,
  VisitorSnapshotStatus,
  VisitorStatsResponse,
} from '@/lib/visitor'
import type { AppDatabase } from '@/server/infra/db/client'

export type {
  AppDatabase,
  VisitorBootstrapResponse,
  VisitorConnectionState,
  VisitorErrorCode,
  VisitorSnapshotMessage,
  VisitorSnapshotStatus,
  VisitorStatsResponse,
}

/** 内部页面查看会话记录 */
export interface ViewerSession {
  /** 客户端 Tab 级会话标识 */
  sessionId: string
  /** WebSocket 连接实例唯一标识，用于防竞态清理 */
  connectionId: string
  /** 访客匿名标识（服务端内部保存，不对外暴露） */
  visitorId: string
  /** 正在查看的文章 slug，非文章页面为 null */
  articleSlug: string | null
  /** 最近活跃毫秒时间戳 */
  lastSeenAt: number
}

/** 时间与依赖时钟接口，方便单元测试精确控制时间 */
export interface Clock {
  now: () => number
}

/** 访客服务可注入的依赖集合 */
export interface VisitorsServiceDeps {
  db?: AppDatabase
  clock?: Clock
  uuidGenerator?: () => string
}

/** 访客领域业务异常 */
export class VisitorsServiceError extends Error {
  readonly code: VisitorErrorCode
  readonly statusCode: 400 | 404 | 500 | 503

  constructor(code: VisitorErrorCode, statusCode: 400 | 404 | 500 | 503 = 500, message?: string) {
    super(message || code)
    this.name = 'VisitorsServiceError'
    this.code = code
    this.statusCode = statusCode
  }
}
