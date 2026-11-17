import type { SeriesDefinition } from '@/lib/series'
import Link from 'next/link'
import { SERIES_STATUS_LABELS } from '@/lib/series'
import { PaperSurface } from '../site/paper-surface'

export interface SeriesBannerProps {
  series: SeriesDefinition & {
    postsCount: number
    lastUpdated: string
  }
}

/**
 * 博客列表页顶部精选专栏纸卡。
 */
export function SeriesBanner({ series }: SeriesBannerProps) {
  return (
    <div className="relative isolate flex flex-col gap-2.5 rounded-lg p-5 transition-colors hover:[&>span]:border-primary/35">
      <PaperSurface className="bg-card/90" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-xs text-primary">
          <span>精选专栏</span>
          <span aria-hidden="true" className="text-muted-foreground/40">
            ·
          </span>
          <span
            className={series.status === 'in-progress' ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}
          >
            {SERIES_STATUS_LABELS[series.status]}
          </span>
        </div>

        <span className="font-mono text-xs tabular-nums text-muted-foreground">已更新 {series.postsCount} 讲</span>
      </div>

      <h2 className="font-serif text-xl font-medium tracking-tight text-foreground">
        <Link
          href={`/blog/series/${series.id}`}
          className="rounded-sm transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {series.title}
        </Link>
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1">
        <div className="flex flex-wrap gap-2 font-mono text-xs text-muted-foreground/80">
          {series.tags.map((tag) => (
            <span key={tag} className="select-none">
              {tag}
            </span>
          ))}
        </div>

        <Link
          href={`/blog/series/${series.id}`}
          className="inline-flex min-h-9 items-center gap-1 rounded-sm font-serif text-xs italic text-primary hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span>浏览专栏大纲</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  )
}
