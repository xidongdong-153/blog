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
 * 分页导航器组件。
 */
export function Paginator({ prevUrl, nextUrl, className = '' }: PaginatorProps) {
  if (!prevUrl && !nextUrl) return null

  return (
    <nav aria-label="分页导航" className={`mt-6 flex items-center gap-x-4 text-sm sm:mt-8 ${className}`}>
      {prevUrl && (
        <Link
          href={prevUrl.url}
          className="me-auto py-2 font-serif text-muted-foreground transition-colors hover:text-primary hover:underline underline-offset-4"
        >
          {prevUrl.srLabel && <span className="sr-only">{prevUrl.srLabel}</span>}
          {prevUrl.text ?? '← 上一页'}
        </Link>
      )}
      {nextUrl && (
        <Link
          href={nextUrl.url}
          className="ms-auto py-2 font-serif text-muted-foreground transition-colors hover:text-primary hover:underline underline-offset-4"
        >
          {nextUrl.srLabel && <span className="sr-only">{nextUrl.srLabel}</span>}
          {nextUrl.text ?? '下一页 →'}
        </Link>
      )}
    </nav>
  )
}
