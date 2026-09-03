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

const STATUS_STYLES: Record<Note['status'], string> = {
  'in-progress': 'bg-accent text-primary',
  incomplete: 'bg-destructive/15 text-destructive',
  ready: 'bg-primary/15 text-primary',
  archived: 'bg-muted text-muted-foreground',
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params
  const note = getNote(slug)
  if (!note) {
    notFound()
  }

  return (
    <article className="mx-auto w-full max-w-3xl flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{note.title}</h1>
          <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_STYLES[note.status]}`}>
            {NOTE_STATUS_LABELS[note.status]}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          <time dateTime={note.date}>{formatDate(note.date)}</time>
        </div>
      </header>

      <MdxContent source={note.content} />
    </article>
  )
}
