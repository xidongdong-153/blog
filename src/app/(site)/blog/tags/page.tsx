import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllBlogTags } from '@/lib/content'

export const metadata: Metadata = {
  title: '标签',
}

export default function TagsPage() {
  const tags = getAllBlogTags()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <div className="flex items-center justify-between font-mono text-xs tracking-wider text-muted-foreground">
          <span>// 标签分类</span>
          <Link href="/blog" className="transition-colors hover:text-foreground">
            // 全部文章 →
          </Link>
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">标签</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">所有文章分类索引与知识主题。</p>
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无标签。</p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {tags.map(({ tag, count }) => (
            <li key={tag}>
              <Link
                href={`/blog/tags/${tag}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-3 py-1.5 font-mono text-sm text-muted-foreground transition-all hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground"
              >
                <span>#{tag}</span>
                <span className="text-xs text-muted-foreground/70">({count})</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
