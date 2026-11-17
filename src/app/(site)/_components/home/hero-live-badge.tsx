'use client'

import type { PublicPresence } from '@/lib/presence'
import { Terminal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getLatestPresenceSnapshot, PRESENCE_UPDATE_EVENT } from './presence'

interface HeroLiveBadgeProps {
  location: string
}

/**
 * 首页 Hero 顶部无边框工位状态行。
 * 复用页头 PresenceStatus 广播的 `/api/presence` 快照，以细线锚点与等宽文字展示工位状态，不发起重复请求。
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
      {location && <span className="text-foreground/90">{location}</span>}
      {location && (
        <span aria-hidden="true" className="text-muted-foreground/45">
          ·
        </span>
      )}
      <span className="inline-flex min-w-0 items-center gap-1.5 text-foreground/80">
        <Terminal
          aria-hidden="true"
          className={`size-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
          strokeWidth={1.75}
        />
        <span className="truncate">
          {isActive ? (activeTool ? `工位在线 · ${activeTool}` : '工位在线') : '工位待机'}
        </span>
      </span>
    </div>
  )
}
