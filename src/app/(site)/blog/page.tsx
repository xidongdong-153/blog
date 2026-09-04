import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllBlogPosts, getAllBlogTags } from '@/lib/content'
import { BlogSidebar } from '../_components/blog/blog-sidebar'
import { Button } from '../_components/blog/button'
import { Paginator } from '../_components/blog/paginator'
import { PostCard } from '../_components/blog/post-card'

export const metadata: Metadata = {
  title: '文章',
}

const PAGE_SIZE = 8

interface BlogPageProps {
  searchParams?: Promise<{ page?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const rawPage = resolvedSearchParams.page
  const currentPage = Math.max(1, parseInt(rawPage ?? '1', 10) || 1)

  const allPosts = getAllBlogPosts().filter((post) => !post.draft)
  const tags = getAllBlogTags()
  const totalPosts = allPosts.length
  const totalPages = Math.ceil(totalPosts / PAGE_SIZE) || 1

  const startIndex = (currentPage - 1) * PAGE_SIZE
  const posts = allPosts.slice(startIndex, startIndex + PAGE_SIZE)

  const prevUrl =
    currentPage > 1
      ? {
          url: currentPage === 2 ? '/blog' : `/blog?page=${currentPage - 1}`,
          text: '← 上一页',
        }
      : undefined

  const nextUrl =
    currentPage < totalPages
      ? {
          url: `/blog?page=${currentPage + 1}`,
          text: '下一页 →',
        }
      : undefined

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Button title="返回" href="/" style="back" />

      <main className="mt-6 lg:mt-10">
        <div id="content-header" className="mb-8 mt-6 sm:mt-10">
          <div className="mb-2 font-mono text-xs tracking-wider text-muted-foreground">// 文章归档</div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">文章</h1>
        </div>

        {allPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无文章。</p>
        ) : (
          <div className="grid gap-y-16 sm:grid-cols-[3fr_1fr] sm:gap-x-8">
            <section aria-label="文章列表" id="content">
              {/* 列表头部信息条 */}
              <div className="mb-3 flex flex-col justify-between text-sm sm:mb-5 sm:flex-row">
                <span className="text-muted-foreground">
                  第 {currentPage} 页 · 共 {totalPosts} 篇
                </span>
                <Link
                  aria-label="按年份查看全部文章"
                  href="/blog/archives"
                  className="text-muted-foreground transition-colors hover:text-primary hover:underline"
                >
                  按年份查看全部文章 →
                </Link>
              </div>

              {/* 文章列表 */}
              <ul className="flex flex-col gap-y-4 text-start">
                {posts.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </ul>

              {/* 分页器 */}
              <Paginator prevUrl={prevUrl} nextUrl={nextUrl} />
            </section>

            {/* 右侧标签侧边栏 */}
            <BlogSidebar tags={tags} />
          </div>
        )}
      </main>
    </div>
  )
}
