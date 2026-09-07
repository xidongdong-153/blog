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

/**
 * 首页最近写作时间线组件。
 * 极简手记目录排版：左侧等宽日期，中间标题，仅笔记标注类型，
 * 悬停时整体浮现轻柔底色与微动效，去除非必要线框与徽章噪点。
 */
export function WritingTimeline({ entries }: { entries: WritingEntry[] }) {
  return (
    <div className="flex flex-col gap-y-1">
      {entries.map((entry) => (
        <Link
          key={`${entry.kind}-${entry.slug}`}
          href={entry.kind === 'article' ? `/blog/${entry.slug}` : `/notes/${entry.slug}`}
          className="group/link -mx-2.5 flex items-center gap-3 rounded-lg px-2.5 py-2 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <time dateTime={entry.date} className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground/75">
            {formatTimelineDate(entry.date)}
          </time>
          <span className="flex-1 truncate text-sm font-medium text-foreground transition-colors group-hover/link:text-primary">
            {entry.title}
          </span>
          {entry.kind === 'note' && <span className="shrink-0 font-mono text-xs text-muted-foreground/60">#笔记</span>}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5 shrink-0 opacity-0 transition-all duration-200 group-hover/link:translate-x-0.5 group-hover/link:opacity-100 motion-reduce:transition-none"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      ))}
    </div>
  )
}
