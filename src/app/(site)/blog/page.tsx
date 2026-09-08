import type { Metadata } from 'next'
import type { BlogCategory, BlogSortOrder } from '@/lib/content'
import { getAllBlogPosts, getAllBlogTags, sortBlogPosts } from '@/lib/content'
import { BlogSidebar } from '../_components/blog/blog-sidebar'
import { BlogToolbar } from '../_components/blog/blog-toolbar'
import { Paginator } from '../_components/blog/paginator'
import { PostCard } from '../_components/blog/post-card'

export const metadata: Metadata = {
  title: '文章',
}

const PAGE_SIZE = 8

interface BlogPageProps {
  searchParams?: Promise<{
    page?: string
    category?: string
    sort?: string
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

  const allPosts = getAllBlogPosts().filter((post) => !post.draft)
  const tags = getAllBlogTags()

  // 统计各分类文章数
  const categoryCounts: Record<BlogCategory, number> = {
    tech: 0,
    tinkering: 0,
    thoughts: 0,
  }
  for (const post of allPosts) {
    categoryCounts[post.category] = (categoryCounts[post.category] ?? 0) + 1
  }

  // 筛选分类
  const filteredPosts = activeCategory ? allPosts.filter((post) => post.category === activeCategory) : allPosts

  // 排序
  const sortedPosts = sortBlogPosts(filteredPosts, activeSort)
  const totalPosts = sortedPosts.length
  const totalPages = Math.ceil(totalPosts / PAGE_SIZE) || 1

  const startIndex = (currentPage - 1) * PAGE_SIZE
  const posts = sortedPosts.slice(startIndex, startIndex + PAGE_SIZE)

  function getPageUrl(pageNum: number): string {
    const params = new URLSearchParams()
    if (activeCategory) {
      params.set('category', activeCategory)
    }
    if (activeSort !== 'newest') {
      params.set('sort', activeSort)
    }
    if (pageNum > 1) {
      params.set('page', String(pageNum))
    }
    const query = params.toString()
    return query ? `/blog?${query}` : '/blog'
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

        {allPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无文章。</p>
        ) : (
          <div className="flex flex-col gap-6">
            {/* 分类筛选与多维排序工具栏 */}
            <BlogToolbar currentCategory={activeCategory} currentSort={activeSort} categoryCounts={categoryCounts} />

            <div className="grid gap-y-16 sm:grid-cols-[3fr_1fr] sm:gap-x-8">
              <section aria-label="文章列表" id="content">
                {/* 文章列表 */}
                {posts.length > 0 ? (
                  <ul className="flex flex-col text-start">
                    {posts.map((post) => (
                      <PostCard key={post.slug} post={post} showUpdatedDate={activeSort === 'updated'} />
                    ))}
                  </ul>
                ) : (
                  <p className="py-12 text-sm text-muted-foreground">该分类下暂无文章。</p>
                )}

                {/* 分页器 */}
                <Paginator prevUrl={prevUrl} nextUrl={nextUrl} />
              </section>

              {/* 右侧标签侧边栏 */}
              <BlogSidebar tags={tags} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
