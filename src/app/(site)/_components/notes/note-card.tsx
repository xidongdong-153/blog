import type { Note } from '@/lib/content'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { formatDate, NOTE_STATUS_LABELS } from '@/lib/content'

function extractExcerptText(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join(' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const STATUS_DOT_STYLES: Record<Note['status'], string> = {
  'in-progress': 'text-amber-700 dark:text-amber-400',
  incomplete: 'text-rose-600 dark:text-rose-400',
  ready: 'text-emerald-700 dark:text-emerald-400',
  archived: 'text-muted-foreground',
}

/**
 * 笔记档案条目组件（无卡片外壳）。
 * 左侧等宽编号、日期与状态，右侧标题与正文摘要；悬停左侧墨线生长并轻柔右移。
 */
export function NoteCard({ note, index = 0 }: { note: Note; index?: number }) {
  const excerpt = note.description || extractExcerptText(note.content)
  const serial = String(index + 1).padStart(3, '0')

  return (
    <article className="ink-row group/item relative border-b border-hair py-6">
      <Link
        href={`/notes/${note.slug}`}
        className="ink-glide grid grid-cols-1 gap-4 focus-visible:translate-x-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring group-hover/item:translate-x-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-6"
      >
        {/* 左栏：编号、日期与状态 */}
        <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-start sm:justify-start sm:gap-1.5 sm:border-r sm:border-hair sm:pr-5">
          <div className="font-mono text-xs font-medium tracking-wider text-primary tabular-nums">NOTE #{serial}</div>

          <time dateTime={note.date} className="font-mono text-xs tabular-nums text-muted-foreground">
            {formatDate(note.date)}
          </time>

          <span className={`font-mono text-[11px] font-medium ${STATUS_DOT_STYLES[note.status]}`}>
            {NOTE_STATUS_LABELS[note.status]}
          </span>
        </div>

        {/* 右栏：标题、正文摘要与纯文本标签 */}
        <div className="flex min-w-0 flex-col justify-between gap-3">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 flex-1 font-serif text-xl font-medium leading-snug tracking-tight text-foreground transition-colors duration-200 [overflow-wrap:anywhere] group-hover/item:text-primary">
                {note.title}
              </h2>
              <ArrowUpRight
                aria-hidden="true"
                className="ink-glide mt-1 size-4 shrink-0 -translate-x-0.5 translate-y-0.5 text-muted-foreground opacity-60 group-hover/item:translate-x-0 group-hover/item:translate-y-0 group-hover/item:text-primary group-hover/item:opacity-100"
              />
            </div>

            {excerpt ? (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{excerpt}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">点击阅读本篇笔记全文。</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 font-mono text-[11px] text-muted-foreground">
            <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
              {note.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="min-w-0 max-w-full [overflow-wrap:anywhere]">
                  #{tag}
                </span>
              ))}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-foreground/80 transition-colors group-hover/item:text-primary">
              <span>阅读全文</span>
              <span aria-hidden="true" className="ink-glide group-hover/item:translate-x-1">
                →
              </span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
