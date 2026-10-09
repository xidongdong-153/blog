import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { computeArticleContentHash } from '@/lib/ai-summary'
import {
  BLOG_CATEGORY_LABELS,
  calculateReadingTime,
  extractHeadings,
  formatDate,
  getAllBlogPosts,
  getBlogPost,
  getSeriesDetail,
  getSeriesNav,
} from '@/lib/content'
import { getArticleSummaryBySlug } from '@/server/modules/ai/summary.service'
import { AiSummary } from '../../_components/blog/ai-summary'
import { CopyrightCard } from '../../_components/blog/copyright-card'
import { FloatingActionGroup } from '../../_components/blog/floating-action-group'
import { MdxContent } from '../../_components/blog/mdx-content'
import { SeriesChapterSidebar } from '../../_components/blog/series-chapter-sidebar'
import { SeriesPaginator } from '../../_components/blog/series-paginator'
import { TableOfContents } from '../../_components/blog/toc'
import { CommentSection } from '../../_components/comment/comment-section'
import { ArticleViewerCount } from '../../_components/visitor/article-viewer-count'

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
  const readingTime = calculateReadingTime(post.content)
  const seriesNav = getSeriesNav(post)
  const seriesDetail = seriesNav ? getSeriesDetail(seriesNav.series.id) : null

  let summary: string | null = null
  if (!post.disableAiSummary) {
    try {
      const currentHash = computeArticleContentHash(post.content)
      const record = await getArticleSummaryBySlug(post.slug)
      if (record && record.contentHash === currentHash && record.summary.trim()) {
        summary = record.summary.trim()
      }
    } catch {
      summary = null
    }
  }

  return (
    <>
      {post.heroColor && <style>{`:root { --page-highlight: ${post.heroColor} }`}</style>}
      <div
        className={
          seriesDetail
            ? 'mx-auto w-full max-w-7xl gap-x-6 xl:gap-x-8 lg:flex lg:items-start'
            : 'mx-auto w-full max-w-5xl gap-x-10 lg:flex lg:items-start'
        }
      >
        {/* 专栏章节侧栏（仅专栏文章在桌面端左侧呈现） */}
        {seriesDetail && (
          <SeriesChapterSidebar series={seriesDetail.series} posts={seriesDetail.posts} currentSlug={post.slug} />
        )}

        <article id="content" className="min-w-0 flex-1 break-words">
          {/* Hero 区域 */}
          <div className="flex flex-col gap-2">
            {seriesNav && (
              <div className="mb-1">
                <Link
                  href={`/blog/series/${seriesNav.series.id}`}
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-primary transition-colors hover:underline"
                >
                  <span>// 专栏：{seriesNav.series.title}</span>
                  <span>→</span>
                </Link>
              </div>
            )}

            {post.heroImage && (
              <div className="relative mb-6 aspect-video overflow-hidden rounded-lg border border-border/60">
                <Image src={post.heroImage} alt={`${post.title} hero image`} fill className="object-cover" priority />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
              <span>// {BLOG_CATEGORY_LABELS[post.category]}</span>
              <span>/</span>
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              {post.updatedDate && (
                <>
                  <span>/</span>
                  <span>更新于 {formatDate(post.updatedDate)}</span>
                </>
              )}
              <span>/</span>
              <span>{readingTime}</span>
              <span>/</span>
              <ArticleViewerCount slug={post.slug} mode="detailed" />
            </div>

            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-[2.6rem] leading-[1.2]">
              {post.title}
            </h1>
            {post.description && <p className="leading-relaxed text-muted-foreground">{post.description}</p>}
          </div>

          {/* AI 摘要 */}
          {summary && (
            <div className="mt-6">
              <AiSummary summary={summary} />
            </div>
          )}

          {/* 正文 */}
          <div className="mt-8">
            <MdxContent source={post.content} />
          </div>

          {/* 专栏章节导轨 */}
          {seriesNav && (
            <div className="mt-10">
              <SeriesPaginator nav={seriesNav} />
            </div>
          )}

          {/* 版权 */}
          <div className="mt-12">
            <CopyrightCard post={post} />
          </div>

          {/* 评论 */}
          <div className="mt-8">
            <CommentSection slug={post.slug} />
          </div>
        </article>

        {/* TOC 侧栏：桌面端右侧粘性定位（专栏在 xl 显示，常规在 lg 显示） */}
        {headings.length > 0 && (
          <aside
            id="sidebar"
            className={
              seriesDetail
                ? 'sticky top-20 hidden max-h-[calc(100vh-6rem)] w-56 xl:w-60 shrink-0 overflow-y-auto xl:block'
                : 'sticky top-20 hidden max-h-[calc(100vh-6rem)] w-64 shrink-0 overflow-y-auto lg:block'
            }
          >
            <TableOfContents headings={headings} />
          </aside>
        )}

        {/* 浮动操作组（移动端抽屉与返回顶部） */}
        <FloatingActionGroup
          headings={headings}
          series={seriesDetail?.series}
          seriesPosts={seriesDetail?.posts}
          currentSlug={post.slug}
        />
      </div>
    </>
  )
}
