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
        <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.2em] text-muted-foreground/80 uppercase">
          <span>Tags</span>
          <Link href="/blog" className="transition-colors hover:text-primary">
            全部文章 →
          </Link>
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">标签</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">所有文章分类索引与知识主题。</p>
      </header>

      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无标签。</p>
      ) : (
        <ul className="flex flex-wrap gap-2.5">
          {tags.map(({ tag, count }) => (
            <li key={tag}>
              <Link
                href={`/blog/tags/${encodeURIComponent(tag)}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-hair bg-card/85 px-3.5 py-2 text-sm text-foreground/85 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:text-primary"
              >
                <span>{tag}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground/75">({count})</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
