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
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <span>// TAG FILTER</span>
          <Link href="/blog" className="transition-colors hover:text-foreground">
            // ALL POSTS →
          </Link>
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">#{decodedTag}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">共收录 {posts.length} 篇关联文章。</p>
      </div>

      <ul className="flex flex-col">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </ul>
    </div>
  )
}
