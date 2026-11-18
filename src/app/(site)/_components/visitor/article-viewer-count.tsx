'use client'

import { CircleHelp, Eye } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useOverlayMotion } from '../site/use-overlay-motion'
import { useVisitorPresence } from './visitor-presence-provider'

function positionHelp(dialog: HTMLDivElement) {
  dialog.style.left = '0px'
  const rect = dialog.getBoundingClientRect()
  const padding = 16
  const shift =
    rect.right > window.innerWidth - padding
      ? window.innerWidth - padding - rect.right
      : rect.left < padding
        ? padding - rect.left
        : 0
  dialog.style.left = `${shift}px`
}

interface ArticleViewerCountProps {
  slug: string
  mode?: 'compact' | 'detailed'
  className?: string
  separator?: boolean
}

/**
 * 文章实时在线阅读人数展示组件。
 * - compact: 列表卡片模式，仅在当前有人在读时显示紧凑徽标。
 * - detailed: 文章详情页模式，常驻显示当前正在阅读人数（含 0 人状态与帮助气泡）。
 */
export function ArticleViewerCount({
  slug,
  mode = 'compact',
  className = '',
  separator = true,
}: ArticleViewerCountProps) {
  const { connectionState, getArticleViewerCount } = useVisitorPresence()
  const count = getArticleViewerCount(slug) ?? 0
  const isConnected = connectionState === 'connected'

  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const helpRef = useRef<HTMLSpanElement>(null)
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
      if (e.key === 'Escape') setIsHelpOpen(false)
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
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

  // 紧凑模式：未连接或人数为 0 时保持安静，不渲染空指示
  if (mode === 'compact') {
    if (!isConnected || count <= 0) {
      return null
    }

    return (
      <>
        {separator && <span>·</span>}
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-xs tracking-wider text-muted-foreground ${className}`}
          title="当前文章实时在线人数"
        >
          <Eye className="size-3 shrink-0 text-primary" aria-hidden="true" strokeWidth={1.8} />
          <span className="font-semibold tabular-nums text-foreground/90">{count}</span>
          <span>人正在阅读</span>
        </span>
      </>
    )
  }

  // 详情模式：常驻展示明确阅读状态与帮助说明
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        {isConnected ? (
          <>
            <Eye
              className={`size-3.5 shrink-0 ${count > 0 ? 'text-primary' : 'text-muted-foreground'}`}
              aria-hidden="true"
              strokeWidth={1.75}
            />
            {count > 0 ? (
              <>
                <span className="font-semibold tabular-nums text-foreground/90">{count}</span>
                <span>人正在阅读</span>
              </>
            ) : (
              <span className="text-muted-foreground">当前无人阅读</span>
            )}
          </>
        ) : (
          <>
            <Eye className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" strokeWidth={1.75} />
            <span className="text-muted-foreground">
              {connectionState === 'connecting' ? '实时状态同步中' : '实时状态暂不可用'}
            </span>
          </>
        )}
      </span>

      {/* 帮助按钮 */}
      <span ref={helpRef} className="relative inline-flex items-center">
        <button
          ref={helpButtonRef}
          type="button"
          onClick={() => setIsHelpOpen(!isHelpOpen)}
          className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="查看文章阅读人数说明"
          aria-expanded={isHelpOpen}
          title="说明"
        >
          <CircleHelp className="size-3.5" />
        </button>

        {present && (
          <div
            ref={anchorRef}
            className={`absolute bottom-full left-0 z-50 mb-2 w-64 max-w-[calc(100vw-2rem)] sm:w-72 ${!isHelpOpen ? 'pointer-events-none' : ''}`}
          >
            <div
              ref={surfaceRef}
              role="dialog"
              aria-label="文章阅读人数说明"
              aria-hidden={!isHelpOpen}
              inert={!isHelpOpen}
              className="origin-top-left rounded-lg border border-border/70 bg-popover p-3 text-left font-sans text-xs leading-relaxed text-popover-foreground shadow-lg backdrop-blur-sm"
            >
              <div className="font-medium text-foreground">实时阅读状态</div>
              <p className="mt-1.5 text-muted-foreground">
                统计当前正在打开此页面的匿名访客数量，同一匿名访客的多标签页仅计 1 人。
              </p>
              <p className="mt-1.5 text-muted-foreground">离开页面或切换标签页后，状态将通过 WebSocket 自动释放。</p>
            </div>
          </div>
        )}
      </span>
    </div>
  )
}
