import type { Metadata } from 'next'
import Link from 'next/link'
import { formatDate, getAllBlogPosts } from '@/lib/content'

export const metadata: Metadata = {
  title: '归档',
}

/** 按年份分组列全部文章。 */
export default function ArchivesPage() {
  const posts = getAllBlogPosts().filter((post) => !post.draft)

  const byYear = new Map<string, typeof posts>()
  for (const post of posts) {
    const year = post.date.slice(0, 4)
    const group = byYear.get(year) ?? []
    group.push(post)
    byYear.set(year, group)
  }

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-bold tracking-tight">归档</h1>

      {byYear.size === 0 && <p className="text-sm text-stone-500 dark:text-stone-400">还没有文章。</p>}

      {[...byYear.entries()].map(([year, group]) => (
        <section key={year} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{year}</h2>
          <ul className="flex flex-col gap-2">
            {group.map((post) => (
              <li key={post.slug} className="flex items-baseline gap-4 text-sm">
                <time dateTime={post.date} className="shrink-0 text-stone-400 dark:text-stone-500">
                  {formatDate(post.date)}
                </time>
                <Link href={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
