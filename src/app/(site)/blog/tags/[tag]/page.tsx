import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllBlogPosts } from '@/lib/content'
import { PostCard } from '../../../_components/blog/post-card'

interface TagPageProps {
  params: Promise<{ tag: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag } = await params
  return { title: `标签：${decodeURIComponent(tag)}` }
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag)
  const posts = (await getAllBlogPosts()).filter((post) => !post.draft && post.tags.includes(decodedTag))

  if (posts.length === 0) {
    notFound()
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-2 border-b border-hair pb-6">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="min-w-0 font-serif text-3xl font-medium tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-4xl">
            #{decodedTag}
          </h1>
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
        <p className="text-sm leading-relaxed text-muted-foreground">共收录 {posts.length} 篇关联文章。</p>
      </header>

      <ul className="flex flex-col">
        {posts.map((post, idx) => (
          <PostCard key={post.slug} post={post} entranceIndex={idx} />
        ))}
      </ul>
    </div>
  )
}
