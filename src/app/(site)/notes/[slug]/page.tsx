import type { Metadata } from 'next'
import type { Note } from '@/lib/content'
import Link from 'next/link'
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
      <div className="mb-6 text-xs text-muted-foreground">
        <Link
          href="/notes"
          className="group/ink inline-flex items-center gap-1.5 font-mono transition-colors hover:text-primary"
        >
          <span aria-hidden="true" className="ink-glide group-hover/ink:-translate-x-1">
            ←
          </span>
          <span className="ink-line">全部笔记</span>
        </Link>
      </div>

      {/* 笔记正文直接在宣纸画布排版，不加额外卡片边界 */}
      <article>
        <header className="border-b border-hair pb-7">
          <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs text-muted-foreground">
            <time dateTime={note.date}>{formatDate(note.date)}</time>
            <span aria-hidden="true">·</span>
            <span className={STATUS_TEXT_COLORS[note.status]}>{NOTE_STATUS_LABELS[note.status]}</span>
            {note.tags.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="[overflow-wrap:anywhere]">{note.tags.map((t) => `#${t}`).join(' ')}</span>
              </>
            )}
          </div>

          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-4xl">
            {note.title}
          </h1>

          {note.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{note.description}</p>}
        </header>

        <div className="field-note-prose pb-12 pt-8">
          <MdxContent source={note.content} />
        </div>
      </article>
    </div>
  )
}
