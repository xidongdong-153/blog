import type { Metadata } from 'next'
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

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params
  const note = getNote(slug)
  if (!note) {
    notFound()
  }

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{note.title}</h1>
          <span className="rounded bg-stone-200 px-1.5 py-0.5 text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {NOTE_STATUS_LABELS[note.status]}
          </span>
        </div>
        <div className="text-sm text-stone-500 dark:text-stone-400">
          <time dateTime={note.date}>{formatDate(note.date)}</time>
        </div>
      </header>

      <MdxContent source={note.content} />
    </article>
  )
}
