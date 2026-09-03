import Link from 'next/link'
import { formatDate } from '@/lib/content'

interface EntryListItemProps {
  href: string
  title: string
  date: string
}

/**
 * 首页紧凑文章与笔记列表项组件。
 * 左侧固定宽度日期，右侧标题与 hover 时向右滑出展开的动态箭头。
 */
export function EntryListItem({ href, title, date }: EntryListItemProps) {
  return (
    <Link
      href={href}
      className="group/link flex items-center justify-between gap-4 rounded-2xl border border-border bg-background px-5 py-2.5 transition-colors hover:bg-muted/50"
    >
      <div className="flex flex-1 items-baseline gap-4 overflow-hidden">
        <time dateTime={date} className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {formatDate(date)}
        </time>
        <span className="truncate font-medium transition-colors group-hover/link:text-primary">{title}</span>
      </div>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0 stroke-muted-foreground transition-colors group-hover/link:stroke-primary"
      >
        <line
          x1="5"
          y1="12"
          x2="19"
          y2="12"
          className="translate-x-4 scale-x-0 transition-all duration-300 ease-in-out motion-reduce:transition-none group-hover/link:translate-x-1 group-hover/link:scale-x-100"
        />
        <polyline
          points="12 5 19 12 12 19"
          className="translate-x-0 transition-all duration-300 ease-in-out motion-reduce:transition-none group-hover/link:translate-x-1"
        />
      </svg>
    </Link>
  )
}
