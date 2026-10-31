import type { Metadata } from 'next'
import { getAllNotes } from '@/lib/content'
import { NoteCard } from '../_components/notes/note-card'
import { PageHeader } from '../_components/site/page-header'

export const metadata: Metadata = {
  title: '笔记',
}

export default function NotesPage() {
  const notes = getAllNotes().filter((note) => !note.draft)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 sm:gap-10">
      <PageHeader eyebrow="数字花园" title="笔记" description="短笔记与研究记录，记录实践过程与待完善的想法。" />

      {notes.length > 0 ? (
        <div className="flex max-w-[46rem] flex-col">
          {notes.map((note) => (
            <NoteCard key={note.slug} note={note} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-sm text-muted-foreground">还没有笔记。</p>
      )}
    </div>
  )
}
