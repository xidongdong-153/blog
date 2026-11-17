'use client'

import type { PublicPresence } from '@/lib/presence'
import { Search, Terminal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getLatestPresenceSnapshot, PRESENCE_UPDATE_EVENT } from './presence'

interface HeroLiveBadgeProps {
  location: string
}

/**
 * 首页 Hero 顶部无边框编辑部状态刻度行。
 * 复用页头 PresenceStatus 广播的 `/api/presence` 快照，以细线眉标与等宽文字展示工位状态，不发起重复请求。
 */
export function HeroLiveBadge({ location }: HeroLiveBadgeProps) {
  const [presence, setPresence] = useState<PublicPresence | null>(null)

  useEffect(() => {
    setPresence(getLatestPresenceSnapshot())

    const handleUpdate = (event: Event) => {
      const custom = event as CustomEvent<PublicPresence>
      if (custom.detail) {
        setPresence(custom.detail)
      }
    }

    window.addEventListener(PRESENCE_UPDATE_EVENT, handleUpdate)
    return () => window.removeEventListener(PRESENCE_UPDATE_EVENT, handleUpdate)
  }, [])

  const isActive = presence?.status === 'active'
  const activeTool = presence?.foregroundTool?.label ?? presence?.desktopApp?.label

  return (
    <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs text-muted-foreground">
      <span aria-hidden="true" className="h-px w-4 bg-primary" />
      {location && <span className="tracking-wider text-foreground uppercase">{location}</span>}
      <span aria-hidden="true" className="text-muted-foreground/45">
        /
      </span>
      <span className="inline-flex min-w-0 items-center gap-1.5 text-foreground/85">
        <Terminal
          aria-hidden="true"
          className={`size-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
          strokeWidth={1.75}
        />
        <span className="truncate">
          {isActive ? (activeTool ? `工位在线 · ${activeTool}` : '工位在线') : 'TypeScript & AI Agents'}
        </span>
      </span>
    </div>
  )
}

/**
 * 首页 Hero 中的命令检索按钮，唤醒全站 ⌘K 搜索弹窗。
 */
export function HeroSearchChip() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('open-command-search'))}
      aria-label="打开全站命令搜索"
      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-hair bg-card/85 px-3 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Search className="size-3.5" aria-hidden="true" />
      <span>搜索</span>
      <kbd className="hidden rounded border border-border/70 px-1 py-0.5 text-[10px] leading-none text-muted-foreground sm:inline-block">
        ⌘K
      </kbd>
    </button>
  )
}
