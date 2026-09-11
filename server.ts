import { createServer } from 'node:http'
import next from 'next'
import { visitorWebSocketHub } from './src/server/modules/visitors/visitors.websocket'

const dev = process.argv.includes('--dev') || process.env.NODE_ENV !== 'production'
const hostname = process.env.HOST || '127.0.0.1'
const port = parseInt(process.env.PORT || '4400', 10)

if (!dev) {
  ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
}

const app = next({ dev, hostname, port })
// 明确接管 WebSocket upgrade 分流，防止 Next.js 内部默认升级分流器错误关闭自定义长连接
;(app as unknown as { didWebSocketSetup: boolean }).didWebSocketSetup = true

async function main() {
  await app.prepare()

  const handle = app.getRequestHandler()
  const rawApp = app as unknown as {
    upgradeHandler?: (req: unknown, socket: unknown, head: unknown) => Promise<void>
  }
  const upgradeHandler =
    typeof rawApp.upgradeHandler === 'function' ? rawApp.upgradeHandler.bind(app) : app.getUpgradeHandler()

  let isShuttingDown = false
  let inFlightRequests = 0

  const server = createServer(async (req, res) => {
    // 停机阶段拦截新请求并标记断开连接
    if (isShuttingDown) {
      res.setHeader('Connection', 'close')
      res.statusCode = 503
      res.end('Server is shutting down')
      return
    }

    inFlightRequests++
    res.on('finish', () => {
      inFlightRequests--
      if (isShuttingDown && inFlightRequests === 0) {
        server.closeIdleConnections?.()
      }
    })

    try {
      await handle(req, res)
    } catch (err) {
      console.error('[Server] 请求处理异常:', err)
      if (!res.headersSent) {
        res.statusCode = 500
        res.end('Internal Server Error')
      }
    }
  })

  // HTTP Upgrade 升级事件统一分流处理
  server.on('upgrade', (req, socket, head) => {
    if (isShuttingDown) {
      socket.destroy()
      return
    }

    const { pathname } = new URL(req.url || '/', 'http://127.0.0.1')
    if (pathname === '/api/visitors/socket') {
      visitorWebSocketHub.handleUpgrade(req, socket, head)
    } else if (pathname?.startsWith('/_next')) {
      upgradeHandler(req, socket, head)
    } else {
      socket.destroy()
    }
  })

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      console.log(`[Server] 再次收到 ${signal}，立即强制退出`)
      server.closeAllConnections?.()
      process.exit(1)
    }

    isShuttingDown = true
    console.log(`[Server] 收到 ${signal}，正在平滑停机...`)

    // 1. 关闭 WebSocket 服务，主动断开所有客户端连接并清理定时器
    try {
      await visitorWebSocketHub.close()
    } catch (err) {
      console.error('[Server] 关闭 WebSocket 服务异常:', err)
    }

    let forceTimer: NodeJS.Timeout | null = null

    // 2. 停止接收新连接，并立即关闭所有当前空闲的 Keep-Alive 连接
    server.close(() => {
      if (forceTimer) clearTimeout(forceTimer)
      app
        .close()
        .catch(() => {})
        .finally(() => {
          console.log('[Server] 平滑停机完成')
          process.exit(0)
        })
    })

    server.closeIdleConnections?.()

    // 3. 安全退出兜底定时器（2.5 秒）
    forceTimer = setTimeout(() => {
      console.warn('[Server] 平滑停机超时，强制关闭剩余连接')
      server.closeAllConnections?.()
      app
        .close()
        .catch(() => {})
        .finally(() => {
          process.exit(0)
        })
    }, 2500)
    forceTimer.unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  server.listen(port, hostname, () => {
    console.log(`> Blog ready on http://${hostname}:${port} (dev: ${dev})`)
  })
}

main().catch((err) => {
  console.error('[Server] 启动失败:', err)
  process.exit(1)
})
