'use client'

import { RefreshCw, Search } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { siteConfig } from '@/site.config'
import { useOverlayMotion } from '../site/use-overlay-motion'

export interface ConstellationFriend {
  name: string
  url: string
  description: string
  avatarUrl?: string | null
}

const NODE_TINTS = [
  'bg-amber-500/18 text-amber-800 dark:text-amber-200 border-amber-500/35',
  'bg-rose-500/16 text-rose-800 dark:text-rose-200 border-rose-500/35',
  'bg-emerald-500/16 text-emerald-800 dark:text-emerald-200 border-emerald-500/35',
  'bg-sky-500/16 text-sky-800 dark:text-sky-200 border-sky-500/35',
] as const

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/**
 * 交互式「友邻星图」组件（无外层卡片盒）。
 * 以中心主站为锚点在正交网格底图上放射连接各友邻节点，悬停或聚焦时高亮对应连线并展示站点简介。
 */
export function FriendsConstellation({ friends }: { friends: ConstellationFriend[] }) {
  const [seedOffset, setSeedOffset] = useState(1)
  const [filter, setFilter] = useState('')
  const [activeFriend, setActiveFriend] = useState<ConstellationFriend | null>(null)
  const [lastFriend, setLastFriend] = useState<ConstellationFriend | null>(null)
  const triggerRef = useRef<HTMLAnchorElement | null>(null)
  const { present, anchorRef, surfaceRef } = useOverlayMotion({
    open: Boolean(activeFriend),
    triggerRef,
    duration: 240,
    exitDuration: 180,
  })

  const activate = (friend: ConstellationFriend, trigger: HTMLAnchorElement) => {
    triggerRef.current = trigger
    setLastFriend(friend)
    setActiveFriend(friend)
  }
  const shownFriend = activeFriend ?? lastFriend

  const normalizedQuery = filter.trim().toLowerCase()

  const positioned = useMemo(() => {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    return friends.map((friend, idx) => {
      const r = 16 + Math.sqrt((idx + 0.9) / Math.max(friends.length, 1)) * 28
      const angle = idx * goldenAngle + seedOffset * 1.15 + seededUnit(idx + seedOffset * 17) * 0.6
      const x = Math.min(88, Math.max(12, 50 + Math.cos(angle) * r * 1.3))
      const y = Math.min(84, Math.max(16, 50 + Math.sin(angle) * r * 0.85))
      const matches =
        !normalizedQuery ||
        friend.name.toLowerCase().includes(normalizedQuery) ||
        friend.description.toLowerCase().includes(normalizedQuery)
      return { friend, x, y, matches, tint: NODE_TINTS[idx % NODE_TINTS.length]! }
    })
  }, [friends, seedOffset, normalizedQuery])

  return (
    <div className="relative overflow-hidden border-y border-hair">
      {/* 正交制图网格 + 中心辐射连线 SVG */}
      <svg
        aria-hidden="true"
        viewBox="0 0 800 380"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full"
      >
        <defs>
          <pattern id="friends-grid-dots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="0.85" className="fill-foreground/12" />
          </pattern>
        </defs>
        <rect width="800" height="380" fill="url(#friends-grid-dots)" />

        {/* 同心拓扑辅助圆 */}
        <circle cx="400" cy="190" r="76" fill="none" className="stroke-foreground/[0.06]" strokeDasharray="3 4" />
        <circle cx="400" cy="190" r="146" fill="none" className="stroke-foreground/[0.06]" strokeDasharray="3 4" />

        {/* 中心节点到友邻连线 */}
        {positioned.map(({ friend, x, y, matches }) => {
          const isSelected = activeFriend?.url === friend.url
          return (
            <line
              key={`edge-${friend.url}`}
              x1="400"
              y1="190"
              x2={(x / 100) * 800}
              y2={(y / 100) * 380}
              stroke="currentColor"
              strokeWidth={isSelected ? '1.6' : '0.9'}
              className={
                isSelected
                  ? 'text-primary/70 transition-all duration-200'
                  : matches
                    ? 'text-foreground/10 transition-all duration-200'
                    : 'text-foreground/[0.03]'
              }
            />
          )
        })}
      </svg>

      {/* 顶部栏：星图标题 + 下划线节点检索 */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-4">
        <span className="font-mono text-xs text-muted-foreground">友邻星图</span>

        <div className="relative flex w-full items-center sm:w-52">
          <Search aria-hidden="true" className="pointer-events-none absolute left-0.5 size-3.5 text-muted-foreground" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="过滤友邻节点..."
            aria-label="在图谱中搜索友邻"
            className="w-full border-0 border-b border-hair bg-transparent py-1.5 pl-6 pr-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>
      </div>

      {/* 拓扑舞台 */}
      <div className="relative z-10 h-[280px] w-full sm:h-[320px]">
        {/* 中心主站锚点 */}
        {friends.length > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-md border border-primary/40 bg-card/95 px-2.5 py-1 font-mono text-[10px] font-medium text-primary shadow-xs"
          >
            {siteConfig.author}
          </div>
        )}

        {friends.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center font-serif text-sm text-muted-foreground">
            图谱尚未收录友邻节点。
          </div>
        ) : (
          positioned.map(({ friend, x, y, matches, tint }) => {
            const isSelected = activeFriend?.url === friend.url
            const initial = friend.name.trim().slice(0, 1).toUpperCase()
            return (
              <a
                key={friend.url}
                href={friend.url}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={(event) => activate(friend, event.currentTarget)}
                onMouseLeave={(event) => {
                  if (document.activeElement !== event.currentTarget) setActiveFriend(null)
                }}
                onFocus={(event) => activate(friend, event.currentTarget)}
                onBlur={(event) => {
                  if (!event.currentTarget.matches(':hover')) setActiveFriend(null)
                }}
                aria-label={`${friend.name}：${friend.description}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-xl transition-all duration-500 ease-[var(--ease-spring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  matches ? 'opacity-100 scale-100' : 'opacity-20 scale-90 pointer-events-none'
                } ${isSelected ? 'z-20 scale-125' : 'z-10 hover:z-20 hover:scale-115'}`}
              >
                <div
                  className={`flex size-9 items-center justify-center overflow-hidden rounded-xl border shadow-xs backdrop-blur-xs transition-shadow ${tint} ${
                    isSelected ? 'ring-2 ring-primary/45 shadow-md' : 'group-hover:ring-2 group-hover:ring-primary/35'
                  }`}
                >
                  {friend.avatarUrl ? (
                    // eslint-disable-next-line next/no-img-element
                    <img src={friend.avatarUrl} alt={friend.name} className="size-full object-cover" />
                  ) : (
                    <span className="font-serif text-xs font-medium">{initial}</span>
                  )}
                </div>
              </a>
            )
          })
        )}

        {/* 悬停节点详情浮卡 */}
        {present && shownFriend && (
          <div
            ref={anchorRef}
            className="pointer-events-none absolute inset-x-0 bottom-3 z-30 mx-auto w-[min(90%,340px)]"
          >
            <div
              ref={surfaceRef}
              aria-hidden="true"
              inert
              className="origin-top-left rounded-lg border border-hair bg-popover/95 px-3.5 py-2.5 text-center shadow-md backdrop-blur-sm"
            >
              <div className="flex min-w-0 items-center justify-center gap-1.5 text-xs font-medium text-foreground">
                <span className="truncate">{shownFriend.name}</span>
                <span className="shrink-0 text-primary">↗</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                {shownFriend.description}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 底部提示与重排 */}
      <div className="relative z-10 flex items-center justify-between border-t border-hair py-3 font-mono text-[11px] text-muted-foreground">
        <span>悬停或聚焦节点查看简介</span>
        <button
          type="button"
          onClick={() => {
            setSeedOffset((prev) => prev + 1)
            setActiveFriend(null)
          }}
          className="group/ink inline-flex cursor-pointer items-center gap-1.5 py-0.5 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="ink-line">重排节点</span>
          <RefreshCw className="ink-glide size-3 group-hover/ink:rotate-90" />
        </button>
      </div>
    </div>
  )
}
