import Link from 'next/link'
import { getAllBlogPosts, getAllNotes } from '@/lib/content'
import { siteConfig } from '@/site.config'
import { PostCard } from './_components/blog/post-card'
import { NoteCard } from './_components/notes/note-card'

export default function HomePage() {
  const posts = getAllBlogPosts()
    .filter((post) => !post.draft)
    .slice(0, 5)
  const notes = getAllNotes()
    .filter((note) => !note.draft)
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{siteConfig.title}</h1>
        <p className="text-stone-600 dark:text-stone-400">{siteConfig.description}</p>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">最新文章</h2>
          <Link href="/blog" className="text-sm text-stone-500 hover:underline dark:text-stone-400">
            全部文章
          </Link>
        </div>
        {posts.length > 0 ? (
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            还没有文章。在 content/blog/ 下新建文件夹和 post.mdx，文章就会出现在这里。
          </p>
        )}
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">最近笔记</h2>
          <Link href="/notes" className="text-sm text-stone-500 hover:underline dark:text-stone-400">
            全部笔记
          </Link>
        </div>
        {notes.length > 0 ? (
          <div className="flex flex-col gap-6">
            {notes.map((note) => (
              <NoteCard key={note.slug} note={note} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">还没有笔记。在 content/notes/ 下新建 .md 文件。</p>
        )}
      </section>

      <section className="text-sm text-stone-400 dark:text-stone-500">内容以 MDX 文件管理，部署后静态生成。</section>
    </div>
  )
}
