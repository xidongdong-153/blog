import type { Note } from '@/lib/content'
import Link from 'next/link'
import { formatDate, NOTE_STATUS_LABELS } from '@/lib/content'

const STATUS_STYLES: Record<Note['status'], string> = {
  'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  incomplete: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  ready: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  archived: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
        <time dateTime={note.date}>{formatDate(note.date)}</time>
        {note.tags.length > 0 && (
          <span className="flex gap-2">
            {note.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </span>
        )}
      </div>
      {note.description && (
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{note.description}</p>
      )}
    </article>
  )
}
