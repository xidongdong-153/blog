import type { Metadata } from 'next'
import { getAllNotes } from '@/lib/content'
import { NoteCard } from '../_components/notes/note-card'

export const metadata: Metadata = {
  title: '笔记',
}

export default function NotesPage() {
  const notes = getAllNotes().filter((note) => !note.draft)

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">笔记</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          短笔记和研究卡片，状态分四种：进行中、待补充、已整理、已归档。
        </p>
      </div>

      {notes.length > 0 ? (
        <div className="flex flex-col gap-8">
          {notes.map((note) => (
            <NoteCard key={note.slug} note={note} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-500 dark:text-stone-400">还没有笔记。</p>
      )}
    </div>
  )
}
