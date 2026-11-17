import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllNotes } from '@/lib/content'
import { NoteCard } from '../_components/notes/note-card'
import { PageHeader } from '../_components/site/page-header'
import { PaperSurface } from '../_components/site/paper-surface'

export const metadata: Metadata = {
  title: '笔记',
}

export default function NotesPage() {
  const notes = getAllNotes().filter((note) => !note.draft)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <PageHeader eyebrow="Field Notes" title="笔记" description="工程随想、短记录与实践过程中的阶段性沉淀。" />

      {notes.length > 0 ? (
        <div className="flex flex-col gap-5">
          {notes.map((note, idx) => (
            <NoteCard key={note.slug} note={note} index={idx} />
          ))}
        </div>
      ) : (
        <div className="relative isolate flex flex-col items-center gap-3 rounded-xl px-6 py-14 text-center">
          <PaperSurface className="bg-card/85" />
          <p className="font-serif text-base text-foreground/90">暂无公开笔记</p>
          <p className="text-xs text-muted-foreground">
            已发布的技术实践与思考文章均收录在{' '}
            <Link href="/blog" className="text-primary underline decoration-primary/40 underline-offset-4">
              文章列表
            </Link>
            。
          </p>
        </div>
      )}
    </div>
  )
}
