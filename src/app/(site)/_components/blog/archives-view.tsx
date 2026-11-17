'use client'

import type { BlogCategory } from '@/lib/blog-meta'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BLOG_CATEGORY_LABELS } from '@/lib/blog-meta'
import { FilterLabel } from './filter-label'

export interface TimelineArchiveEntry {
  kind: 'article' | 'note'
  slug: string
  title: string
  date: string
  category?: BlogCategory
  aiGenerated?: boolean
}

const MONTH_META = [
  { cn: '01月', en: 'JAN' },
  { cn: '02月', en: 'FEB' },
  { cn: '03月', en: 'MAR' },
  { cn: '04月', en: 'APR' },
  { cn: '05月', en: 'MAY' },
  { cn: '06月', en: 'JUN' },
  { cn: '07月', en: 'JUL' },
  { cn: '08月', en: 'AUG' },
  { cn: '09月', en: 'SEP' },
  { cn: '10月', en: 'OCT' },
  { cn: '11月', en: 'NOV' },
  { cn: '12月', en: 'DEC' },
] as const

function computeTimeMetrics(now: Date) {
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000) + 1
  const yearPercentExact = Math.min(
    100,
    Math.max(0, ((now.getTime() - startOfYear.getTime()) / (endOfYear.getTime() - startOfYear.getTime())) * 100),
  )
  const yearPercent = Math.round(yearPercentExact)

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayPercent = (((now.getTime() - startOfDay.getTime()) / 86_400_000) * 100).toFixed(2)

  return { dayOfYear, yearPercent, yearPercentExact, todayPercent }
}

/**
 * 写作归档时间线视图组件。
 * 无框文字密度切换（标准 · 紧凑），列表行采用左侧墨线与轻右移悬停交互。
 */
export function ArchivesView({ entries }: { entries: TimelineArchiveEntry[] }) {
  const [density, setDensity] = useState<'relaxed' | 'compact'>('relaxed')
  const [metrics, setMetrics] = useState<{
    dayOfYear: number
    yearPercent: number
    yearPercentExact: number
    todayPercent: string
  } | null>(null)

  useEffect(() => {
    const update = () => setMetrics(computeTimeMetrics(new Date()))
    update()
    const timer = window.setInterval(update, 15_000)
    return () => window.clearInterval(timer)
  }, [])

  const { articleCount, noteCount, groupedByYear } = useMemo(() => {
    let articles = 0
    let notes = 0
    const years = new Map<string, Map<string, TimelineArchiveEntry[]>>()
    for (const entry of entries) {
      if (entry.kind === 'article') articles += 1
      else notes += 1

      const year = entry.date.slice(0, 4) || '未知'
      const month = entry.date.slice(5, 7) || '01'
      let yearMap = years.get(year)
      if (!yearMap) {
        yearMap = new Map()
        years.set(year, yearMap)
      }
      const list = yearMap.get(month) ?? []
      list.push(entry)
      yearMap.set(month, list)
    }
    return { articleCount: articles, noteCount: notes, groupedByYear: years }
  }, [entries])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
      {/* 头部时间与产量遥测区 */}
      <header className="flex flex-col gap-6 border-b border-hair pb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">写作归档</h1>

          <div role="group" aria-label="视图密度" className="inline-flex items-center gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => setDensity('relaxed')}
              aria-pressed={density === 'relaxed'}
              className={`group/filter inline-flex min-h-9 cursor-pointer items-center py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                density === 'relaxed' ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FilterLabel active={density === 'relaxed'}>标准</FilterLabel>
            </button>
            <span aria-hidden="true" className="text-muted-foreground/40">
              ·
            </span>
            <button
              type="button"
              onClick={() => setDensity('compact')}
              aria-pressed={density === 'compact'}
              className={`group/filter inline-flex min-h-9 cursor-pointer items-center py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                density === 'compact' ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FilterLabel active={density === 'compact'}>紧凑</FilterLabel>
            </button>
          </div>
        </div>

        {/* 遥测指标行 */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <div className="font-serif text-3xl font-medium tabular-nums text-foreground">{entries.length}</div>
            <span className="font-mono text-[11px] text-muted-foreground">
              公开记录（{articleCount} 文章 · {noteCount} 笔记）
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="font-serif text-3xl font-medium tabular-nums text-primary">
              {metrics ? metrics.dayOfYear : '--'}
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">今年第几天</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="font-serif text-3xl font-medium tabular-nums text-foreground">
              {metrics ? metrics.yearPercent : '--'}
              <span className="ml-0.5 text-sm text-muted-foreground">%</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">年度进度</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="font-serif text-3xl font-medium tabular-nums text-foreground">
              {metrics ? metrics.todayPercent : '--'}
              <span className="ml-0.5 text-sm text-muted-foreground">%</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">今日进度</span>
          </div>
        </div>

        {/* 细年度进度轨 */}
        <div aria-hidden="true" className="h-[2px] w-full overflow-hidden rounded-full bg-hair">
          <div
            className="h-full rounded-full bg-primary/75 transition-[width] duration-500 ease-[var(--ease-spring)]"
            style={{ width: `${metrics ? metrics.yearPercentExact : 0}%` }}
          />
        </div>
      </header>

      {/* 年份与月份归档列表 */}
      {groupedByYear.size === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">还没有文章或笔记。</p>
      ) : (
        <div className="flex flex-col gap-12">
          {[...groupedByYear.entries()].map(([year, monthsMap]) => {
            const yearCount = [...monthsMap.values()].reduce((sum, list) => sum + list.length, 0)
            return (
              <section key={year} className="flex flex-col gap-6">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-serif text-2xl font-medium tabular-nums text-foreground">{year}</h2>
                  <span className="font-mono text-xs text-muted-foreground">{yearCount} 篇</span>
                </div>

                <div className="flex flex-col gap-6">
                  {[...monthsMap.entries()].map(([monthStr, list]) => {
                    const monthIdx = Math.max(0, Math.min(11, (Number.parseInt(monthStr, 10) || 1) - 1))
                    const monthMeta = MONTH_META[monthIdx] ?? MONTH_META[0]
                    return (
                      <div key={monthStr} className="flex flex-col gap-2">
                        <h3 className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                          {monthMeta.cn} · {monthMeta.en}
                        </h3>
                        <ul className="flex flex-col border-l border-hair pl-4">
                          {list.map((entry) => {
                            const day = entry.date.slice(8, 10) || '--'
                            const href = entry.kind === 'article' ? `/blog/${entry.slug}` : `/notes/${entry.slug}`
                            const metaText =
                              entry.kind === 'note'
                                ? '笔记'
                                : entry.category
                                  ? BLOG_CATEGORY_LABELS[entry.category]
                                  : '文章'

                            return (
                              <li key={`${entry.kind}-${entry.slug}`}>
                                <Link
                                  href={href}
                                  className={`ink-row group/item block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                                    density === 'relaxed' ? 'py-2.5' : 'py-1.5'
                                  }`}
                                >
                                  <div className="ink-glide flex items-baseline justify-between gap-4 group-hover/item:translate-x-2 group-focus-visible/item:translate-x-2">
                                    <div className="flex min-w-0 items-baseline gap-3.5">
                                      <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-muted-foreground transition-colors group-hover/item:text-primary">
                                        {day}
                                      </span>
                                      <span className="truncate font-serif text-[15px] text-foreground transition-colors group-hover/item:text-primary">
                                        {entry.title}
                                      </span>
                                    </div>
                                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                                      {metaText}
                                    </span>
                                  </div>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
