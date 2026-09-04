import Link from 'next/link'
import { formatTimelineDate } from '@/lib/content'

/** 最近写作时间线条目，kind 决定链接路由与类型徽章文案。 */
export interface WritingEntry {
  kind: 'article' | 'note'
  slug: string
  title: string
  /** ISO 日期字符串 */
  date: string
}

const KIND_LABELS = {
  article: '文章',
  note: '笔记',
} as const

/**
 * 首页最近写作时间线组件。
 * 文章与笔记合并按日期倒序展示：左侧衬线大日期（MM / DD），中间标题，右侧类型徽章与滑出箭头；
 * 行间用 divide-y 细线分隔，构成杂志目录式排版。
 */
export function WritingTimeline({ entries }: { entries: WritingEntry[] }) {
  return (
    <div className="flex flex-col divide-y divide-border/60">
      {entries.map((entry) => (
        <Link
          key={`${entry.kind}-${entry.slug}`}
          href={entry.kind === 'article' ? `/blog/${entry.slug}` : `/notes/${entry.slug}`}
          className="group/link flex items-center gap-4 py-3 transition-colors"
        >
          <time dateTime={entry.date} className="w-16 shrink-0 font-serif text-lg tabular-nums text-muted-foreground">
            {formatTimelineDate(entry.date)}
          </time>
          <span className="flex-1 truncate text-sm font-medium transition-colors group-hover/link:text-primary">
            {entry.title}
          </span>
          <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 font-mono text-xs tracking-wider text-muted-foreground">
            {KIND_LABELS[entry.kind]}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
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
      ))}
    </div>
  )
}
