import type { BlogCategory, BlogSortOrder, BlogSourceFilter } from '@/lib/blog-meta'
import Link from 'next/link'
import { buildBlogListUrl } from '@/lib/blog-meta'

const SOURCE_OPTIONS = [
  { value: 'all', label: '全部文章' },
  { value: 'human', label: '非 AI 文章' },
] as const

/** 切换文章来源，保留分类和排序并回到第一页；搜索态仍显示。 */
export function BlogSourceSwitch({
  currentSource,
  currentCategory,
  currentSort,
}: {
  currentSource: BlogSourceFilter
  currentCategory?: BlogCategory
  currentSort: BlogSortOrder
}) {
  return (
    <nav aria-label="文章来源筛选" className="flex flex-wrap items-center gap-2 font-mono text-xs">
      {SOURCE_OPTIONS.map(({ value, label }, index) => (
        <span key={value} className="flex items-center gap-2">
          {index > 0 && (
            <span aria-hidden="true" className="text-border/80">
              ·
            </span>
          )}
          <Link
            href={buildBlogListUrl({ source: value, category: currentCategory, sort: currentSort })}
            scroll={false}
            aria-current={currentSource === value ? 'page' : undefined}
            className={
              currentSource === value
                ? 'py-1 text-foreground underline underline-offset-4 decoration-primary'
                : 'py-1 text-muted-foreground transition-colors hover:text-foreground'
            }
          >
            {label}
          </Link>
        </span>
      ))}
    </nav>
  )
}
