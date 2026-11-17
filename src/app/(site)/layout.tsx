import type { HeaderPostItem } from './_components/site/command-search-modal'
import type { HeaderCategoryStat } from './_components/site/site-header'
import { getAllBlogPosts, getBlogCategoriesWithCount } from '@/lib/content'
import { AmbientBackdrop } from './_components/site/ambient-backdrop'
import { PaperCanvas } from './_components/site/paper-canvas'
import { PostPreviewChrome } from './_components/site/post-preview-chrome'
import { SiteFooter } from './_components/site/site-footer'
import { SiteHeader } from './_components/site/site-header'
import { VisitorPresenceProvider } from './_components/visitor/visitor-presence-provider'

/** 站点路由组布局：所有公开页面共享页头、页脚、和纸背景画布与访客实时在线连接。 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  let headerPosts: HeaderPostItem[] = []
  let headerCategories: HeaderCategoryStat[] = []

  try {
    const [posts, categories] = await Promise.all([getAllBlogPosts(), getBlogCategoriesWithCount()])
    headerPosts = posts
      .filter((post) => !post.draft)
      .map((post) => ({
        slug: post.slug,
        title: post.title,
        description: post.description,
        category: post.category,
        date: post.date,
        tags: post.tags,
        aiGenerated: post.aiGenerated,
      }))
    headerCategories = categories
  } catch {
    headerPosts = []
    headerCategories = []
  }

  return (
    <VisitorPresenceProvider>
      <div className="relative flex min-h-screen flex-col overflow-x-clip">
        <PaperCanvas />
        <AmbientBackdrop id="global-ambient-backdrop" />
        <PostPreviewChrome>
          <SiteHeader posts={headerPosts} categories={headerCategories} />
        </PostPreviewChrome>
        <main className="relative z-10 mx-auto w-full flex-1 px-6 py-8 sm:py-10">{children}</main>
        <PostPreviewChrome>
          <SiteFooter />
        </PostPreviewChrome>
      </div>
    </VisitorPresenceProvider>
  )
}
