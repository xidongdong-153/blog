'use client'

import type { PublicActivityItem, PublicPresence } from '@/lib/presence'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { createOfflinePresence, parsePublicPresence } from '@/lib/presence'

function ActivityIcon({ activity, className }: { activity: PublicActivityItem; className: string }) {
  if (activity.icon) {
    return (
      <Image src={activity.icon} alt="" width={24} height={24} className={`${className} rounded-md object-cover`} />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${className} flex items-center justify-center rounded-md border border-border bg-muted font-mono text-xs font-medium text-muted-foreground`}
    >
      {activity.label.slice(0, 1).toUpperCase()}
    </span>
  )
}

/**
 * 首页实时活动状态。
 * 页面只读取公开快照；活动字段由服务端白名单投影，客户端轮询不会接触采集密钥。
 */
export function PresenceStatus() {
  const [presence, setPresence] = useState<PublicPresence | null>(null)
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const inFlightRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (inFlightRef.current || document.visibilityState !== 'visible') return
      inFlightRef.current = true
      requestRef.current?.abort()
      const controller = new AbortController()
      requestRef.current = controller
      try {
        const response = await fetch('/api/presence', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`活动接口返回 HTTP ${response.status}`)
        const parsed = parsePublicPresence((await response.json()) as unknown)
        if (!cancelled) setPresence(parsed ?? createOfflinePresence())
      } catch {
        if (!cancelled && !controller.signal.aborted) setPresence(createOfflinePresence())
      } finally {
        if (!cancelled) inFlightRef.current = false
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void load()
    }

    void load()
    const interval = window.setInterval(() => void load(), 2_000)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      requestRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!expanded) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && !containerRef.current?.contains(target)) setExpanded(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [expanded])

  const active = presence?.status === 'active'
  const current = active ? (presence.foregroundTool ?? presence.desktopApp) : null
  const backgroundTools = active ? presence.backgroundTools : []
  const statusText = current ? `正在使用 ${current.label}` : active ? '在线' : presence ? '暂时离线' : '读取中'
  const detailText = presence?.foregroundTool ? '终端活动' : presence?.desktopApp ? '桌面活动' : '没有公开活动'

  return (
    <div
      ref={containerRef}
      className="absolute -right-1.5 -top-1.5 z-20"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={(event) => {
        const relatedTarget = event.relatedTarget
        if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) setExpanded(false)
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-haspopup="dialog"
        aria-label={`查看实时活动：${statusText}`}
        onClick={() => setExpanded(true)}
        className="group flex size-4 items-center justify-center rounded-full border-2 border-background bg-background shadow-xs transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      >
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-muted-foreground/45'}`}
        />
      </button>

      {expanded && (
        <div
          role="dialog"
          aria-label="实时活动详情"
          className="absolute -left-11 top-[calc(100%+1.5rem)] z-20 w-[min(21rem,calc(100vw-2rem))] rounded-lg border border-border/70 bg-card/95 p-4 text-left shadow-sm backdrop-blur-md sm:left-0"
        >
          <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Live Desk</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <span aria-hidden="true" className={`size-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-border'}`} />
              {active ? '在线' : '离线'}
            </span>
          </div>

          <div className="flex items-center gap-3 py-4">
            {current ? (
              <ActivityIcon activity={current} className="size-10 shrink-0" />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-border font-mono text-xs text-muted-foreground">
                --
              </span>
            )}
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{detailText}</p>
              <p className="truncate text-base font-medium text-foreground">{current?.label ?? '没有公开活动'}</p>
              {presence?.foregroundTool && presence.desktopApp && (
                <p className="mt-0.5 text-xs text-muted-foreground">运行于 {presence.desktopApp.label}</p>
              )}
            </div>
          </div>

          {backgroundTools.length > 0 && (
            <div className="border-t border-border/60 pt-3">
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">后台运行</p>
              <ul className="flex flex-col gap-2">
                {backgroundTools.map((activity) => (
                  <li key={activity.id} className="flex items-center gap-2 text-sm text-foreground">
                    <ActivityIcon activity={activity} className="size-5 shrink-0" />
                    <span>{activity.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {active && presence?.terminalDetection === 'unknown' && (
            <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">终端焦点暂不可用</p>
          )}
        </div>
      )}
    </div>
  )
}
