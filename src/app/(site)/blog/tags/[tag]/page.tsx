import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllBlogPosts, getAllBlogTags } from '@/lib/content'
import { PostCard } from '../../../_components/blog/post-card'

interface TagPageProps {
  params: Promise<{ tag: string }>
}

/**
 * Next 传进页面的 params 是 URL 编码形式（中文标签会是 %E9%9A%8F...），
 * 页面里必须 decodeURIComponent 后再查数据；generateStaticParams 返回原始值。
 * 不 decode 时标签匹配不到文章，构建出的页面本身就是 404。
 */
export function generateStaticParams() {
  return getAllBlogTags().map(({ tag }) => ({ tag }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag } = await params
  return { title: `标签：${decodeURIComponent(tag)}` }
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag)
  const posts = getAllBlogPosts().filter((post) => !post.draft && post.tags.includes(decodedTag))

  if (posts.length === 0) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">#{decodedTag}</h1>
        <Link href="/blog" className="text-sm text-muted-foreground hover:underline">
          全部文章
        </Link>
      </div>

      <div className="flex flex-col gap-8">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  )
}
