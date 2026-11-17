import type { Note } from '@/lib/content'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { formatDate, NOTE_STATUS_LABELS } from '@/lib/content'
import { PaperSurface } from '../site/paper-surface'

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
 * 笔记档案卡片组件。
 * 采用左侧元数据索引栏 + 右侧摘要内容的双区排版，呈现结构化实验手记质感。
 */
export function NoteCard({ note, index = 0 }: { note: Note; index?: number }) {
  const excerpt = note.description || extractExcerptText(note.content)
  const serial = String(index + 1).padStart(3, '0')

  return (
    <article className="group relative isolate rounded-xl transition-transform duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5">
      <PaperSurface />
      <Link
        href={`/notes/${note.slug}`}
        className="grid grid-cols-1 gap-4 rounded-xl p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:grid-cols-[148px_minmax(0,1fr)] sm:gap-6 sm:p-6"
      >
        {/* 左栏：编号、日期与状态铭牌 */}
        <div className="flex flex-row items-center justify-between gap-3 border-b border-hair pb-3 sm:flex-col sm:items-start sm:justify-start sm:gap-2 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
          <div className="font-mono text-xs font-medium tracking-wider text-primary tabular-nums">NOTE #{serial}</div>

          <time dateTime={note.date} className="font-mono text-xs tabular-nums text-muted-foreground">
            {formatDate(note.date)}
          </time>

          <span className={`font-mono text-[11px] font-medium ${STATUS_DOT_STYLES[note.status]}`}>
            {NOTE_STATUS_LABELS[note.status]}
          </span>
        </div>

        {/* 右栏：标题、正文摘要与标签 */}
        <div className="flex min-w-0 flex-col justify-between gap-3">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-serif text-xl font-medium leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
                {note.title}
              </h2>
              <ArrowUpRight
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
              />
            </div>

            {excerpt ? (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{excerpt}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">点击阅读本篇笔记全文。</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-[11px] text-muted-foreground">
            <div className="flex flex-wrap gap-2">
              {note.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="rounded bg-muted/55 px-1.5 py-0.5">
                  #{tag}
                </span>
              ))}
            </div>
            <span className="text-foreground/80 transition-colors group-hover:text-primary">阅读全文 →</span>
          </div>
        </div>
      </Link>
    </article>
  )
}
