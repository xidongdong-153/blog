import Link from 'next/link'
import { PaperSurface } from '../site/paper-surface'

export interface BlogSidebarProps {
  tags: Array<{ tag: string; count?: number }>
  className?: string
}

/**
 * 博客列表页右侧标签纸卡。
 */
export function BlogSidebar({ tags, className = '' }: BlogSidebarProps) {
  if (tags.length === 0) return null

  return (
    <aside id="sidebar" className={`flex min-w-0 flex-col ${className}`}>
      <div className="relative isolate rounded-lg p-5">
        <PaperSurface className="bg-card/90" />
        <div className="mb-3.5 flex items-center justify-between border-b border-hair pb-2.5">
          <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">Tags</h2>
          <Link
            href="/blog/tags"
            className="text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            全部标签 →
          </Link>
        </div>

        <ul className="flex flex-wrap gap-2 text-xs">
          {tags.slice(0, 18).map(({ tag, count }) => (
            <li key={tag} className="min-w-0 max-w-full">
              <Link
                href={`/blog/tags/${encodeURIComponent(tag)}`}
                className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-md border border-hair bg-background/60 px-2.5 py-1 break-words text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="min-w-0 [overflow-wrap:anywhere]">{tag}</span>
                {count !== undefined && (
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground/70">
                    ({count})
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
