import type { Note } from '@/lib/content'
import Link from 'next/link'
import { formatDate, NOTE_STATUS_LABELS } from '@/lib/content'

const STATUS_STYLES: Record<Note['status'], string> = {
  'in-progress': 'bg-accent text-primary',
  incomplete: 'bg-destructive/15 text-destructive',
  ready: 'bg-primary/15 text-primary',
  archived: 'bg-muted text-muted-foreground',
}

export function NoteCard({ note }: { note: Note }) {
  return (
    <article className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Link href={`/notes/${note.slug}`} className="text-lg font-semibold hover:underline">
          {note.title}
        </Link>
        <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_STYLES[note.status]}`}>
          {NOTE_STATUS_LABELS[note.status]}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <time dateTime={note.date}>{formatDate(note.date)}</time>
        {note.tags.length > 0 && (
          <span className="flex gap-2">
            {note.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </span>
        )}
      </div>
      {note.description && <p className="text-sm leading-relaxed text-muted-foreground">{note.description}</p>}
    </article>
  )
}
