import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllBlogPosts, getAllBlogTags } from '@/lib/content'
import { PostCard } from '../_components/blog/post-card'

export const metadata: Metadata = {
  title: '文章',
}

export default function BlogPage() {
  const posts = getAllBlogPosts().filter((post) => !post.draft)
  const tags = getAllBlogTags()

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">文章</h1>
        <Link href="/blog/archives" className="text-sm text-stone-500 hover:underline dark:text-stone-400">
          归档
        </Link>
      </div>

      {tags.length > 0 && (
        <nav className="flex flex-wrap gap-2 text-sm">
          {tags.map(({ tag, count }) => (
            <Link
              key={tag}
              href={`/blog/tags/${tag}`}
              className="rounded border border-stone-200 px-2 py-0.5 text-stone-600 hover:border-stone-400 dark:border-stone-800 dark:text-stone-400 dark:hover:border-stone-600"
            >
              {tag} <span className="text-xs">{count}</span>
            </Link>
          ))}
        </nav>
      )}

      {posts.length > 0 ? (
        <div className="flex flex-col gap-8">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-500 dark:text-stone-400">还没有文章。</p>
      )}
    </div>
  )
}
