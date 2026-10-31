import Link from 'next/link'

export interface BlogSidebarProps {
  tags: Array<{ tag: string; count?: number }>
  className?: string
}

/**
 * 博客列表页右侧边栏组件，提供标签筛选导航。
 * 包含标签小图标、Tags 标题、Pill 标签云与查看全部标签入口。
 */
export function BlogSidebar({ tags, className = '' }: BlogSidebarProps) {
  if (tags.length === 0) return null

  return (
    <aside id="sidebar" className={`flex min-w-0 flex-col ${className}`}>
      <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-2">
        <h2 className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">// 标签</h2>
      </div>

      <ul className="flex flex-wrap gap-2 text-xs font-mono">
        {tags.map(({ tag, count }) => (
          <li key={tag} className="min-w-0 max-w-full">
            <Link
              href={`/blog/tags/${tag}`}
              className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-md border border-border/60 bg-card/40 px-2.5 py-1 break-words text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">#{tag}</span>
              {count !== undefined && <span className="shrink-0 text-xs text-muted-foreground">({count})</span>}
            </Link>
          </li>
        ))}
      </ul>

      <span className="mt-4 block sm:text-end">
        <Link
          href="/blog/tags"
          className="inline-flex min-h-11 items-center rounded-sm font-mono text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          查看全部标签 →
        </Link>
      </span>
    </aside>
  )
}
