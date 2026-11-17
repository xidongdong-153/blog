'use client'

import type { PublicActivityItem, PublicPresence } from '@/lib/presence'
import { Terminal } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createOfflinePresence, parsePublicPresence } from '@/lib/presence'
import { profileConfig } from '@/profile.config'
import { siteConfig } from '@/site.config'
import { PaperSurface } from '../site/paper-surface'

const PRESENCE_REQUEST_TIMEOUT_MS = 6_000
export const PRESENCE_UPDATE_EVENT = 'xdd-presence-update'

let latestPresenceSnapshot: PublicPresence | null = null

export function getLatestPresenceSnapshot(): PublicPresence | null {
  return latestPresenceSnapshot
}

function publishPresenceSnapshot(next: PublicPresence) {
  latestPresenceSnapshot = next
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<PublicPresence>(PRESENCE_UPDATE_EVENT, { detail: next }))
  }
}

const IDLE_MESSAGES = [
  '不在工位，大概率正在摸鱼',
  '键盘已冷却，人不知去向',
  '工位放空中，正在给大脑散热',
  '溜达去了，稍后再来抓我',
  '出去吹吹风，暂时没敲代码',
  '正在给生活充电，稍后回来',
] as const

const TOOL_ICON_MAP: Partial<Record<string, string>> = {
  pi: '/images/presence/pi.png',
  agy: '/images/presence/antigravity.png',
  antigravity: '/images/presence/antigravity.png',
  claude: '/images/presence/claude.png',
  codex: '/images/presence/chatgpt.png',
}

function getToolLabel(tool: PublicActivityItem): string {
  if (tool.id === 'agy' || tool.id === 'antigravity') return 'Antigravity'
  return tool.label
}

function ActivityIcon({ activity, className }: { activity: PublicActivityItem; className?: string }) {
  const iconSrc = activity.icon ?? TOOL_ICON_MAP[activity.id]

  if (iconSrc) {
    return (
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/80 p-0.5 shadow-2xs"
      >
        <Image src={iconSrc} alt="" width={20} height={20} className="size-5 rounded object-cover" />
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`flex size-6 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/50 font-mono text-xs font-semibold text-foreground/80 shadow-2xs ${className ?? ''}`}
    >
      &gt;_
    </span>
  )
}

/**
 * 顶栏实时工位遥测头像组件（Squircle 纸感底托）。
 * 有活动时环绕柔和琥珀微光，悬停或聚焦展开极简工位面板。
 */
export function PresenceStatus() {
  const [presence, setPresence] = useState<PublicPresence | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [idleMessage, setIdleMessage] = useState<string>(IDLE_MESSAGES[0])
  const containerRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const inFlightRef = useRef(false)

  const handleOpen = () => {
    setExpanded(true)
    const next = IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)] ?? IDLE_MESSAGES[0]
    setIdleMessage(next)
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (inFlightRef.current || document.visibilityState !== 'visible') return
      inFlightRef.current = true
      requestRef.current?.abort()
      const controller = new AbortController()
      requestRef.current = controller
      let timedOut = false
      const timeoutId = window.setTimeout(() => {
        timedOut = true
        controller.abort()
      }, PRESENCE_REQUEST_TIMEOUT_MS)
      try {
        const response = await fetch('/api/presence', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`活动接口返回 HTTP ${response.status}`)
        const parsed = parsePublicPresence((await response.json()) as unknown)
        if (!cancelled) {
          const next = parsed ?? createOfflinePresence()
          setPresence(next)
          publishPresenceSnapshot(next)
        }
      } catch {
        if (!cancelled && (!controller.signal.aborted || timedOut)) {
          const offline = createOfflinePresence()
          setPresence(offline)
          publishPresenceSnapshot(offline)
        }
      } finally {
        window.clearTimeout(timeoutId)
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
      if (target instanceof Node && !containerRef.current?.contains(target)) {
        setExpanded(false)
      }
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
  const desktopApp = active ? presence.desktopApp : null
  const foregroundTool = active ? presence.foregroundTool : null
  const backgroundTools = active ? presence.backgroundTools : []

  const summaryText = foregroundTool
    ? `前台终端 ${getToolLabel(foregroundTool)}`
    : desktopApp
      ? `前台应用 ${desktopApp.label}`
      : active
        ? '工位在线'
        : '工位待机'

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      onMouseEnter={handleOpen}
      onMouseLeave={() => setExpanded(false)}
      onFocus={handleOpen}
      onBlur={(event) => {
        const relatedTarget = event.relatedTarget
        if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
          setExpanded(false)
        }
      }}
    >
      <Link
        href="/"
        aria-label={`${siteConfig.title}首页，实时工位：${summaryText}`}
        className="ink-glide group relative flex items-center gap-2.5 rounded-lg active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <div className="relative flex size-[30px] items-center justify-center">
          <div
            className={`relative flex size-[30px] items-center justify-center overflow-hidden rounded-[9px] ring-1 transition-all duration-300 ${
              active ? 'ring-primary/70' : 'ring-border/80 group-hover:ring-primary/45'
            }`}
          >
            {profileConfig.avatar ? (
              <Image
                src={profileConfig.avatar}
                alt={siteConfig.author}
                width={30}
                height={30}
                priority
                className="ink-glide size-full object-cover group-hover:scale-105"
              />
            ) : (
              <div className="flex size-full select-none items-center justify-center bg-muted/60 font-serif text-sm font-semibold text-foreground">
                {siteConfig.author.trim().slice(0, 1)}
              </div>
            )}
          </div>
        </div>

        <span className="font-serif text-[18px] font-medium tracking-[0.02em] text-foreground transition-colors group-hover:text-primary">
          {siteConfig.author}
        </span>
      </Link>

      {/* 悬停展开的纸片感工位 HUD */}
      {expanded && (
        <div
          role="dialog"
          aria-label="实时工位状态"
          className="isolate absolute left-0 top-[calc(100%+0.65rem)] z-50 w-64 overflow-hidden rounded-lg p-3.5 text-left before:absolute before:-top-3 before:inset-x-0 before:h-3 before:content-[''] animate-[modal-scale-in_180ms_var(--ease-spring)_both] motion-reduce:animate-none"
        >
          <PaperSurface className="bg-popover" />
          <div className="flex items-center justify-between border-b border-hair pb-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Workstation</span>
            <span
              className={`inline-flex items-center gap-1 font-mono text-[10px] font-medium ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Terminal className="size-3" aria-hidden="true" strokeWidth={1.75} />
              <span>{active ? '在线' : '待机'}</span>
            </span>
          </div>

          <div className="pt-2.5">
            {active && foregroundTool ? (
              <div className="flex items-center gap-2.5 py-0.5">
                {desktopApp && <ActivityIcon activity={desktopApp} />}
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-semibold text-foreground">
                    &gt;_ {getToolLabel(foregroundTool)}
                  </p>
                  {desktopApp && (
                    <p className="truncate font-mono text-[11px] text-muted-foreground">in {desktopApp.label}</p>
                  )}
                </div>
              </div>
            ) : active && desktopApp ? (
              <div className="flex items-center gap-2.5 py-0.5">
                <ActivityIcon activity={desktopApp} />
                <p className="truncate font-mono text-xs font-medium text-foreground">{desktopApp.label}</p>
              </div>
            ) : (
              <p className="py-1 text-xs leading-relaxed text-muted-foreground">
                {active ? '在看别的内容，没在敲代码' : idleMessage}
              </p>
            )}

            {backgroundTools.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-hair pt-2">
                {backgroundTools.map((activity) => {
                  const icon = activity.icon ?? TOOL_ICON_MAP[activity.id]
                  return (
                    <span
                      key={activity.id}
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground"
                    >
                      {icon ? (
                        <Image src={icon} alt="" width={12} height={12} className="size-3 rounded-xs object-cover" />
                      ) : (
                        <span>&gt;_</span>
                      )}
                      <span>{getToolLabel(activity)}</span>
                    </span>
                  )
                })}
              </div>
            )}

            {active && presence?.terminalDetection === 'unknown' && (
              <p className="pt-1.5 font-mono text-[11px] text-muted-foreground">终端焦点未探测</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
