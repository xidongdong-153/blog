import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { extractHeadings, formatDate, getAllBlogPosts, getBlogPost } from '@/lib/content'
import { CopyrightCard } from '../../_components/blog/copyright-card'
import { FloatingActionGroup } from '../../_components/blog/floating-action-group'
import { MdxContent } from '../../_components/blog/mdx-content'
import { TableOfContents } from '../../_components/blog/toc'
import { GiscusComments } from '../../_components/comment/giscus-comments'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({ slug: post.slug }))
}

/** 未列出的 slug 直接 404，不在构建后按需渲染。 */
export const dynamicParams = false

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) {
    notFound()
  }

  const headings = extractHeadings(post.content)

  return (
    <div className="mx-auto w-full max-w-5xl gap-x-10 lg:flex lg:items-start">
      {/* TOC 侧栏：桌面端右侧粘性定位 */}
      {headings.length > 0 && (
        <aside
          id="sidebar"
          className="sticky top-20 order-2 hidden max-h-[calc(100vh-6rem)] basis-64 overflow-y-auto lg:block"
        >
          <TableOfContents headings={headings} />
        </aside>
      )}

      <article id="content" className="min-w-0 flex-grow break-words">
        {/* Hero 区域 */}
        <div className="flex flex-col gap-2">
          {post.heroImage && (
            <div className="relative mb-4 aspect-video overflow-hidden rounded-2xl">
              <Image src={post.heroImage} alt={`${post.title} hero image`} fill className="object-cover" priority />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <time dateTime={post.date} className="text-xs text-muted-foreground">
              {formatDate(post.date)}
            </time>
            {post.updatedDate && (
              <span className="text-xs text-muted-foreground">（更新于 {formatDate(post.updatedDate)}）</span>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
          {post.description && <p className="leading-relaxed text-muted-foreground">{post.description}</p>}
        </div>

        {/* 正文 */}
        <div className="mt-8">
          <MdxContent source={post.content} />
        </div>

        {/* 版权 */}
        <div className="mt-12">
          <CopyrightCard post={post} />
        </div>

        {/* 评论 */}
        <div className="mt-8">
          <GiscusComments />
        </div>
      </article>

      {/* 浮动操作组（移动端抽屉与返回顶部） */}
      <FloatingActionGroup headings={headings} />
    </div>
  )
}
