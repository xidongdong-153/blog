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
    <aside id="sidebar" className={`flex flex-col ${className}`}>
      <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-2">
        <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          // TAGS
        </span>
      </div>

      <ul className="flex flex-wrap gap-2 text-xs font-mono">
        {tags.map(({ tag, count }) => (
          <li key={tag}>
            <Link
              href={`/blog/tags/${tag}`}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 px-2.5 py-1 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <span>#{tag}</span>
              {count !== undefined && <span className="text-[0.65rem] text-muted-foreground/70">({count})</span>}
            </Link>
          </li>
        ))}
      </ul>

      <span className="mt-4 block sm:text-end">
        <Link
          href="/blog/tags"
          className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground hover:underline"
        >
          // VIEW ALL TAGS →
        </Link>
      </span>
    </aside>
  )
}
