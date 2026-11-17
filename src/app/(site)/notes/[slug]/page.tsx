import type { Metadata } from 'next'
import type { Note } from '@/lib/content'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDate, getAllNotes, getNote, NOTE_STATUS_LABELS } from '@/lib/content'
import { MdxContent } from '../../_components/blog/mdx-content'
import { PaperSurface } from '../../_components/site/paper-surface'

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
  'in-progress': 'text-amber-700 dark:text-amber-400',
  incomplete: 'text-rose-600 dark:text-rose-400',
  ready: 'text-emerald-700 dark:text-emerald-400',
  archived: 'text-muted-foreground',
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params
  const note = getNote(slug)
  if (!note) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-5 text-xs text-muted-foreground">
        <Link href="/notes" className="inline-flex items-center gap-1.5 font-mono transition-colors hover:text-primary">
          <span>←</span>
          <span>全部笔记</span>
        </Link>
      </div>

      {/* 笔记单张纸面 */}
      <article className="relative isolate rounded-xl">
        <PaperSurface />
        <div className="overflow-hidden rounded-xl">
          <header className="border-b border-hair px-6 pb-6 pt-8 sm:px-10 sm:pt-10">
            <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs text-muted-foreground">
              <span className="text-primary">FIELD NOTE</span>
              <span aria-hidden="true">·</span>
              <time dateTime={note.date}>{formatDate(note.date)}</time>
              <span aria-hidden="true">·</span>
              <span className={STATUS_TEXT_COLORS[note.status]}>{NOTE_STATUS_LABELS[note.status]}</span>
              {note.tags.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{note.tags.join(' / ')}</span>
                </>
              )}
            </div>

            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">{note.title}</h1>

            {note.description && (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{note.description}</p>
            )}
          </header>

          {/* 笔记正文 */}
          <div className="field-note-prose px-6 pb-12 pt-7 sm:px-10">
            <MdxContent source={note.content} />
          </div>
        </div>
      </article>
    </div>
  )
}
