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
 * 分页导航器组件，复刻 Joye Paginator 双端导航结构。
 * 分别在左侧和右侧展示上一页与下一页链接。
 */
export function Paginator({ prevUrl, nextUrl, className = '' }: PaginatorProps) {
  if (!prevUrl && !nextUrl) return null

  return (
    <nav aria-label="分页导航" className={`mt-4 flex items-center gap-x-4 sm:mt-6 text-sm ${className}`}>
      {prevUrl && (
        <Link
          href={prevUrl.url}
          className="me-auto py-2 text-muted-foreground transition-colors hover:text-primary hover:underline"
        >
          {prevUrl.srLabel && <span className="sr-only">{prevUrl.srLabel}</span>}
          {prevUrl.text ?? '← Previous Posts'}
        </Link>
      )}
      {nextUrl && (
        <Link
          href={nextUrl.url}
          className="ms-auto py-2 text-muted-foreground transition-colors hover:text-primary hover:underline"
        >
          {nextUrl.srLabel && <span className="sr-only">{nextUrl.srLabel}</span>}
          {nextUrl.text ?? 'Next Posts →'}
        </Link>
      )}
    </nav>
  )
}
