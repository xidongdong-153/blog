import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  calculateReadingTime,
  formatDate,
  getSeriesDetail,
  groupSeriesPosts,
  REGISTERED_SERIES,
  SERIES_STATUS_LABELS,
} from '@/lib/content'
import { AiGeneratedLabel } from '../../../_components/blog/ai-generated-label'

interface SeriesPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

/** 动态生成专栏 SEO 元数据。 */
export async function generateMetadata({ params }: SeriesPageProps): Promise<Metadata> {
  const { id } = await params
  const series = REGISTERED_SERIES[id]
  if (!series) {
    return {}
  }

  return {
    title: `${series.title} - 系列专栏`,
    description: series.description,
  }
}

/**
 * 专栏专题大纲主页。
 * 展示专栏定位、连载状态、配套开源项目仓库以及章节大纲导轨。
 */
export default async function SeriesDetailPage({ params }: SeriesPageProps) {
  const { id } = await params
  const detail = await getSeriesDetail(id)

  if (!detail) {
    notFound()
  }

  const { series, posts } = detail

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex flex-col gap-10">
        {/* 面包屑与顶部眉标 */}
        <div className="flex flex-col gap-4 border-b border-border/40 pb-8">
          <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
            <Link
              href="/blog"
              className="group/ink inline-flex items-center gap-1.5 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span aria-hidden="true" className="ink-glide group-hover/ink:-translate-x-1">
                ←
              </span>
              <span className="ink-line">全部文章</span>
            </Link>
            <span>·</span>
            <span>系列专栏</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <span
              className={
                series.status === 'in-progress' ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
              }
            >
              {SERIES_STATUS_LABELS[series.status]}
            </span>
            <span aria-hidden="true" className="text-muted-foreground/40">
              ·
            </span>
            <span className="text-muted-foreground">已收录 {posts.length} 篇</span>
          </div>

          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {series.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
              {series.tags.map((tag) => (
                <span key={tag} className="select-none">
                  #{tag}
                </span>
              ))}
            </div>

            {series.repositoryUrl && (
              <a
                href={series.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group/ink inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5"
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
                <span className="ink-line">配套开源仓库</span>
                <span
                  aria-hidden="true"
                  className="ink-glide group-hover/ink:translate-x-0.5 group-hover/ink:-translate-y-0.5"
                >
                  ↗
                </span>
              </a>
            )}
          </div>
        </div>

        {/* 章节大纲目录树 */}
        <section aria-label="专栏章节目录" className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs text-muted-foreground">章节大纲</h2>
            <span className="font-mono text-xs text-muted-foreground">共 {posts.length} 讲</span>
          </div>

          {posts.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">该专栏筹备中，首篇章节即将发布。</p>
          ) : (
            <div className="flex flex-col gap-8">
              {groupSeriesPosts(posts, series.groups).map((group) => (
                <div key={group.name} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-hair pb-2">
                    <h3 className="font-sans text-sm font-semibold text-foreground/90">{group.name}</h3>
                    <span className="font-mono text-xs text-muted-foreground/70">{group.posts.length} 篇</span>
                  </div>

                  <ol className="relative ml-3 flex flex-col divide-y divide-hair border-l border-hair pl-6">
                    {group.posts.map((post, index) => {
                      const chapterOrder = post.series?.order ?? index + 1
                      const readingTime = calculateReadingTime(post.content)

                      return (
                        <li key={post.slug} className="group/item relative py-5 first:pt-2">
                          <span
                            aria-hidden="true"
                            className="absolute -left-[24.5px] top-7 -translate-x-1/2 -translate-y-1/2 group-first/item:top-4"
                          >
                            <span className="ink-glide block size-2 rounded-full border border-border bg-background group-hover/item:scale-125 group-hover/item:border-primary group-hover/item:bg-primary group-focus-within/item:scale-125 group-focus-within/item:border-primary group-focus-within/item:bg-primary" />
                          </span>

                          <Link
                            href={`/blog/${post.slug}`}
                            className="ink-glide flex flex-col gap-2 focus-visible:translate-x-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring group-hover/item:translate-x-1.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
                                <span className="font-semibold text-primary tabular-nums">{chapterOrder}</span>
                                <span>/</span>
                                <time dateTime={post.date}>{formatDate(post.date)}</time>
                                <span>/</span>
                                <span>{readingTime}</span>
                                {post.aiGenerated && (
                                  <>
                                    <span>/</span>
                                    <AiGeneratedLabel aiGenerated={post.aiGenerated} />
                                  </>
                                )}
                              </div>
                              <span className="font-mono text-xs text-primary opacity-0 transition-opacity duration-200 group-hover/item:opacity-100 group-focus-within/item:opacity-100">
                                阅读文章 →
                              </span>
                            </div>

                            <h4 className="min-w-0 font-serif text-lg font-medium tracking-tight text-foreground transition-colors [overflow-wrap:anywhere] group-hover/item:text-primary sm:text-xl">
                              {post.title}
                            </h4>

                            {post.description && (
                              <p className="text-sm leading-relaxed text-muted-foreground">{post.description}</p>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
