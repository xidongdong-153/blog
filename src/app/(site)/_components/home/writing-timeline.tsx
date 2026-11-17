import type { BlogCategory } from '@/lib/blog-meta'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { BLOG_CATEGORY_LABELS } from '@/lib/blog-meta'
import { formatRelativeTime } from '@/lib/date'

/** 最近更新条目，kind 决定路由与分类显示。 */
export interface WritingEntry {
  kind: 'article' | 'note'
  slug: string
  title: string
  /** ISO 日期字符串 */
  date: string
  category?: BlogCategory
  aiGenerated?: boolean
}

/**
 * 首页「最近更新」紧凑条目列表。
 * 无背景框线与灰色悬浮底块；悬停时左侧墨线竖向生长，行内容轻柔右移并露出斜向箭标。
 */
export function WritingTimeline({ entries }: { entries: WritingEntry[] }) {
  return (
    <ul className="flex flex-col divide-y divide-hair">
      {entries.map((entry, index) => {
        const order = String(index + 1).padStart(2, '0')
        const isFirst = index === 0
        const href = entry.kind === 'article' ? `/blog/${entry.slug}` : `/notes/${entry.slug}`
        const kindLabel =
          entry.kind === 'note' ? '笔记' : entry.category ? BLOG_CATEGORY_LABELS[entry.category] : '文章'
        const dateLabel = formatRelativeTime(entry.date)

        return (
          <li key={`${entry.kind}-${entry.slug}`}>
            <Link
              href={href}
              className={`ink-row group/item block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                isFirst ? 'py-4' : 'py-3.5'
              }`}
            >
              <div className="ink-glide flex items-baseline justify-between gap-4 group-hover/item:translate-x-2.5 group-focus-visible/item:translate-x-2.5">
                <div className="flex min-w-0 items-baseline gap-3.5">
                  <span
                    className={`w-5 shrink-0 font-mono text-xs tabular-nums transition-colors duration-200 ${
                      isFirst ? 'font-semibold text-primary' : 'text-muted-foreground group-hover/item:text-primary'
                    }`}
                  >
                    {order}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3
                      className={`min-w-0 font-serif leading-snug text-foreground transition-colors duration-200 [overflow-wrap:anywhere] group-hover/item:text-primary ${
                        isFirst ? 'text-lg font-medium sm:text-[1.2rem]' : 'text-[15.5px] font-normal sm:text-base'
                      }`}
                    >
                      {entry.title}
                    </h3>

                    <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                      <span>{kindLabel}</span>
                      {entry.aiGenerated && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>AI 协同</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums text-muted-foreground">
                  <time dateTime={entry.date} className="transition-colors group-hover/item:text-foreground">
                    {dateLabel}
                  </time>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="ink-glide size-3.5 -translate-x-1 translate-y-0.5 text-primary opacity-0 group-hover/item:translate-x-0 group-hover/item:translate-y-0 group-hover/item:opacity-100 group-focus-visible/item:translate-x-0 group-focus-visible/item:translate-y-0 group-focus-visible/item:opacity-100"
                  />
                </div>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
