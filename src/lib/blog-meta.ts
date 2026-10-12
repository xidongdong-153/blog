/**
 * 文章分类、来源筛选、列表链接与阅读时间的展示元数据。
 *
 * 这个模块只放不依赖 `node:fs` 的类型、常量和纯函数：`PostCard` 会在浏览器端渲染搜索结果，
 * 一旦从 `src/lib/content.ts` 值导入，会把 Node 文件系统模块打进浏览器包。
 * `content.ts` 统一 re-export 这里的导出，既有的 `@/lib/content` 导入路径保持有效。
 */

export type BlogCategory = 'tech' | 'tinkering' | 'thoughts'
export type BlogSortOrder = 'newest' | 'oldest' | 'updated'
export type BlogSourceFilter = 'all' | 'human'

export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  tech: '技术',
  tinkering: '捣鼓',
  thoughts: '随想',
}

export const BLOG_CATEGORIES: BlogCategory[] = ['tech', 'tinkering', 'thoughts']

/** 按文章来源筛选，不改变输入数组或文章顺序。 */
export function filterBlogPostsBySource<T extends { aiGenerated: boolean }>(
  posts: T[],
  source: BlogSourceFilter = 'all',
): T[] {
  return source === 'human' ? posts.filter((post) => !post.aiGenerated) : posts
}

/** 构造文章列表链接；省略默认值，不传 page 时回到第一页。 */
export function buildBlogListUrl({
  source,
  category,
  sort,
  page,
}: {
  source?: BlogSourceFilter
  category?: BlogCategory
  sort?: BlogSortOrder
  page?: number
} = {}): string {
  const params = new URLSearchParams()
  if (source === 'human') {
    params.set('source', source)
  }
  if (category) {
    params.set('category', category)
  }
  if (sort && sort !== 'newest') {
    params.set('sort', sort)
  }
  if (page && page > 1) {
    params.set('page', String(page))
  }
  const query = params.toString()
  return query ? `/blog?${query}` : '/blog'
}

/**
 * 估算文章或笔记阅读时间（分钟），按中文 350 字/分钟、英文 160 词/分钟估算。
 * 格式如 "预计阅读 1 分钟"。
 */
export function calculateReadingTime(content: string): string {
  const clean = content.replace(/```[\s\S]*?```/g, '').replace(/<[^>]+>/g, '')
  const cjkChars = (clean.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) ?? [])
    .length
  const words = (
    clean.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, ' ').match(/[-\w]+/g) ??
    []
  ).length
  const minutes = Math.max(1, Math.ceil(cjkChars / 350 + words / 160))
  return `预计阅读 ${minutes} 分钟`
}
