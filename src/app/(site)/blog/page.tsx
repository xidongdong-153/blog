import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllBlogPosts, getAllBlogTags } from '@/lib/content'
import { BlogSidebar } from '../_components/blog/blog-sidebar'
import { Button } from '../_components/blog/button'
import { Paginator } from '../_components/blog/paginator'
import { PostCard } from '../_components/blog/post-card'

export const metadata: Metadata = {
  title: 'Blog',
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
          text: '← Previous Posts',
        }
      : undefined

  const nextUrl =
    currentPage < totalPages
      ? {
          url: `/blog?page=${currentPage + 1}`,
          text: 'Next Posts →',
        }
      : undefined

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Button title="Back" href="/" style="back" />

      <main className="mt-6 lg:mt-10">
        <div id="content-header">
          <h1 className="mb-6 mt-6 text-3xl font-medium sm:mt-10">Blog</h1>
        </div>

        {allPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          <div className="grid gap-y-16 sm:grid-cols-[3fr_1fr] sm:gap-x-8">
            <section aria-label="Blog posts list" id="content">
              {/* 列表头部信息条 */}
              <div className="mb-3 flex flex-col justify-between text-sm sm:mb-5 sm:flex-row">
                <span className="text-muted-foreground">
                  Page {currentPage} - Showing {posts.length} of {totalPosts} posts
                </span>
                <Link
                  aria-label="View all blog by years"
                  href="/blog/archives"
                  className="text-muted-foreground transition-colors hover:text-primary hover:underline"
                >
                  View all posts by years →
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
