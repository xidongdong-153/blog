'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { PaperSurface } from '../site/paper-surface'

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
  { label: 'Q1 · 1月', pos: 0 },
  { label: 'Q2 · 4月', pos: 25 },
  { label: 'Q3 · 7月', pos: 50 },
  { label: 'Q4 · 10月', pos: 75 },
  { label: '12月', pos: 100 },
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
 * 首页「年度创作脉络」双轨季度刻度组件。
 * 1. 上轨展示「文章」（实心茶金节点），下轨展示「笔记」（空心环节点），按真实自然年日历落点。
 * 2. 带有季度刻度 (Q1–Q4) 与实时「此刻」竖向指针，悬停或聚焦节点浮现完整日期与标题纸卡。
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

  const { articles, notes, latest } = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
    return {
      articles: sorted.filter((e) => e.kind === 'article'),
      notes: sorted.filter((e) => e.kind === 'note'),
      latest: sorted[sorted.length - 1],
    }
  }, [entries])

  if (entries.length === 0) return null

  const latestHref = latest ? (latest.kind === 'article' ? `/blog/${latest.slug}` : `/notes/${latest.slug}`) : '/blog'

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
          {isHovered && (
            <div
              role="tooltip"
              className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-30 flex max-w-[240px] -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md"
            >
              <span className="shrink-0 font-mono text-[10px] font-medium text-primary">
                {kind === 'article' ? '文章' : '笔记'}
              </span>
              <span className="truncate font-serif text-foreground">{entry.title}</span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                {formatMonthDay(entry.date)}
              </span>
            </div>
          )}

          <Link
            href={href}
            aria-label={`${kind === 'article' ? '文章' : '笔记'}：${entry.title}（${formatMonthDay(entry.date)}）`}
            onMouseEnter={() => setHoveredKey(nodeKey)}
            onMouseLeave={() => setHoveredKey(null)}
            onFocus={() => setHoveredKey(nodeKey)}
            onBlur={() => setHoveredKey(null)}
            className="group relative flex size-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {kind === 'article' ? (
              <span
                className={`rounded-full transition-all duration-300 ease-[var(--ease-spring)] ${
                  isHovered
                    ? 'size-2.5 scale-125 bg-primary shadow-[0_0_0_4px_color-mix(in_oklch,hsl(var(--primary))_18%,transparent)]'
                    : 'size-2 bg-primary/85 group-hover:scale-125'
                }`}
              />
            ) : (
              <span
                className={`rounded-full border-[1.75px] bg-card transition-all duration-300 ease-[var(--ease-spring)] ${
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
    <section
      aria-label="年度创作脉络"
      className="entrance relative isolate rounded-xl p-5 sm:p-7 [--entrance-delay:280ms]"
    >
      <PaperSurface className="bg-card/85" />

      {/* 顶部栏：标题 + 图例与篇数 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            Cadence · {yearLabel}
          </span>
          <h2 className="font-serif text-xl font-medium tracking-tight text-foreground">年度创作脉络</h2>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
            <span>文章 ({articles.length})</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full border-[1.75px] border-foreground/60 bg-card" />
            <span>笔记 ({notes.length})</span>
          </span>
          <Link href="/blog/archives" className="text-primary transition-colors hover:underline underline-offset-4">
            归档 ({totalYearCount}) →
          </Link>
        </div>
      </div>

      {/* 双轨季度刻度场 */}
      <div className="relative px-2 sm:px-3">
        <div className="relative flex flex-col gap-3 py-1">
          {/* 季度纵向辅助线 */}
          {QUARTER_TICKS.slice(1, 4).map((tick) => (
            <span
              key={tick.label}
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 top-0 w-px bg-hair/80"
              style={{ left: `${tick.pos}%` }}
            />
          ))}

          {/* 实时今日指针 */}
          {todayPct !== null && (
            <div
              aria-hidden="true"
              style={{ left: `${todayPct}%` }}
              className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-primary/50"
            >
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-card px-1 font-mono text-[9px] leading-tight text-primary ring-1 ring-primary/30">
                今
              </span>
            </div>
          )}

          {/* 轨 1：文章 */}
          <div className="relative flex h-7 items-center">
            <div aria-hidden="true" className="h-px w-full bg-hair" />
            {renderTrackNodes(articles, 'article')}
          </div>

          {/* 轨 2：笔记 */}
          <div className="relative flex h-7 items-center">
            <div aria-hidden="true" className="h-px w-full border-t border-dashed border-hair" />
            {renderTrackNodes(notes, 'note')}
          </div>
        </div>

        {/* 季度刻度尺 */}
        <div className="relative mt-2 h-5 w-full select-none font-mono text-[10px] text-muted-foreground">
          {QUARTER_TICKS.map((tick, idx) => (
            <span
              key={tick.label}
              className={`absolute ${
                idx === 0
                  ? 'left-0 translate-x-0'
                  : idx === QUARTER_TICKS.length - 1
                    ? 'right-0 translate-x-0'
                    : '-translate-x-1/2'
              }`}
              style={idx === 0 || idx === QUARTER_TICKS.length - 1 ? undefined : { left: `${tick.pos}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>
      </div>

      {/* 底部最近一条速览 */}
      {latest && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-hair pt-3 text-xs text-muted-foreground">
          <Link href={latestHref} className="inline-flex min-w-0 max-w-full items-center gap-2 hover:text-primary">
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              最新 · {formatMonthDay(latest.date)}
            </span>
            <span className="truncate font-serif text-foreground/90 hover:text-primary">{latest.title}</span>
          </Link>
          <Link
            href="/blog/archives"
            className="shrink-0 font-mono text-[11px] text-muted-foreground hover:text-primary"
          >
            查看完整时间线 →
          </Link>
        </div>
      )}
    </section>
  )
}
