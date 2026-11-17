'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

export interface YearlyTimelineEntry {
  kind: 'article' | 'note'
  slug: string
  title: string
  date: string
}

interface YearlyTimelineProps {
  entries: YearlyTimelineEntry[]
  totalYearCount: number
  yearLabel: string
}

const QUARTER_TICKS = [
  { short: 'Q1', detail: ' · 1月', pos: 0 },
  { short: 'Q2', detail: ' · 4月', pos: 25 },
  { short: 'Q3', detail: ' · 7月', pos: 50 },
  { short: 'Q4', detail: ' · 10月', pos: 75 },
  { short: '12月', detail: '', pos: 100 },
] as const

function formatMonthDay(iso: string): string {
  return iso.slice(5, 10) || iso
}

function getYearProgress(iso: string, year: number): number {
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year + 1, 0, 1)
  const t = new Date(iso).getTime()
  if (Number.isNaN(t) || end <= start) return 50
  const pct = ((t - start) / (end - start)) * 100
  return Math.min(98.5, Math.max(1.5, pct))
}

/**
 * 首页「创作脉络」双轨季度刻度组件（无卡片外壳）。
 * 上轨展示「文章」（实心青节点），下轨展示「笔记」（空心环节点），悬停或聚焦节点浮现边缘安全定位提示卡。
 */
export function YearlyTimeline({ entries, totalYearCount, yearLabel }: YearlyTimelineProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [todayPct, setTodayPct] = useState<number | null>(null)

  const targetYear = useMemo(() => {
    const parsed = Number.parseInt(yearLabel, 10)
    return Number.isNaN(parsed) ? new Date().getFullYear() : parsed
  }, [yearLabel])

  useEffect(() => {
    const now = new Date()
    if (now.getFullYear() === targetYear) {
      setTodayPct(getYearProgress(now.toISOString(), targetYear))
    } else {
      setTodayPct(null)
    }
  }, [targetYear])

  const { articles, notes, hoveredNode } = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
    const active = hoveredKey ? sorted.find((e) => `${e.kind}-${e.slug}` === hoveredKey) : undefined
    return {
      articles: sorted.filter((e) => e.kind === 'article'),
      notes: sorted.filter((e) => e.kind === 'note'),
      hoveredNode: active ? { entry: active, leftPct: getYearProgress(active.date, targetYear) } : null,
    }
  }, [entries, hoveredKey, targetYear])

  if (entries.length === 0) return null

  const renderTrackNodes = (items: YearlyTimelineEntry[], kind: 'article' | 'note') =>
    items.map((entry) => {
      const nodeKey = `${entry.kind}-${entry.slug}`
      const leftPct = getYearProgress(entry.date, targetYear)
      const isHovered = hoveredKey === nodeKey
      const href = entry.kind === 'article' ? `/blog/${entry.slug}` : `/notes/${entry.slug}`

      return (
        <div
          key={nodeKey}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${leftPct}%` }}
        >
          <Link
            href={href}
            aria-label={`${kind === 'article' ? '文章' : '笔记'}：${entry.title}（${formatMonthDay(entry.date)}）`}
            onMouseEnter={() => setHoveredKey(nodeKey)}
            onMouseLeave={() => setHoveredKey(null)}
            onFocus={() => setHoveredKey(nodeKey)}
            onBlur={() => setHoveredKey(null)}
            className="hit-expand group relative flex size-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {kind === 'article' ? (
              <span
                className={`ink-glide rounded-full ${
                  isHovered
                    ? 'size-2.5 scale-125 bg-primary shadow-[0_0_0_4px_color-mix(in_oklch,hsl(var(--primary))_18%,transparent)]'
                    : 'size-2 bg-primary/85 group-hover:scale-125'
                }`}
              />
            ) : (
              <span
                className={`ink-glide rounded-full border-[1.75px] bg-background ${
                  isHovered
                    ? 'size-2.5 scale-125 border-primary shadow-[0_0_0_4px_color-mix(in_oklch,hsl(var(--primary))_18%,transparent)]'
                    : 'size-2 border-foreground/55 group-hover:scale-125 group-hover:border-primary'
                }`}
              />
            )}
          </Link>
        </div>
      )
    })

  return (
    <section aria-label="年度记录" className="entrance border-t border-hair pt-8 [--entrance-delay:240ms]">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl font-medium tracking-tight text-foreground sm:text-2xl">
          {yearLabel} 年记录
        </h2>

        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
            <span>文章 ({articles.length})</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full border-[1.75px] border-foreground/60" />
            <span>笔记 ({notes.length})</span>
          </span>
          <Link
            href="/blog/archives"
            className="group/ink inline-flex items-center gap-1 text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="ink-line">归档 ({totalYearCount})</span>
            <span aria-hidden="true" className="ink-glide group-hover/ink:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>

      {/* 双轨季度刻度场 */}
      <div className="relative px-1 sm:px-2">
        <div className="relative flex flex-col gap-6 py-2">
          {/* 按比例自适应左/右贴边的悬停提示卡，保证任意视口不裁切 */}
          {hoveredNode && (
            <div
              role="tooltip"
              style={{
                left: `${hoveredNode.leftPct}%`,
                transform: `translateX(-${hoveredNode.leftPct}%)`,
              }}
              className="pointer-events-none absolute bottom-[calc(100%+6px)] z-30 flex max-w-[min(230px,calc(100%-0.5rem))] items-center gap-2 whitespace-nowrap rounded-md border border-hair bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md"
            >
              <span className="shrink-0 font-mono text-[10px] font-medium text-primary">
                {hoveredNode.entry.kind === 'article' ? '文章' : '笔记'}
              </span>
              <span className="truncate font-serif text-foreground">{hoveredNode.entry.title}</span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                {formatMonthDay(hoveredNode.entry.date)}
              </span>
            </div>
          )}

          {QUARTER_TICKS.slice(1, 4).map((tick) => (
            <span
              key={tick.short}
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 top-0 w-px bg-hair/80"
              style={{ left: `${tick.pos}%` }}
            />
          ))}

          {todayPct !== null && (
            <div
              aria-hidden="true"
              style={{ left: `${todayPct}%` }}
              className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-primary/55"
            >
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-background px-1 font-mono text-[9px] leading-tight text-primary">
                今
              </span>
            </div>
          )}

          <div className="relative flex h-7 items-center">
            <div aria-hidden="true" className="h-px w-full bg-hair" />
            {renderTrackNodes(articles, 'article')}
          </div>

          <div className="relative flex h-7 items-center">
            <div aria-hidden="true" className="h-px w-full border-t border-dashed border-hair" />
            {renderTrackNodes(notes, 'note')}
          </div>
        </div>

        <div className="relative mt-2 h-5 w-full select-none font-mono text-[10px] text-muted-foreground">
          {QUARTER_TICKS.map((tick, idx) => (
            <span
              key={tick.short}
              className={`absolute ${
                idx === 0
                  ? 'left-0 translate-x-0'
                  : idx === QUARTER_TICKS.length - 1
                    ? 'right-0 translate-x-0'
                    : '-translate-x-1/2'
              }`}
              style={idx === 0 || idx === QUARTER_TICKS.length - 1 ? undefined : { left: `${tick.pos}%` }}
            >
              {tick.short}
              {tick.detail && <span className="hidden sm:inline">{tick.detail}</span>}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
