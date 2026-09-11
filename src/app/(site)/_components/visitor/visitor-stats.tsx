'use client'

import { CircleHelp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useVisitorPresence } from './visitor-presence-provider'

interface VisitorStatsProps {
  className?: string
  align?: 'left' | 'center'
}

/**
 * 站点统计动态区域组件。
 * 展示累计匿名访客数与当前全站在线人数，集成可访问的说明气泡，无侵入融入出版物排版。
 */
export function VisitorStats({ className = '', align = 'center' }: VisitorStatsProps) {
  const { connectionState, uniqueVisitorCount, onlineVisitorCount } = useVisitorPresence()
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const helpContainerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!isHelpOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHelpOpen(false)
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (helpContainerRef.current && !helpContainerRef.current.contains(e.target as Node)) {
        setIsHelpOpen(false)
      }
    }

    const adjustPosition = () => {
      const dialog = helpContainerRef.current?.querySelector('[role="dialog"]') as HTMLElement | null
      if (!dialog) return
      dialog.style.transform = ''
      const rect = dialog.getBoundingClientRect()
      const padding = 16
      if (rect.right > window.innerWidth - padding) {
        const overflow = rect.right - (window.innerWidth - padding)
        dialog.style.transform = `translateX(-${overflow}px)`
      } else if (rect.left < padding) {
        const overflow = padding - rect.left
        dialog.style.transform = `translateX(${overflow}px)`
      }
    }

    adjustPosition()
    window.addEventListener('resize', adjustPosition)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('resize', adjustPosition)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isHelpOpen])

  const isConnected = connectionState === 'connected'
  const isReady = typeof uniqueVisitorCount === 'number'
  const visitorCountText = isReady
    ? uniqueVisitorCount.toLocaleString()
    : connectionState === 'connecting'
      ? '...'
      : '暂不可用'

  const justifyClass = align === 'left' ? 'justify-start' : 'justify-center'

  return (
    <div
      className={`flex flex-wrap items-center ${justifyClass} gap-x-2.5 gap-y-1 font-mono text-xs tracking-wider text-muted-foreground ${className}`}
    >
      {/* 累计访客统计 */}
      <span className="inline-flex items-center gap-1.5">
        <span>累计访客</span>
        <span className="font-semibold tabular-nums text-foreground/90">{visitorCountText}</span>
      </span>

      <span className="text-border">·</span>

      {/* 实时在线状态与指示点 */}
      <span className="inline-flex items-center gap-1.5">
        <span
          className={`size-1.5 rounded-full transition-colors duration-300 ${
            isConnected ? 'bg-emerald-500' : 'bg-muted-foreground/40'
          }`}
          aria-hidden="true"
        />
        {isConnected ? (
          <>
            <span>当前</span>
            <span className="font-semibold tabular-nums text-foreground/90">{onlineVisitorCount}</span>
            <span>人在线</span>
          </>
        ) : (
          <span className="text-muted-foreground/80">
            {connectionState === 'connecting' ? '实时在线同步中' : '实时在线暂不可用'}
          </span>
        )}
      </span>

      {/* 帮助与隐私说明弹层 */}
      <span ref={helpContainerRef} className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => setIsHelpOpen(!isHelpOpen)}
          className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="查看访客统计与在线状态说明"
          aria-expanded={isHelpOpen}
          title="统计说明"
        >
          <CircleHelp className="size-3.5" />
        </button>

        {isHelpOpen && (
          <div
            role="dialog"
            aria-label="实时统计说明"
            className={`absolute bottom-full z-50 mb-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border/70 bg-popover p-3 text-left font-sans text-xs leading-relaxed text-popover-foreground shadow-lg backdrop-blur-sm sm:w-72 ${
              align === 'left' ? 'left-0 sm:left-1/2 sm:-translate-x-1/2' : 'left-1/2 -translate-x-1/2'
            }`}
          >
            <div className="font-medium text-foreground">关于访客与在线统计</div>
            <p className="mt-1.5 text-muted-foreground">
              本站使用匿名浏览器标识长期去重，同一浏览器只计 1 位访客，不记录 IP 地址与浏览历史。
            </p>
            <p className="mt-1.5 text-muted-foreground">
              实时在线人数基于 WebSocket 会话计算；页面关闭或隐藏后将在约定租约内自动移除。
            </p>
          </div>
        )}
      </span>
    </div>
  )
}
