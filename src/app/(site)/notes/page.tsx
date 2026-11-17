import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllNotes } from '@/lib/content'
import { NoteCard } from '../_components/notes/note-card'
import { PageHeader } from '../_components/site/page-header'

export const metadata: Metadata = {
  title: '笔记',
}

export default function NotesPage() {
  const notes = getAllNotes().filter((note) => !note.draft)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <PageHeader title="笔记" description="不成篇的零碎想法和备忘。" />

      {notes.length > 0 ? (
        <div className="flex flex-col">
          {notes.map((note, idx) => (
            <NoteCard key={note.slug} note={note} index={idx} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2 py-8 text-sm text-muted-foreground">
          <p className="font-serif text-base text-foreground/90">还没有公开笔记</p>
          <p className="text-xs">
            长一点的文章都在{' '}
            <Link href="/blog" className="ink-link text-primary">
              文章列表
            </Link>{' '}
            里。
          </p>
        </div>
      )}
    </div>
  )
}
