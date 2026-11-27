'use client'

import type { FriendLinkItem } from '@/server/modules/links/links.types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatDate } from '@/lib/date'
import { formatDisplayUrl, FriendAvatar } from './friend-links-directory'
import { buildFriendsVeinGeometry, renderFriendsVein } from './friends-vein'

const VEIN_HEIGHT = 196
const MIN_NODE_STEP = 112
const SEEP_DURATION_MS = 340

function getLinkKey(link: FriendLinkItem): string {
  return String(link.id ?? link.url)
}

function isDarkTheme(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 友链分形石脉交互视图。
 * 复用全站岩石细纹与目录导轨的松烟墨青视觉语言：悬停或聚焦矿晶节点时沿支脉渗墨并在下方原位预览，点击直接打开目标站点。
 */
export function FriendsVeinStage({ links }: { links: FriendLinkItem[] }) {
  const [activeKey, setActiveKey] = useState<string>(() => (links[0] ? getLinkKey(links[0]) : ''))
  const [containerWidth, setContainerWidth] = useState(760)
  const [dark, setDark] = useState(false)

  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const seepRef = useRef(1)

  const resolvedActiveKey = useMemo(() => {
    if (links.length === 0) return ''
    return links.some((link) => getLinkKey(link) === activeKey) ? activeKey : getLinkKey(links[0])
  }, [activeKey, links])

  const activeLink = useMemo(
    () => links.find((link) => getLinkKey(link) === resolvedActiveKey) ?? links[0] ?? null,
    [links, resolvedActiveKey],
  )

  // 容器宽度监听（节点多或手机窄屏时允许局部横向平滑滚动，避免标签重叠与整页横向溢出）
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const syncWidth = () => {
      const next = Math.floor(el.clientWidth)
      if (next > 0) setContainerWidth(next)
    }

    syncWidth()
    const observer = new ResizeObserver(syncWidth)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 监听明暗主题切换以重绘 Canvas
  useEffect(() => {
    setDark(isDarkTheme())
    const observer = new MutationObserver(() => {
      setDark(isDarkTheme())
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const canvasWidth = useMemo(
    () => Math.max(containerWidth, links.length * MIN_NODE_STEP),
    [containerWidth, links.length],
  )

  const geometry = useMemo(
    () =>
      buildFriendsVeinGeometry(
        links.map((link) => ({ key: getLinkKey(link) })),
        canvasWidth,
        VEIN_HEIGHT,
      ),
    [canvasWidth, links],
  )

  const paint = useCallback(
    (progress: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const targetW = Math.floor(geometry.width * dpr)
      const targetH = Math.floor(geometry.height * dpr)
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW
        canvas.height = targetH
      }

      renderFriendsVein(ctx, geometry, dpr, {
        dark,
        activeKey: resolvedActiveKey || null,
        seepProgress: progress,
      })
    },
    [dark, geometry, resolvedActiveKey],
  )

  // 节点切换时执行一次有限时长的渗墨动画，结束后停机
  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (prefersReducedMotion()) {
      seepRef.current = 1
      paint(1)
      return
    }

    const startTime = performance.now()
    const step = (now: number) => {
      const raw = Math.min(1, (now - startTime) / SEEP_DURATION_MS)
      const eased = 1 - (1 - raw) ** 3
      seepRef.current = eased
      paint(eased)
      if (raw < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [paint])

  // 当通过下方索引或“换一个”切到可视区域外的节点时，将其滚动居中
  const scrollNodeIntoView = useCallback(
    (key: string) => {
      const el = viewportRef.current
      if (!el || geometry.width <= el.clientWidth) return
      const target = geometry.nodes.find((node) => node.key === key)
      if (!target) return
      const desiredLeft = Math.max(0, target.tipX - el.clientWidth / 2)
      el.scrollTo({
        left: desiredLeft,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
    },
    [geometry],
  )

  const handleCycleNext = useCallback(() => {
    if (links.length <= 1) return
    const candidates = links.filter((link) => getLinkKey(link) !== resolvedActiveKey)
    const picked = candidates[Math.floor(Math.random() * candidates.length)]
    if (!picked) return
    const nextKey = getLinkKey(picked)
    setActiveKey(nextKey)
    scrollNodeIntoView(nextKey)
  }, [links, resolvedActiveKey, scrollNodeIntoView])

  if (!activeLink) return null

  const activeOwner = activeLink.ownerName?.trim()
  const showActiveOwner = Boolean(activeOwner && activeOwner !== activeLink.name.trim())

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="友链石脉图" className="border-y border-hair py-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-xs text-muted-foreground">悬停查看，点击打开</span>
          {links.length > 1 && (
            <button
              type="button"
              onClick={handleCycleNext}
              className="group/ink hit-expand inline-flex cursor-pointer items-center gap-1 font-mono text-xs text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="ink-line">换一个</span>
            </button>
          )}
        </div>

        {/* 横向分形石脉舞台 */}
        <div ref={viewportRef} className="no-scrollbar relative w-full overflow-x-auto">
          <div className="relative select-none" style={{ width: `${geometry.width}px`, height: `${VEIN_HEIGHT}px` }}>
            <canvas ref={canvasRef} aria-hidden="true" className="block size-full" />

            {geometry.nodes.map((node) => {
              const link = links[node.index]
              if (!link) return null
              const isActive = node.key === resolvedActiveKey
              const labelTop = node.dir < 0 ? Math.max(4, node.tipY - 25) : Math.min(VEIN_HEIGHT - 20, node.tipY + 11)

              return (
                <div key={node.key}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${link.name}：${link.description}`}
                    onMouseEnter={() => setActiveKey(node.key)}
                    onFocus={() => setActiveKey(node.key)}
                    style={{ left: `${node.tipX}px`, top: `${node.tipY}px` }}
                    className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring"
                  />
                  <span
                    aria-hidden="true"
                    style={{ left: `${node.tipX}px`, top: `${labelTop}px` }}
                    className={`pointer-events-none absolute max-w-[104px] -translate-x-1/2 truncate text-xs transition-colors duration-200 ${
                      isActive ? 'font-medium text-primary' : 'text-muted-foreground/80'
                    }`}
                  >
                    {link.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 固定高度原位预览栏 */}
        <div
          aria-live="polite"
          className="mt-3 flex min-h-[84px] flex-col justify-between gap-4 border-t border-hair pt-4 sm:flex-row sm:items-center sm:gap-6"
        >
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="pt-0.5">
              <FriendAvatar
                key={resolvedActiveKey}
                name={activeLink.name}
                avatarUrl={activeLink.avatarUrl}
                size="md"
                quiet={false}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h2 className="font-serif text-xl font-medium text-foreground [overflow-wrap:anywhere]">
                  {activeLink.name}
                </h2>
                {showActiveOwner && <span className="text-xs text-muted-foreground">· {activeOwner}</span>}
                {activeLink.createdAt && (
                  <time
                    dateTime={activeLink.createdAt}
                    className="font-mono text-xs tabular-nums text-muted-foreground/75"
                  >
                    · {formatDate(activeLink.createdAt)} 加入
                  </time>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {activeLink.description}
              </p>
            </div>
          </div>

          <a
            href={activeLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/ink hit-expand inline-flex min-h-9 shrink-0 items-center gap-1.5 self-start font-mono text-xs text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:self-center"
          >
            <span className="ink-line break-all sm:max-w-[15rem] sm:truncate">{formatDisplayUrl(activeLink.url)}</span>
            <span
              aria-hidden="true"
              className="ink-glide shrink-0 group-hover/ink:translate-x-0.5 group-hover/ink:-translate-y-0.5"
            >
              ↗
            </span>
          </a>
        </div>
      </section>

      {/* 下方紧凑站点索引：悬停联动上方石脉，点击直接访问 */}
      <section aria-label="全部站点" className="flex flex-col gap-3">
        <div className="font-mono text-xs text-muted-foreground">全部站点</div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2.5">
          {links.map((link, index) => {
            const key = getLinkKey(link)
            const isActive = key === resolvedActiveKey
            return (
              <li key={key}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-active={isActive ? 'true' : undefined}
                  onMouseEnter={() => {
                    setActiveKey(key)
                    scrollNodeIntoView(key)
                  }}
                  onFocus={() => {
                    setActiveKey(key)
                    scrollNodeIntoView(key)
                  }}
                  className="group/ink hit-expand inline-flex items-baseline gap-1.5 py-0.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={`ink-line font-serif ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {link.name}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
