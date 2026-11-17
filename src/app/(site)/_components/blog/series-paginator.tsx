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
 * 专栏文章详情页文末导轨组件（无套娃卡片，纯发丝线排版）。
 */
export function SeriesPaginator({ nav }: SeriesPaginatorProps) {
  const { series, prev, next } = nav

  return (
    <section aria-label="系列阅读导轨" className="flex flex-col gap-5 border-t border-hair pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">专栏章节导轨</span>

        <Link
          href={`/blog/series/${series.id}`}
          className="group/ink inline-flex items-center gap-1 font-mono text-xs text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="ink-line">查看系列完整大纲</span>
          <span aria-hidden="true" className="ink-glide group-hover/ink:translate-x-1">
            →
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/blog/${prev.slug}`}
            className="group/ink flex min-w-0 flex-col items-start gap-1 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors group-hover/ink:text-primary">
              <span aria-hidden="true" className="ink-glide group-hover/ink:-translate-x-1">
                ←
              </span>
              <span>上一讲</span>
            </span>
            <span className="ink-line max-w-full font-serif text-base font-medium text-foreground transition-colors group-hover/ink:text-primary">
              <span className="block truncate">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}

        {next && (
          <Link
            href={`/blog/${next.slug}`}
            className={`group/ink flex min-w-0 flex-col items-end gap-1 py-2 text-right transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              !prev ? 'sm:col-start-2' : ''
            }`}
          >
            <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors group-hover/ink:text-primary">
              <span>下一讲</span>
              <span aria-hidden="true" className="ink-glide group-hover/ink:translate-x-1">
                →
              </span>
            </span>
            <span className="ink-line max-w-full font-serif text-base font-medium text-foreground transition-colors group-hover/ink:text-primary">
              <span className="block truncate">{next.title}</span>
            </span>
          </Link>
        )}
      </div>
    </section>
  )
}
