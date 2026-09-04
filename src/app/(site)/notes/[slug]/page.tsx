import type { Metadata } from 'next'
import type { Note } from '@/lib/content'
import { notFound } from 'next/navigation'
import { formatDate, getAllNotes, getNote, NOTE_STATUS_LABELS } from '@/lib/content'
import { MdxContent } from '../../_components/blog/mdx-content'

interface NotePageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllNotes().map((note) => ({ slug: note.slug }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { slug } = await params
  const note = getNote(slug)
  if (!note) return {}
  return {
    title: note.title,
    description: note.description,
  }
}

const STATUS_TEXT_COLORS: Record<Note['status'], string> = {
  'in-progress': 'text-amber-600 dark:text-amber-400',
  incomplete: 'text-rose-600 dark:text-rose-400',
  ready: 'text-primary',
  archived: 'text-muted-foreground',
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params
  const note = getNote(slug)
  if (!note) {
    notFound()
  }

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-3 border-b border-border/40 pb-6">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <span>// NOTE</span>
          <span>/</span>
          <time dateTime={note.date}>{formatDate(note.date)}</time>
          <span>/</span>
          <span className={STATUS_TEXT_COLORS[note.status]}>STATUS: {NOTE_STATUS_LABELS[note.status]}</span>
        </div>

        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">{note.title}</h1>

        {note.description && <p className="text-sm leading-relaxed text-muted-foreground">{note.description}</p>}
      </header>

      <MdxContent source={note.content} />
    </article>
  )
}
