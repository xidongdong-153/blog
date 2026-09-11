'use client'

import type { VisitorClientMessage, VisitorConnectionState, VisitorServerMessage } from '@/lib/visitor'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { parseArticleSlug, VISITOR_HEARTBEAT_INTERVAL_MS, VISITOR_SOCKET_PATH } from '@/lib/visitor'

interface VisitorPresenceContextValue {
  connectionState: VisitorConnectionState
  uniqueVisitorCount: number | null
  onlineVisitorCount: number
  articleViewerCounts: Record<string, number>
  getArticleViewerCount: (slug: string) => number | undefined
}

const VisitorPresenceContext = createContext<VisitorPresenceContextValue>({
  connectionState: 'connecting',
  uniqueVisitorCount: null,
  onlineVisitorCount: 0,
  articleViewerCounts: {},
  getArticleViewerCount: () => undefined,
})

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const BACKOFF_INITIAL_MS = 1000
const BACKOFF_MAX_MS = 10000
const DISCONNECT_GRACE_MS = 1500

/**
 * 布局级访客统计与实时在线状态提供器。
 * 全站维护唯一个 WebSocket 连接与 tab 级 sessionId，自动同步路由并消费服务端全量快照。
 */
export function VisitorPresenceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentSlug = useMemo(() => parseArticleSlug(pathname), [pathname])

  const [connectionState, setConnectionState] = useState<VisitorConnectionState>('connecting')
  const [uniqueVisitorCount, setUniqueVisitorCount] = useState<number | null>(null)
  const [onlineVisitorCount, setOnlineVisitorCount] = useState<number>(0)
  const [articleViewerCounts, setArticleViewerCounts] = useState<Record<string, number>>({})

  const sessionIdRef = useRef<string>('')
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const disconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const backoffRef = useRef<number>(BACKOFF_INITIAL_MS)
  const connectionGenRef = useRef<number>(0)
  const hasBootstrappedRef = useRef<boolean>(false)
  const currentSlugRef = useRef<string | null>(currentSlug)
  currentSlugRef.current = currentSlug

  // 初始化 tab 专属 sessionId
  if (!sessionIdRef.current) {
    sessionIdRef.current = generateSessionId()
  }

  const clearTimers = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current)
      disconnectTimerRef.current = null
    }
  }, [])

  const sendMessage = useCallback((msg: VisitorClientMessage) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }, [])

  // 路由变动时主动同步文章 slug
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendMessage({
        type: 'sync',
        sessionId: sessionIdRef.current,
        articleSlug: currentSlug,
      })
    }
  }, [currentSlug, sendMessage])

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') return
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    const gen = ++connectionGenRef.current
    clearTimers()

    try {
      // 1. 首次访问或无 Cookie 时进行 HTTP bootstrap 校验
      if (!hasBootstrappedRef.current) {
        try {
          const res = await fetch('/api/visitors/bootstrap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          })
          if (!res.ok) {
            throw new Error(`Bootstrap HTTP error ${res.status}`)
          }
          const data = (await res.json()) as { status: string; uniqueVisitorCount: number }
          if (connectionGenRef.current !== gen) return
          if (typeof data.uniqueVisitorCount === 'number') {
            setUniqueVisitorCount(data.uniqueVisitorCount)
          }
          hasBootstrappedRef.current = true
        } catch {
          if (connectionGenRef.current !== gen) return
          setConnectionState('unavailable')
          // 安排重试
          const delay = backoffRef.current
          backoffRef.current = Math.min(backoffRef.current * 2, BACKOFF_MAX_MS)
          reconnectTimerRef.current = setTimeout(() => {
            if (document.visibilityState === 'visible') void connect()
          }, delay)
          return
        }
      }

      if (connectionGenRef.current !== gen) return

      // 2. 建立同源 WebSocket 连接
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}${VISITOR_SOCKET_PATH}`

      let isOpened = false
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (connectionGenRef.current !== gen || wsRef.current !== ws) {
          ws.close()
          return
        }

        isOpened = true
        backoffRef.current = BACKOFF_INITIAL_MS

        // 取消断开缓冲定时器并置为已连接
        if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current)
          disconnectTimerRef.current = null
        }
        setConnectionState('connected')

        // 发送首次状态同步
        sendMessage({
          type: 'sync',
          sessionId: sessionIdRef.current,
          articleSlug: currentSlugRef.current,
        })

        // 启动心跳定时器（10秒）
        if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = setInterval(() => {
          if (document.visibilityState === 'visible') {
            sendMessage({
              type: 'heartbeat',
              sessionId: sessionIdRef.current,
            })
          }
        }, VISITOR_HEARTBEAT_INTERVAL_MS)
      }

      ws.onmessage = (event) => {
        if (connectionGenRef.current !== gen) return
        try {
          const msg = JSON.parse(event.data) as VisitorServerMessage
          if (msg.type === 'snapshot') {
            setUniqueVisitorCount(msg.uniqueVisitorCount)
            setOnlineVisitorCount(msg.onlineVisitorCount)
            setArticleViewerCounts(msg.articleViewerCounts || {})
            if (disconnectTimerRef.current) {
              clearTimeout(disconnectTimerRef.current)
              disconnectTimerRef.current = null
            }
            setConnectionState('connected')
          }
        } catch {
          // 忽略非标准消息
        }
      }

      ws.onclose = () => {
        if (connectionGenRef.current !== gen || wsRef.current !== ws) return
        wsRef.current = null

        // 为短暂重连提供 1.5s 缓冲，避免毫秒级闪烁与界面抖动
        if (!disconnectTimerRef.current) {
          disconnectTimerRef.current = setTimeout(() => {
            setConnectionState('unavailable')
            disconnectTimerRef.current = null
          }, DISCONNECT_GRACE_MS)
        }

        if (!isOpened) {
          hasBootstrappedRef.current = false
        }

        const delay = backoffRef.current
        backoffRef.current = Math.min(backoffRef.current * 2, BACKOFF_MAX_MS)
        reconnectTimerRef.current = setTimeout(() => {
          if (document.visibilityState === 'visible') void connect()
        }, delay)
      }

      ws.onerror = () => {
        // 浏览器标准在 error 后自动触发 close
      }
    } catch {
      // 容错兜底
    }
  }, [clearTimers, sendMessage])

  // 挂载与标签页可见性感知
  useEffect(() => {
    void connect()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (
          !wsRef.current ||
          (wsRef.current.readyState !== WebSocket.OPEN && wsRef.current.readyState !== WebSocket.CONNECTING)
        ) {
          void connect()
        }
      } else {
        clearTimers()
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          sendMessage({
            type: 'leave',
            sessionId: sessionIdRef.current,
          })
          wsRef.current.close()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      connectionGenRef.current++
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimers()
      if (wsRef.current) {
        try {
          sendMessage({
            type: 'leave',
            sessionId: sessionIdRef.current,
          })
          wsRef.current.close()
        } catch {
          // 忽略卸载关闭异常
        }
        wsRef.current = null
      }
    }
  }, [clearTimers, connect, sendMessage])

  const getArticleViewerCount = useCallback(
    (slug: string) => {
      return articleViewerCounts[slug]
    },
    [articleViewerCounts],
  )

  const value = useMemo<VisitorPresenceContextValue>(
    () => ({
      connectionState,
      uniqueVisitorCount,
      onlineVisitorCount,
      articleViewerCounts,
      getArticleViewerCount,
    }),
    [connectionState, uniqueVisitorCount, onlineVisitorCount, articleViewerCounts, getArticleViewerCount],
  )

  return <VisitorPresenceContext.Provider value={value}>{children}</VisitorPresenceContext.Provider>
}

/** 读取当前访客统计与实时在线状态的轻量 Hook */
export function useVisitorPresence(): VisitorPresenceContextValue {
  return useContext(VisitorPresenceContext)
}
