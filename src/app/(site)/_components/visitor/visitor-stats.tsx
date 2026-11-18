'use client'

import { CircleHelp, Radio } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { PaperSurface } from '../site/paper-surface'
import { useOverlayMotion } from '../site/use-overlay-motion'
import { useVisitorPresence } from './visitor-presence-provider'

function positionHelp(dialog: HTMLDivElement) {
  dialog.style.right = '0px'
  const rect = dialog.getBoundingClientRect()
  const padding = 16
  const shift =
    rect.right > window.innerWidth - padding
      ? window.innerWidth - padding - rect.right
      : rect.left < padding
        ? padding - rect.left
        : 0
  dialog.style.right = `${-shift}px`
}

interface VisitorStatsProps {
  className?: string
  align?: 'left' | 'right' | 'center'
}

/**
 * 站点实时在线与访客统计组件。
 * 展示 Live 脉冲指示、实时在线访客数与匿名去重累计计数。
 */
export function VisitorStats(props: VisitorStatsProps) {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null
  return <PublicVisitorStats {...props} />
}

function PublicVisitorStats({ className = '', align = 'left' }: VisitorStatsProps) {
  const { connectionState, uniqueVisitorCount, onlineVisitorCount } = useVisitorPresence()
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const helpContainerRef = useRef<HTMLSpanElement>(null)
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const { present, anchorRef, surfaceRef } = useOverlayMotion({
    open: isHelpOpen,
    triggerRef: helpButtonRef,
    duration: 240,
    exitDuration: 180,
    prepareLayout: positionHelp,
  })

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
      const dialog = anchorRef.current
      if (!dialog) return
      positionHelp(dialog)
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
  }, [isHelpOpen, anchorRef])

  const isConnected = connectionState === 'connected'
  const isReady = typeof uniqueVisitorCount === 'number'
  const visitorCountText = isReady
    ? uniqueVisitorCount.toLocaleString()
    : connectionState === 'connecting'
      ? '...'
      : '暂不可用'

  const alignClass =
    align === 'right' ? 'justify-start md:justify-end' : align === 'center' ? 'justify-center' : 'justify-start'

  return (
    <div
      className={`flex flex-col gap-1 text-xs text-muted-foreground ${align === 'right' ? 'md:items-end' : ''} ${className}`}
    >
      {/* 第一行：实时连接状态 */}
      <div className={`flex items-center gap-1.5 ${alignClass}`}>
        <Radio
          aria-hidden="true"
          strokeWidth={1.75}
          className={`size-3.5 shrink-0 ${isConnected ? 'text-primary' : 'text-muted-foreground'}`}
        />

        {isConnected ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground/90">
            <span className="text-[10px] tracking-wider text-primary uppercase">Live</span>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <span className="tabular-nums">{onlineVisitorCount}</span>
            <span>人在线</span>
          </span>
        ) : (
          <span className="font-mono text-xs text-muted-foreground">
            {connectionState === 'connecting' ? '正在连接现场...' : '现场在线暂不可用'}
          </span>
        )}
      </div>

      {/* 第二行：累计访客 + 说明弹窗 */}
      <div className={`flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground ${alignClass}`}>
        <span>累计访客</span>
        <span className="tabular-nums text-foreground/90">{visitorCountText}</span>

        <span ref={helpContainerRef} className="relative inline-flex items-center">
          <button
            ref={helpButtonRef}
            type="button"
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            aria-label="查看访客统计与在线状态说明"
            aria-expanded={isHelpOpen}
            title="统计说明"
          >
            <CircleHelp className="size-3" />
          </button>

          {present && (
            <div
              ref={anchorRef}
              className={`absolute bottom-full right-0 z-50 mb-2 w-64 max-w-[calc(100vw-2rem)] sm:w-72 ${!isHelpOpen ? 'pointer-events-none' : ''}`}
            >
              <div
                ref={surfaceRef}
                role="dialog"
                aria-label="实时统计说明"
                aria-hidden={!isHelpOpen}
                inert={!isHelpOpen}
                className="isolate origin-top-left rounded-lg p-3 text-left font-sans text-xs leading-relaxed text-popover-foreground"
              >
                <PaperSurface className="bg-popover" />
                <div className="font-medium text-foreground">关于访客与在线统计</div>
                <p className="mt-1.5 text-muted-foreground">
                  本站使用匿名浏览器标识长期去重，同一浏览器只计 1 位访客，不记录 IP 地址与浏览历史。
                </p>
                <p className="mt-1.5 text-muted-foreground">
                  实时在线人数基于 WebSocket 会话计算；页面关闭或隐藏后将在约定租约内自动移除。
                </p>
              </div>
            </div>
          )}
        </span>
      </div>
    </div>
  )
}
