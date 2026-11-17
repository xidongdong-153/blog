import type { Metadata } from 'next'
import type { TimelineArchiveEntry } from '../../_components/blog/archives-view'
import { getAllBlogPosts, getAllNotes } from '@/lib/content'
import { ArchivesView } from '../../_components/blog/archives-view'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '归档',
}

/** 写作归档页：聚合全部已发布文章与笔记。 */
export default async function ArchivesPage() {
  const posts = (await getAllBlogPosts()).filter((post) => !post.draft)
  const notes = getAllNotes().filter((note) => !note.draft)

  const entries: TimelineArchiveEntry[] = [
    ...posts.map((post) => ({
      kind: 'article' as const,
      slug: post.slug,
      title: post.title,
      date: post.date,
      category: post.category,
      aiGenerated: post.aiGenerated,
    })),
    ...notes.map((note) => ({
      kind: 'note' as const,
      slug: note.slug,
      title: note.title,
      date: note.date,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return <ArchivesView entries={entries} />
}
