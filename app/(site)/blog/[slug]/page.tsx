import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { extractHeadings, formatDate, getAllBlogPosts, getBlogPost } from '@/lib/content'
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
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
        <div className="text-sm text-stone-500 dark:text-stone-400">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </div>
        {post.description && <p className="leading-relaxed text-stone-600 dark:text-stone-400">{post.description}</p>}
      </header>

      <TableOfContents headings={headings} />

      <MdxContent source={post.content} />

      <GiscusComments />
    </article>
  )
}
