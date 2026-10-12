import type { Metadata } from 'next'
import type { BlogSourceFilter } from '@/lib/blog-meta'
import type { BlogCategory, BlogSortOrder } from '@/lib/content'
import { buildBlogListUrl } from '@/lib/blog-meta'
import { getAllBlogPosts, getAllBlogTags, getAllSeries, getBlogListData } from '@/lib/content'
import { BlogSearch } from '../_components/blog/blog-search'
import { BlogSidebar } from '../_components/blog/blog-sidebar'
import { BlogSourceSwitch } from '../_components/blog/blog-source-switch'
import { BlogToolbar } from '../_components/blog/blog-toolbar'
import { Paginator } from '../_components/blog/paginator'
import { PostCard } from '../_components/blog/post-card'
import { SeriesBanner } from '../_components/blog/series-banner'

export const metadata: Metadata = {
  title: '文章',
}

interface BlogPageProps {
  searchParams?: Promise<{
    page?: string
    category?: string
    sort?: string
    source?: string
  }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const rawPage = resolvedSearchParams.page
  const currentPage = Math.max(1, parseInt(rawPage ?? '1', 10) || 1)

  const rawCategory = resolvedSearchParams.category
  const activeCategory: BlogCategory | undefined =
    rawCategory === 'tech' || rawCategory === 'tinkering' || rawCategory === 'thoughts' ? rawCategory : undefined

  const rawSort = resolvedSearchParams.sort
  const activeSort: BlogSortOrder = rawSort === 'oldest' || rawSort === 'updated' ? rawSort : 'newest'
  const activeSource: BlogSourceFilter = resolvedSearchParams.source === 'human' ? 'human' : 'all'

  const { sourcePosts, categoryCounts, posts, totalPages } = getBlogListData(getAllBlogPosts(), {
    source: activeSource,
    category: activeCategory,
    sort: activeSort,
    page: currentPage,
  })
  const tags = getAllBlogTags()
  const featuredSeries = getAllSeries().find((s) => s.postsCount > 0)

  function getPageUrl(pageNum: number): string {
    return buildBlogListUrl({ source: activeSource, category: activeCategory, sort: activeSort, page: pageNum })
  }

  const prevUrl =
    currentPage > 1
      ? {
          url: getPageUrl(currentPage - 1),
          text: '← 上一页',
        }
      : undefined

  const nextUrl =
    currentPage < totalPages
      ? {
          url: getPageUrl(currentPage + 1),
          text: '下一页 →',
        }
      : undefined

  return (
    <div className="mx-auto w-full max-w-5xl">
      <main>
        <div id="content-header" className="mb-6">
          <div className="mb-2 font-mono text-xs tracking-wider text-muted-foreground">// 写作与手记</div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">文章</h1>
        </div>

        {featuredSeries && (
          <div className="mb-8">
            <SeriesBanner series={featuredSeries} />
          </div>
        )}

        <div className="flex flex-col gap-6">
          <BlogSourceSwitch currentSource={activeSource} currentCategory={activeCategory} currentSort={activeSort} />
          <BlogSearch posts={sourcePosts} currentSource={activeSource}>
            {/* 分类筛选与多维排序工具栏 */}
            <BlogToolbar
              currentCategory={activeCategory}
              currentSort={activeSort}
              currentSource={activeSource}
              categoryCounts={categoryCounts}
            />

            <div className="grid gap-y-16 sm:grid-cols-[3fr_1fr] sm:gap-x-8">
              <section aria-label="文章列表" id="content">
                {/* 文章列表 */}
                {posts.length > 0 ? (
                  <ul className="flex flex-col text-start">
                    {posts.map((post) => (
                      <PostCard
                        key={post.slug}
                        post={post}
                        showUpdatedDate={activeSort === 'updated'}
                        currentSource={activeSource}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="py-12 text-sm text-muted-foreground">当前条件下暂无文章。</p>
                )}

                {/* 分页器 */}
                <Paginator prevUrl={prevUrl} nextUrl={nextUrl} />
              </section>

              {/* 右侧标签侧边栏 */}
              <BlogSidebar tags={tags} />
            </div>
          </BlogSearch>
        </div>
      </main>
    </div>
  )
}
