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

interface SeriesPageProps {
  params: Promise<{ id: string }>
}

/** 预生成所有静态专栏路由。 */
export function generateStaticParams() {
  return Object.keys(REGISTERED_SERIES).map((id) => ({ id }))
}

/** 未在注册表中列出的专栏直接 404。 */
export const dynamicParams = false

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
  const detail = getSeriesDetail(id)

  if (!detail) {
    notFound()
  }

  const { series, posts } = detail

  return (
    <div className="mx-auto w-full max-w-4xl">
      <main className="flex flex-col gap-10">
        {/* 面包屑与顶部眉标 */}
        <div className="flex flex-col gap-4 border-b border-border/40 pb-8">
          <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
            <Link href="/blog" className="transition-colors hover:text-foreground">
              ← 全部文章
            </Link>
            <span>/</span>
            <span>// 系列专栏</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs tracking-wider ${
                series.status === 'in-progress'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-border/60 bg-muted/40 text-muted-foreground'
              }`}
            >
              状态: {SERIES_STATUS_LABELS[series.status]}
            </span>
            <span className="font-mono text-xs text-muted-foreground">已收录 {posts.length} 篇</span>
          </div>

          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {series.title}
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{series.description}</p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex flex-wrap gap-2 font-mono text-xs text-muted-foreground">
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
                className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
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
                <span>配套开源仓库 ↗</span>
              </a>
            )}
          </div>
        </div>

        {/* 章节大纲目录树 */}
        <section aria-label="专栏章节目录" className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">// 章节大纲</h2>
            <span className="font-mono text-xs text-muted-foreground">共 {posts.length} 讲</span>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-card/20 p-8 text-center">
              <p className="text-sm text-muted-foreground">该专栏筹备中，首篇章节即将发布。</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {groupSeriesPosts(posts, series.groups).map((group) => (
                <div key={group.name} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <h3 className="font-sans text-sm font-semibold text-foreground/90">{group.name}</h3>
                    <span className="font-mono text-xs text-muted-foreground/70">{group.posts.length} 篇</span>
                  </div>

                  <ol className="relative flex flex-col gap-4 border-l border-border/60 pl-6 ml-3">
                    {group.posts.map((post, index) => {
                      const chapterOrder = post.series?.order ?? index + 1
                      const formattedOrder = String(chapterOrder).padStart(2, '0')
                      const readingTime = calculateReadingTime(post.content)

                      return (
                        <li key={post.slug} className="group relative">
                          {/* 时间轴刻度圆点：精准锚定在垂直导轨中心线与第一行元数据中轴线 */}
                          <span className="absolute -left-[24.5px] top-7 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background transition-all duration-150 group-hover:scale-125 group-hover:border-primary group-hover:bg-primary" />

                          <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/30 p-5 transition-all hover:border-foreground/30 hover:bg-muted/30">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground/80">第 {formattedOrder} 讲</span>
                                <span>/</span>
                                <time dateTime={post.date}>{formatDate(post.date)}</time>
                                <span>/</span>
                                <span>{readingTime}</span>
                              </div>
                              <span className="font-mono text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                                阅读文章 →
                              </span>
                            </div>

                            <h4 className="font-serif text-lg font-medium tracking-tight text-foreground sm:text-xl">
                              <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-primary">
                                {post.title}
                              </Link>
                            </h4>

                            {post.description && (
                              <p className="text-sm leading-relaxed text-muted-foreground">{post.description}</p>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
