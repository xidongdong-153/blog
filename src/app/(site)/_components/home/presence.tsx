'use client'

import type { PublicActivityItem, PublicPresence } from '@/lib/presence'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createOfflinePresence, parsePublicPresence } from '@/lib/presence'
import { profileConfig } from '@/profile.config'
import { siteConfig } from '@/site.config'

const PRESENCE_REQUEST_TIMEOUT_MS = 6_000

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

/**
 * 活动图标与终端标识组件。
 * 优先读取活动配置图标，回退至工具图标映射或等宽终端标识符。
 */
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
 * 首页与全站实时工位遥测头像组件。
 * - 移除独立小绿点，由头像本身作为视觉与交互入口；
 * - 有活动时头像环绕微光晕（Ambient Glow）；
 * - 鼠标悬停在头像上展开极简工位 HUD，描述信息极致精炼。
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
        if (!cancelled) setPresence(parsed ?? createOfflinePresence())
      } catch {
        if (!cancelled && (!controller.signal.aborted || timedOut)) setPresence(createOfflinePresence())
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

  // 无障碍摘要文本
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
        aria-label={`${siteConfig.author}的个人博客首页，实时工位：${summaryText}`}
        className="group relative flex items-center transition-transform duration-200 active:scale-95"
      >
        {/* 有活动时的环境微光晕 */}
        {active && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-xl bg-emerald-500/25 blur-sm transition-opacity duration-500 group-hover:bg-emerald-500/35"
          />
        )}

        {/* 头像外层底托 */}
        <div
          className={`relative flex items-center justify-center rounded-xl border p-0.5 backdrop-blur-sm transition-all duration-500 group-hover:border-foreground/30 group-hover:shadow-xs ${
            active
              ? 'border-emerald-500/45 bg-gradient-to-b from-background/95 via-card/80 to-muted/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'border-border/80 bg-gradient-to-b from-background/95 via-card/80 to-muted/50 shadow-2xs'
          }`}
        >
          {profileConfig.avatar ? (
            <Image
              src={profileConfig.avatar}
              alt={siteConfig.author}
              width={32}
              height={32}
              priority
              className="size-8 rounded-[10px] object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-8 select-none items-center justify-center rounded-[10px] bg-muted/60 font-serif text-sm font-bold text-foreground">
              {siteConfig.author.trim().slice(0, 1)}
            </div>
          )}

          {/* 细微内阴影与边缘刻线 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0.5 rounded-[10px] ring-1 ring-inset ring-black/5 dark:ring-white/10"
          />
        </div>
      </Link>

      {/* 悬停展开的极简工位 HUD */}
      {expanded && (
        <div
          role="dialog"
          aria-label="实时工位状态"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-64 overflow-hidden rounded-xl border border-border/80 bg-background/95 p-3 text-left shadow-lg ring-1 ring-inset ring-foreground/5 backdrop-blur-md before:absolute before:-top-2.5 before:inset-x-0 before:h-2.5 before:content-[''] sm:-left-2"
        >
          {/* 顶栏 */}
          <div className="border-b border-border/50 pb-1.5">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">// WORKSTATION</span>
          </div>

          {/* 主体状态 */}
          <div className="pt-2.5">
            {active && foregroundTool ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-2">
                {desktopApp && <ActivityIcon activity={desktopApp} />}
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-semibold text-foreground">
                    &gt;_ {getToolLabel(foregroundTool)}
                  </p>
                  {desktopApp && (
                    <p className="truncate font-mono text-xs text-muted-foreground">in {desktopApp.label}</p>
                  )}
                </div>
              </div>
            ) : active && desktopApp ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-2">
                <ActivityIcon activity={desktopApp} />
                <p className="truncate font-mono text-xs font-medium text-foreground">{desktopApp.label}</p>
              </div>
            ) : (
              <p className="py-1 font-mono text-xs text-muted-foreground">
                {active ? '在看别的内容，没在敲代码' : idleMessage}
              </p>
            )}

            {/* 后台工具 */}
            {backgroundTools.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {backgroundTools.map((activity) => {
                  const icon = activity.icon ?? TOOL_ICON_MAP[activity.id]
                  return (
                    <span
                      key={activity.id}
                      className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
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

            {/* 终端未探测提示 */}
            {active && presence?.terminalDetection === 'unknown' && (
              <p className="pt-1.5 font-mono text-xs text-muted-foreground">// 终端焦点未探测</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
