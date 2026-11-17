import Link from 'next/link'

export interface BlogSidebarProps {
  tags: Array<{ tag: string; count?: number }>
  className?: string
}

/**
 * 博客列表页右侧无框标签索引栏。
 * 以发丝线分隔侧栏与无边框排版标签流，悬停展开墨线。
 */
export function BlogSidebar({ tags, className = '' }: BlogSidebarProps) {
  if (tags.length === 0) return null

  return (
    <aside
      id="sidebar"
      className={`flex min-w-0 flex-col border-t border-hair pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0 ${className}`}
    >
      <div className="mb-3.5 flex items-center justify-between border-b border-hair pb-2.5">
        <h2 className="font-mono text-xs text-muted-foreground">标签</h2>
        <Link
          href="/blog/tags"
          className="group/ink inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="ink-line">全部</span>
          <span aria-hidden="true" className="ink-glide group-hover/ink:translate-x-0.5">
            →
          </span>
        </Link>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2.5 text-xs">
        {tags.slice(0, 18).map(({ tag, count }) => (
          <li key={tag} className="min-w-0 max-w-full">
            <Link
              href={`/blog/tags/${encodeURIComponent(tag)}`}
              className="ink-link inline-flex max-w-full items-baseline gap-1 py-0.5 break-words text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">#{tag}</span>
              {count !== undefined && (
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/65">{count}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
