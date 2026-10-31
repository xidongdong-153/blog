import type { Note } from '@/lib/content'
import Link from 'next/link'
import { formatDate, NOTE_STATUS_LABELS } from '@/lib/content'

const STATUS_TEXT_COLORS: Record<Note['status'], string> = {
  'in-progress': 'text-amber-700 dark:text-amber-400',
  incomplete: 'text-rose-600 dark:text-rose-400',
  ready: 'text-primary',
  archived: 'text-muted-foreground',
}

export function NoteCard({ note }: { note: Note }) {
  return (
    <article className="flex min-w-0 flex-col gap-2 border-b border-border/40 pb-7 pt-4">
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
        <span>// 笔记</span>
        <span>/</span>
        <time dateTime={note.date}>{formatDate(note.date)}</time>
        <span>/</span>
        <span className={STATUS_TEXT_COLORS[note.status]}>状态: {NOTE_STATUS_LABELS[note.status]}</span>
      </div>

      <Link
        href={`/notes/${note.slug}`}
        className="group/link flex flex-col gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <h2 className="font-serif text-lg font-medium tracking-tight text-foreground transition-colors group-hover/link:text-primary sm:text-xl">
          {note.title}
        </h2>
        {note.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:line-clamp-3">
            {note.description}
          </p>
        )}
      </Link>

      {note.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2 font-mono text-xs text-muted-foreground">
          {note.tags.map((tag) => (
            <span key={tag} className="select-none">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
