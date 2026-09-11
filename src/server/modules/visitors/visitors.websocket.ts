import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import type { VisitorsService } from './visitors.service'
import type { VisitorClientMessage, VisitorErrorCode, VisitorServerMessage } from '@/lib/visitor'
import { randomUUID } from 'node:crypto'
import { WebSocket, WebSocketServer } from 'ws'
import { getBlogPost } from '@/lib/content'
import {
  isValidVisitorUuid,
  VISITOR_COOKIE_NAME,
  VISITOR_PING_INTERVAL_MS,
  VISITOR_SESSION_CLEANUP_INTERVAL_MS,
  VISITOR_SOCKET_PATH,
} from '@/lib/visitor'
import { visitorsService as defaultVisitorsService } from './visitors.service'

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean
  connectionId: string
  visitorId: string
}

function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';')
  for (const cookie of cookies) {
    const [k, ...v] = cookie.trim().split('=')
    if (k === name) {
      let val = decodeURIComponent(v.join('='))
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1)
      }
      return val
    }
  }
  return null
}

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
}

function isValidOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true
  try {
    const originUrl = new URL(origin)
    const reqHost = (host || '').split(',')[0].trim().toLowerCase()
    if (!reqHost) return false
    const originHost = originUrl.host.toLowerCase()
    if (originHost === reqHost) return true

    // 本地开发环境容错：允许 localhost 与 127.0.0.1 在相同端口互通
    const [reqHostname, reqPort = ''] = reqHost.split(':')
    const [originHostname, originPort = ''] = originHost.split(':')
    if (reqPort === originPort && isLoopback(reqHostname) && isLoopback(originHostname)) {
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * 访客实时在线状态 WebSocket 管理中心。
 * 承载单连接握手、心跳探测、按文章同步与全量快照广播。
 */
export class VisitorWebSocketHub {
  private wss: WebSocketServer
  private visitorsService: VisitorsService
  private pingIntervalTimer: NodeJS.Timeout | null = null
  private cleanupIntervalTimer: NodeJS.Timeout | null = null

  constructor(options?: { visitorsService?: VisitorsService; disableTimers?: boolean }) {
    this.visitorsService = options?.visitorsService ?? defaultVisitorsService
    this.wss = new WebSocketServer({
      noServer: true,
      maxPayload: 4096,
      perMessageDeflate: false,
    })

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage, visitorId: string) => {
      this.setupConnection(ws as ExtendedWebSocket, visitorId)
    })

    if (!options?.disableTimers) {
      this.startTimers()
    }
  }

  /** 启动定时心跳检测与过期会话回收轮询 */
  startTimers(): void {
    if (this.pingIntervalTimer) clearInterval(this.pingIntervalTimer)
    if (this.cleanupIntervalTimer) clearInterval(this.cleanupIntervalTimer)

    this.pingIntervalTimer = setInterval(() => {
      for (const client of this.wss.clients) {
        const extWs = client as ExtendedWebSocket
        if (extWs.readyState === WebSocket.OPEN) {
          if (extWs.isAlive === false) {
            extWs.terminate()
          } else {
            extWs.isAlive = false
            extWs.ping()
          }
        }
      }
    }, VISITOR_PING_INTERVAL_MS)
    this.pingIntervalTimer.unref()

    this.cleanupIntervalTimer = setInterval(async () => {
      const removed = this.visitorsService.cleanupExpiredSessions()
      if (removed > 0) {
        await this.broadcastSnapshot()
      }
    }, VISITOR_SESSION_CLEANUP_INTERVAL_MS)
    this.cleanupIntervalTimer.unref()
  }

  /** 处理 HTTP 升级请求分流与安全校验 */
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    if (url.pathname !== VISITOR_SOCKET_PATH) {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n')
      return
    }

    const origin = req.headers.origin as string | undefined
    const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string)
    if (!isValidOrigin(origin, host)) {
      console.warn(`[VisitorWS] 握手拒绝: Origin 不匹配 (origin=${origin}, host=${host})`)
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
      return
    }

    const cookieHeader = req.headers.cookie
    const visitorId = parseCookie(cookieHeader, VISITOR_COOKIE_NAME)
    if (!isValidVisitorUuid(visitorId)) {
      console.warn(
        `[VisitorWS] 握手拒绝: 未携带有效 Cookie (${VISITOR_COOKIE_NAME}: ${visitorId ? '[invalid]' : '[missing]'})`,
      )
      socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
      return
    }

    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit('connection', ws, req, visitorId)
    })
  }

  /** 初始化已建立的 WebSocket 客户端连接 */
  private setupConnection(ws: ExtendedWebSocket, visitorId: string): void {
    const connectionId = randomUUID()
    ws.isAlive = true
    ws.connectionId = connectionId
    ws.visitorId = visitorId

    ws.on('pong', () => {
      ws.isAlive = true
    })

    ws.on('message', async (rawData) => {
      let msg: VisitorClientMessage
      try {
        msg = JSON.parse(rawData.toString())
      } catch {
        this.sendError(ws, 'invalid_message')
        return
      }

      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
        this.sendError(ws, 'invalid_message')
        return
      }

      if (!msg.sessionId || typeof msg.sessionId !== 'string' || msg.sessionId.length > 64) {
        this.sendError(ws, 'invalid_session')
        return
      }

      switch (msg.type) {
        case 'sync': {
          let articleSlug = msg.articleSlug ?? null
          if (articleSlug !== null) {
            if (typeof articleSlug !== 'string' || articleSlug.length > 128) {
              this.sendError(ws, 'invalid_article')
              return
            }
            const post = getBlogPost(articleSlug)
            if (!post) {
              this.sendError(ws, 'invalid_article')
              articleSlug = null
            }
          }

          this.visitorsService.registerSession({
            sessionId: msg.sessionId,
            connectionId,
            visitorId,
            articleSlug,
          })

          await this.broadcastSnapshot()
          break
        }

        case 'heartbeat': {
          this.visitorsService.heartbeatSession(msg.sessionId, connectionId)
          break
        }

        case 'leave': {
          const removed = this.visitorsService.removeSession(msg.sessionId, connectionId)
          if (removed) {
            await this.broadcastSnapshot()
          }
          break
        }

        default:
          this.sendError(ws, 'invalid_message')
          break
      }
    })

    ws.on('close', async () => {
      const removed = this.visitorsService.removeSessionsByConnectionId(connectionId)
      if (removed > 0) {
        await this.broadcastSnapshot()
      }
    })

    ws.on('error', () => {
      try {
        ws.close()
      } catch {
        // 忽略连接已关闭时的异常
      }
    })
  }

  private sendError(ws: WebSocket, code: VisitorErrorCode): void {
    if (ws.readyState === WebSocket.OPEN) {
      const errorMsg: VisitorServerMessage = {
        type: 'error',
        code,
      }
      ws.send(JSON.stringify(errorMsg))
    }
  }

  /** 向所有已连接的客户端广播当前最新公开快照 */
  async broadcastSnapshot(): Promise<void> {
    const snapshot = await this.visitorsService.getPublicSnapshot()
    const payload = JSON.stringify(snapshot)

    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload)
      }
    }
  }

  /** 关闭 WebSocket 服务并清理所有连接与定时器 */
  async close(): Promise<void> {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer)
      this.pingIntervalTimer = null
    }
    if (this.cleanupIntervalTimer) {
      clearInterval(this.cleanupIntervalTimer)
      this.cleanupIntervalTimer = null
    }

    for (const client of this.wss.clients) {
      try {
        client.terminate()
      } catch {
        // 忽略关闭阶段的异常
      }
    }

    await new Promise<void>((resolve) => {
      this.wss.close(() => resolve())
    })
  }

  /** 获取当前活跃连接数（供测试断言） */
  getClientCount(): number {
    return this.wss.clients.size
  }
}

export const visitorWebSocketHub = new VisitorWebSocketHub()
