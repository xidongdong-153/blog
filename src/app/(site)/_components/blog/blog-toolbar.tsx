import type { BlogCategory, BlogSortOrder } from '@/lib/content'
import Link from 'next/link'
import { BLOG_CATEGORIES, BLOG_CATEGORY_LABELS, BLOG_SORT_LABELS } from '@/lib/content'

export interface BlogToolbarProps {
  currentCategory?: BlogCategory
  currentSort: BlogSortOrder
  categoryCounts?: Record<BlogCategory, number>
}

const SORT_OPTIONS: BlogSortOrder[] = ['newest', 'oldest', 'updated']

function buildQueryString(category?: BlogCategory, sort?: BlogSortOrder): string {
  const params = new URLSearchParams()
  if (category) {
    params.set('category', category)
  }
  if (sort && sort !== 'newest') {
    params.set('sort', sort)
  }
  const query = params.toString()
  return query ? `/blog?${query}` : '/blog'
}

/**
 * 博客分类筛选与排序工具栏组件。
 * 提供具体分类切换（不设“全部”选项，点击已选项反选还原全部）与多维时间排序。
 */
export function BlogToolbar({ currentCategory, currentSort, categoryCounts }: BlogToolbarProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between">
      {/* 分类切换组 */}
      <nav aria-label="文章分类筛选" className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-xs tracking-wider text-muted-foreground">// 分类</span>
        {BLOG_CATEGORIES.map((category) => {
          const isActive = currentCategory === category
          const nextCategory = isActive ? undefined : category
          const href = buildQueryString(nextCategory, currentSort)
          const label = BLOG_CATEGORY_LABELS[category]
          const count = categoryCounts?.[category]

          return (
            <Link
              key={category}
              href={href}
              scroll={false}
              aria-pressed={isActive}
              className={[
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs transition-all duration-150',
                isActive
                  ? 'border border-primary/50 bg-primary/10 font-medium text-primary shadow-xs'
                  : 'border border-border/60 bg-muted/20 text-muted-foreground hover:border-foreground/30 hover:bg-muted/50 hover:text-foreground',
              ].join(' ')}
            >
              <span>{label}</span>
              {count !== undefined && (
                <span
                  className={[
                    'text-[0.65rem] tabular-nums',
                    isActive ? 'text-primary/75' : 'text-muted-foreground/60',
                  ].join(' ')}
                >
                  ({count})
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* 排序模式组 */}
      <div className="flex items-center gap-2 font-mono text-xs sm:justify-end">
        <span className="tracking-wider text-muted-foreground">// 排序</span>
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map((sortKey, index) => {
            const isActive = currentSort === sortKey
            const href = buildQueryString(currentCategory, sortKey)
            const label = BLOG_SORT_LABELS[sortKey]

            return (
              <span key={sortKey} className="flex items-center gap-1">
                {index > 0 && <span className="text-border/80">·</span>}
                <Link
                  href={href}
                  scroll={false}
                  aria-current={isActive ? 'true' : undefined}
                  className={[
                    'px-1 py-0.5 transition-colors',
                    isActive
                      ? 'font-medium text-foreground underline underline-offset-4 decoration-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {label}
                </Link>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
