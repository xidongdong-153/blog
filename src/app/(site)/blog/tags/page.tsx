import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllBlogTags } from '@/lib/content'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '标签',
}

export default async function TagsPage() {
  const tags = await getAllBlogTags()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-2 border-b border-hair pb-6">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">标签</h1>
          <Link
            href="/blog"
            className="group/ink inline-flex shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <span className="ink-line">全部文章</span>
            <span aria-hidden="true" className="ink-glide group-hover/ink:translate-x-1">
              →
            </span>
          </Link>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">所有文章分类索引与知识主题。</p>
      </header>

      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无标签。</p>
      ) : (
        <ul className="flex flex-wrap gap-x-6 gap-y-3.5">
          {tags.map(({ tag, count }) => (
            <li key={tag} className="min-w-0 max-w-full">
              <Link
                href={`/blog/tags/${encodeURIComponent(tag)}`}
                className="ink-link inline-flex max-w-full items-baseline gap-1.5 py-0.5 font-serif text-base text-foreground/90 [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="min-w-0">#{tag}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground/70">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
