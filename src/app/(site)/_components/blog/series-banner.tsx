import type { SeriesDefinition } from '@/lib/series'
import Link from 'next/link'
import { SERIES_STATUS_LABELS } from '@/lib/series'

export interface SeriesBannerProps {
  series: SeriesDefinition & {
    postsCount: number
    lastUpdated: string
  }
}

/**
 * 博客列表页顶部精选专栏导览（无卡片外壳）。
 * 以发丝线分隔出专栏标题、连载状态与大纲入口。
 */
export function SeriesBanner({ series }: SeriesBannerProps) {
  return (
    <div className="flex flex-col gap-2.5 border-y border-hair py-5">
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
          className="ink-link inline-block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {series.title}
        </Link>
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-0.5">
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground/80">
          {series.tags.map((tag) => (
            <span key={tag} className="select-none">
              #{tag}
            </span>
          ))}
        </div>

        <Link
          href={`/blog/series/${series.id}`}
          className="group/ink inline-flex items-center gap-1 rounded-sm font-serif text-xs italic text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="ink-line">浏览专栏大纲</span>
          <span aria-hidden="true" className="ink-glide group-hover/ink:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </div>
  )
}
