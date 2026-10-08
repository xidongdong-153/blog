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
 * 博客文章列表页顶部的精选专栏推荐卡片。
 * 提供专栏定位、连载状态、已收录讲次与直达专栏大纲入口。
 */
export function SeriesBanner({ series }: SeriesBannerProps) {
  return (
    <div className="group relative flex flex-col gap-4 rounded-lg border border-border/60 bg-card/30 p-6 transition-all hover:border-foreground/30 hover:bg-muted/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
          <span className="font-semibold text-foreground/80">// 精选系列</span>
          <span>/</span>
          <span
            className={
              series.status === 'in-progress' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
            }
          >
            {SERIES_STATUS_LABELS[series.status]}
          </span>
        </div>

        <span className="font-mono text-xs text-muted-foreground">已更新 {series.postsCount} 讲</span>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-serif text-xl font-medium tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-2xl">
          <Link href={`/blog/series/${series.id}`}>{series.title}</Link>
        </h2>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{series.description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/30">
        <div className="flex flex-wrap gap-2 font-mono text-xs text-muted-foreground">
          {series.tags.map((tag) => (
            <span key={tag} className="select-none">
              #{tag}
            </span>
          ))}
        </div>

        <Link
          href={`/blog/series/${series.id}`}
          className="inline-flex items-center gap-1 font-mono text-xs text-primary transition-transform group-hover:translate-x-0.5"
        >
          <span>浏览专栏大纲</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  )
}
