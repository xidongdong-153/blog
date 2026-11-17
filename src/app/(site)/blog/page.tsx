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
import { PageHeader } from '../_components/site/page-header'

export const dynamic = 'force-dynamic'

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

  const { sourcePosts, categoryCounts, posts, totalPages } = getBlogListData(await getAllBlogPosts(), {
    source: activeSource,
    category: activeCategory,
    sort: activeSort,
    page: currentPage,
  })
  const tags = await getAllBlogTags()
  const featuredSeries = (await getAllSeries()).find((s) => s.postsCount > 0)

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
    <div data-page-entrance className="mx-auto flex w-full max-w-5xl flex-col gap-8 sm:gap-10">
      <div className="entrance">
        <PageHeader eyebrow="Blog" title="文章" description="技术实践、折腾记录与日常思考。" />
      </div>

      {featuredSeries && (
        <div className="entrance [--entrance-delay:60ms]">
          <SeriesBanner series={featuredSeries} />
        </div>
      )}

      <BlogSearch
        posts={sourcePosts}
        currentSource={activeSource}
        sourceSwitch={
          <BlogSourceSwitch currentSource={activeSource} currentCategory={activeCategory} currentSort={activeSort} />
        }
        toolbar={
          <BlogToolbar
            currentCategory={activeCategory}
            currentSort={activeSort}
            currentSource={activeSource}
            categoryCounts={categoryCounts}
          />
        }
        sidebar={tags.length > 0 ? <BlogSidebar tags={tags} /> : null}
      >
        <section
          key={`${activeSource}-${activeCategory ?? 'all'}-${activeSort}-${currentPage}`}
          aria-label="文章列表"
          id="content"
          className="min-w-0"
        >
          {posts.length > 0 ? (
            <ul className="flex flex-col text-start">
              {posts.map((post, index) => (
                <PostCard
                  key={post.slug}
                  post={post}
                  entranceIndex={index}
                  showUpdatedDate={activeSort === 'updated'}
                  currentSource={activeSource}
                />
              ))}
            </ul>
          ) : (
            <p className="entrance py-8 text-sm text-muted-foreground [--entrance-delay:180ms]">当前条件下暂无文章。</p>
          )}

          <div className="entrance [--entrance-delay:300ms]">
            <Paginator prevUrl={prevUrl} nextUrl={nextUrl} />
          </div>
        </section>
      </BlogSearch>
    </div>
  )
}
