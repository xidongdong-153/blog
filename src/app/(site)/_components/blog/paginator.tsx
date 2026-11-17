import Link from 'next/link'

export interface PaginationLink {
  url: string
  text?: string
  srLabel?: string
}

export interface PaginatorProps {
  prevUrl?: PaginationLink
  nextUrl?: PaginationLink
  className?: string
}

/**
 * 分页导航器组件（无按钮排版，悬停展开墨线）。
 */
export function Paginator({ prevUrl, nextUrl, className = '' }: PaginatorProps) {
  if (!prevUrl && !nextUrl) return null

  return (
    <nav aria-label="分页导航" className={`mt-6 flex items-center gap-x-4 text-sm sm:mt-8 ${className}`}>
      {prevUrl && (
        <Link
          href={prevUrl.url}
          className="group/ink me-auto inline-flex items-center gap-1.5 py-2 font-serif text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {prevUrl.srLabel && <span className="sr-only">{prevUrl.srLabel}</span>}
          <span aria-hidden="true" className="ink-glide group-hover/ink:-translate-x-1">
            ←
          </span>
          <span className="ink-line">{prevUrl.text?.replace(/^←\s*/, '') ?? '上一页'}</span>
        </Link>
      )}
      {nextUrl && (
        <Link
          href={nextUrl.url}
          className="group/ink ms-auto inline-flex items-center gap-1.5 py-2 font-serif text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {nextUrl.srLabel && <span className="sr-only">{nextUrl.srLabel}</span>}
          <span className="ink-line">{nextUrl.text?.replace(/\s*→$/, '') ?? '下一页'}</span>
          <span aria-hidden="true" className="ink-glide group-hover/ink:translate-x-1">
            →
          </span>
        </Link>
      )}
    </nav>
  )
}
