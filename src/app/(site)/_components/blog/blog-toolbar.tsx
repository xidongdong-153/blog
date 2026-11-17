import type { BlogCategory, BlogSortOrder, BlogSourceFilter } from '@/lib/blog-meta'
import Link from 'next/link'
import { buildBlogListUrl } from '@/lib/blog-meta'
import { BLOG_CATEGORIES, BLOG_CATEGORY_LABELS, BLOG_SORT_LABELS } from '@/lib/content'
import { FilterLabel } from './filter-label'

export interface BlogToolbarProps {
  currentCategory?: BlogCategory
  currentSort: BlogSortOrder
  currentSource: BlogSourceFilter
  categoryCounts?: Record<BlogCategory, number>
}

const SORT_OPTIONS: BlogSortOrder[] = ['newest', 'oldest', 'updated']

/**
 * 博客分类筛选与排序工具栏组件。
 */
export function BlogToolbar({ currentCategory, currentSort, currentSource, categoryCounts }: BlogToolbarProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-hair pb-3 lg:flex-row lg:items-center lg:justify-between">
      {/* 分类切换组 */}
      <nav aria-label="文章分类筛选" className="flex flex-wrap items-center gap-x-6 gap-y-1">
        {BLOG_CATEGORIES.map((category) => {
          const isActive = currentCategory === category
          const nextCategory = isActive ? undefined : category
          const href = buildBlogListUrl({ source: currentSource, category: nextCategory, sort: currentSort })
          const label = BLOG_CATEGORY_LABELS[category]
          const count = categoryCounts?.[category]

          return (
            <Link
              key={category}
              href={href}
              scroll={false}
              aria-current={isActive ? 'true' : undefined}
              className={[
                'group/filter ink-glide inline-flex min-h-10 items-center gap-1.5 rounded-sm py-1 text-[13px] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
                isActive ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <FilterLabel active={isActive}>{label}</FilterLabel>
              {count !== undefined && (
                <span className="font-mono text-xs tabular-nums text-muted-foreground/75">({count})</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* 排序模式与时间线入口 */}
      <div className="flex flex-wrap items-center gap-x-3 text-xs lg:justify-end">
        <div className="flex items-center gap-2">
          <span className="sr-only">排序</span>
          <div className="flex items-center gap-1">
            {SORT_OPTIONS.map((sortKey, index) => {
              const isActive = currentSort === sortKey
              const href = buildBlogListUrl({ source: currentSource, category: currentCategory, sort: sortKey })
              const label = BLOG_SORT_LABELS[sortKey]

              return (
                <span key={sortKey} className="flex items-center gap-1">
                  {index > 0 && <span className="text-muted-foreground/40">·</span>}
                  <Link
                    href={href}
                    scroll={false}
                    aria-current={isActive ? 'true' : undefined}
                    className={[
                      'group/filter ink-glide inline-flex min-h-10 items-center rounded-sm px-1.5 py-0.5 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      isActive ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                  >
                    <FilterLabel active={isActive}>{label}</FilterLabel>
                  </Link>
                </span>
              )
            })}
          </div>
        </div>

        <span className="hidden text-border sm:inline">/</span>

        <Link
          href="/blog/archives"
          aria-label="按时间线查看全部文章"
          className="group/ink inline-flex min-h-10 items-center gap-1 px-1 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="ink-line">时间线</span>
          <span
            aria-hidden="true"
            className="ink-glide text-xs group-hover/ink:translate-x-0.5 group-hover/ink:-translate-y-0.5"
          >
            ↗
          </span>
        </Link>
      </div>
    </div>
  )
}
