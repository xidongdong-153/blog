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
      <PageHeader title="笔记" description="工程随想、短记录与实践过程中的阶段性沉淀。" />

      {notes.length > 0 ? (
        <div className="flex flex-col">
          {notes.map((note, idx) => (
            <NoteCard key={note.slug} note={note} index={idx} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2 py-8 text-sm text-muted-foreground">
          <p className="font-serif text-base text-foreground/90">暂无公开笔记</p>
          <p className="text-xs">
            已发布的技术实践与思考文章均收录在{' '}
            <Link href="/blog" className="ink-link text-primary">
              文章列表
            </Link>
            。
          </p>
        </div>
      )}
    </div>
  )
}
