import type { Note } from '@/lib/content'
import Link from 'next/link'
import { formatDate, NOTE_STATUS_LABELS } from '@/lib/content'

const STATUS_TEXT_COLORS: Record<Note['status'], string> = {
  'in-progress': 'text-amber-600 dark:text-amber-400',
  incomplete: 'text-rose-600 dark:text-rose-400',
  ready: 'text-primary',
  archived: 'text-muted-foreground',
}

export function NoteCard({ note }: { note: Note }) {
  return (
    <article className="group flex flex-col gap-2.5 border-b border-border/50 pb-8 pt-2 transition-colors">
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        <span>// NOTE</span>
        <span>/</span>
        <time dateTime={note.date}>{formatDate(note.date)}</time>
        <span>/</span>
        <span className={STATUS_TEXT_COLORS[note.status]}>STATUS: {NOTE_STATUS_LABELS[note.status]}</span>
      </div>

      <h2 className="font-serif text-xl font-medium tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-2xl">
        <Link href={`/notes/${note.slug}`} className="hover:underline">
          {note.title}
        </Link>
      </h2>

      {note.description && (
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{note.description}</p>
      )}

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
