import type { BlogPost } from '@/lib/content'
import type { SeriesDefinition } from '@/lib/series'
import Link from 'next/link'

export interface SeriesNavData {
  series: SeriesDefinition
  prev?: BlogPost
  next?: BlogPost
  currentIndex: number
  totalCount: number
}

export interface SeriesPaginatorProps {
  nav: SeriesNavData
}

/**
 * 专栏文章详情页文末导轨组件。
 * 展示所属专栏并提供上一讲、下一讲卡片与返回专栏完整大纲的链接。
 */
export function SeriesPaginator({ nav }: SeriesPaginatorProps) {
  const { series, prev, next } = nav

  return (
    <section
      aria-label="系列阅读导轨"
      className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card/20 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-3">
        <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
          <span className="font-semibold text-foreground/80">// 专栏章节导轨</span>
        </div>

        <Link
          href={`/blog/series/${series.id}`}
          className="inline-flex items-center gap-1 font-mono text-xs text-primary transition-colors hover:underline"
        >
          <span>查看系列完整大纲</span>
          <span>→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/blog/${prev.slug}`}
            className="group flex flex-col gap-1 rounded-md border border-border/40 bg-card/40 p-3.5 transition-all hover:border-foreground/30 hover:bg-muted/30"
          >
            <span className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-primary">
              ← 上一讲
            </span>
            <span className="line-clamp-1 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
              {prev.title}
            </span>
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}

        {next && (
          <Link
            href={`/blog/${next.slug}`}
            className={`group flex flex-col gap-1 rounded-md border border-border/40 bg-card/40 p-3.5 text-right transition-all hover:border-foreground/30 hover:bg-muted/30 ${
              !prev ? 'sm:col-start-2' : ''
            }`}
          >
            <span className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-primary">
              下一讲 →
            </span>
            <span className="line-clamp-1 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
              {next.title}
            </span>
          </Link>
        )}
      </div>
    </section>
  )
}
