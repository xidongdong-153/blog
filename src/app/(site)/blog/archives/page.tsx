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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          // ARCHIVES &amp; TIMELINE
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">归档</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">按发布年份整理的历史文章列表。</p>
      </div>

      {byYear.size === 0 && <p className="text-sm text-muted-foreground">还没有文章。</p>}

      {[...byYear.entries()].map(([year, group]) => (
        <section key={year} className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl font-medium text-foreground">{year}</h2>
          <ul className="flex flex-col gap-2.5">
            {group.map((post) => (
              <li key={post.slug} className="flex items-baseline gap-4 text-sm">
                <time dateTime={post.date} className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
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
