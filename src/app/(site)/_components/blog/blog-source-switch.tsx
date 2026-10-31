import type { BlogCategory, BlogSortOrder, BlogSourceFilter } from '@/lib/blog-meta'
import Link from 'next/link'
import { buildBlogListUrl } from '@/lib/blog-meta'
import { FilterLabel } from './filter-label'

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
            className={`group/filter inline-flex min-h-11 items-center rounded-sm py-1 transition-[color,transform] duration-150 ease-out active:translate-y-px motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${currentSource === value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <FilterLabel active={currentSource === value}>{label}</FilterLabel>
          </Link>
        </span>
      ))}
    </nav>
  )
}
