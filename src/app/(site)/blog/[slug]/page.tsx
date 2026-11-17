import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { computeArticleContentHash } from '@/lib/ai-summary'
import { BLOG_CATEGORY_LABELS, buildBlogListUrl } from '@/lib/blog-meta'
import {
  calculateReadingTime,
  extractHeadings,
  formatDate,
  getBlogPost,
  getSeriesDetail,
  getSeriesNav,
} from '@/lib/content'
import { sanitizeCssColor } from '@/lib/utils'
import { getArticleSummaryBySlug } from '@/server/modules/ai/summary.service'
import { AiGeneratedLabel } from '../../_components/blog/ai-generated-label'
import { AiSummary } from '../../_components/blog/ai-summary'
import { ArticleReaderShell, ReaderFocusButton } from '../../_components/blog/article-reader-shell'
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

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) {
    notFound()
  }

  const headings = extractHeadings(post.content)
  const readingTime = calculateReadingTime(post.content)
  const seriesNav = await getSeriesNav(post)
  const seriesDetail = seriesNav ? await getSeriesDetail(seriesNav.series.id) : null
  const categoryLabel = BLOG_CATEGORY_LABELS[post.category]
  const safeHeroColor = sanitizeCssColor(post.heroColor)

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
      {safeHeroColor && <style>{`:root { --page-highlight: ${safeHeroColor} }`}</style>}

      <ArticleReaderShell
        className={
          seriesDetail
            ? 'mx-auto w-full max-w-7xl gap-x-8 xl:gap-x-10 lg:flex lg:items-start'
            : 'mx-auto w-full max-w-5xl gap-x-12 lg:flex lg:items-start'
        }
      >
        {/* 专栏章节侧栏（在专注阅读态下渐隐） */}
        {seriesDetail && (
          <div className="transition-opacity duration-300 group-data-[reader-focus=true]/reader:opacity-25">
            <SeriesChapterSidebar series={seriesDetail.series} posts={seriesDetail.posts} currentSlug={post.slug} />
          </div>
        )}

        <article id="content" className="min-w-0 flex-1 break-words">
          {/* 返回分类眉标与专注阅读开关 */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={buildBlogListUrl({ category: post.category })}
                className="inline-flex items-center gap-1.5 font-mono transition-colors hover:text-primary"
              >
                <span>←</span>
                <span>{categoryLabel}</span>
              </Link>

              {seriesNav && (
                <>
                  <span aria-hidden="true" className="text-muted-foreground/40">
                    ·
                  </span>
                  <Link
                    href={`/blog/series/${seriesNav.series.id}`}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-primary transition-colors hover:underline"
                  >
                    <span>专栏：{seriesNav.series.title}</span>
                    <span>→</span>
                  </Link>
                </>
              )}
            </div>

            <ReaderFocusButton />
          </div>

          {/* 左对齐出版物文章题头 */}
          <header className="flex flex-col items-start gap-3.5 border-b border-hair pb-7 text-left">
            {post.heroImage && (
              <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-xl border border-hair">
                <Image
                  src={post.heroImage}
                  alt={`${post.title} hero image`}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
              </div>
            )}

            <h1 className="max-w-3xl text-balance font-serif text-3xl font-medium leading-[1.24] tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem]">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center justify-start gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              {post.updatedDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>(已编辑 {formatDate(post.updatedDate)})</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{categoryLabel}</span>
              {post.tags.length > 0 && (
                <>
                  <span aria-hidden="true">/</span>
                  <span>{post.tags.slice(0, 4).join(', ')}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{readingTime}</span>
              {post.aiGenerated && (
                <>
                  <span aria-hidden="true">·</span>
                  <AiGeneratedLabel aiGenerated={post.aiGenerated} />
                </>
              )}
              <span aria-hidden="true">·</span>
              <ArticleViewerCount slug={post.slug} mode="detailed" />
            </div>

            {post.description && (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{post.description}</p>
            )}
          </header>

          {/* AI 关键洞察 */}
          {summary && (
            <div className="mt-8">
              <AiSummary summary={summary} />
            </div>
          )}

          {/* 正文 */}
          <div className="mt-10">
            <MdxContent source={post.content} />
          </div>

          {/* 专栏章节导轨 */}
          {seriesNav && (
            <div className="mt-12">
              <SeriesPaginator nav={seriesNav} />
            </div>
          )}

          {/* 版权落款与签名 */}
          <div className="mt-14">
            <CopyrightCard post={post} />
          </div>

          {/* 评论 */}
          <div id="comments" className="mt-10">
            <CommentSection slug={post.slug} />
          </div>
        </article>

        {/* 右侧粘性导轨：目录 + 有机分隔线 + 环形阅读进度 + 悬浮图标栏 */}
        <aside
          id="sidebar"
          className={
            seriesDetail
              ? 'sticky top-24 hidden max-h-[calc(100vh-7rem)] w-48 shrink-0 overflow-y-auto xl:block'
              : 'sticky top-24 hidden max-h-[calc(100vh-7rem)] w-52 shrink-0 overflow-y-auto lg:block'
          }
        >
          <TableOfContents headings={headings} showRailTools />
        </aside>

        {/* 移动端/小屏浮动目录抽屉与返回顶部 */}
        <FloatingActionGroup
          headings={headings}
          series={seriesDetail?.series}
          seriesPosts={seriesDetail?.posts}
          currentSlug={post.slug}
        />
      </ArticleReaderShell>
    </>
  )
}
