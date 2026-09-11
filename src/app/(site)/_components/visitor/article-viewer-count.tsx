'use client'

import { CircleHelp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useVisitorPresence } from './visitor-presence-provider'

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
      const dialog = helpRef.current?.querySelector('[role="dialog"]') as HTMLElement | null
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
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
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
            <span
              className={`size-1.5 rounded-full ${count > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
              aria-hidden="true"
            />
            {count > 0 ? (
              <>
                <span className="font-semibold tabular-nums text-foreground/90">{count}</span>
                <span>人正在阅读</span>
              </>
            ) : (
              <span className="text-muted-foreground/80">当前无人阅读</span>
            )}
          </>
        ) : (
          <>
            <span className="size-1.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />
            <span className="text-muted-foreground/70">
              {connectionState === 'connecting' ? '实时状态同步中' : '实时状态暂不可用'}
            </span>
          </>
        )}
      </span>

      {/* 帮助按钮 */}
      <span ref={helpRef} className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => setIsHelpOpen(!isHelpOpen)}
          className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="查看文章阅读人数说明"
          aria-expanded={isHelpOpen}
          title="说明"
        >
          <CircleHelp className="size-3.5" />
        </button>

        {isHelpOpen && (
          <div
            role="dialog"
            aria-label="文章阅读人数说明"
            className="absolute bottom-full left-0 z-50 mb-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border/70 bg-popover p-3 text-left font-sans text-xs leading-relaxed text-popover-foreground shadow-lg backdrop-blur-sm sm:w-72"
          >
            <div className="font-medium text-foreground">实时阅读状态</div>
            <p className="mt-1.5 text-muted-foreground">
              统计当前正在打开此页面的匿名访客数量，同一匿名访客的多标签页仅计 1 人。
            </p>
            <p className="mt-1.5 text-muted-foreground">离开页面或切换标签页后，状态将通过 WebSocket 自动释放。</p>
          </div>
        )}
      </span>
    </div>
  )
}
