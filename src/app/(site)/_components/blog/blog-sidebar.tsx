import Link from 'next/link'
import { Button } from './button'

export interface BlogSidebarProps {
  tags: Array<{ tag: string; count?: number }>
  className?: string
}

/**
 * 博客列表页右侧边栏组件，复刻 Joye 标签侧边栏结构。
 * 包含标签小图标、Tags 标题、Pill 标签云与查看全部标签入口。
 */
export function BlogSidebar({ tags, className = '' }: BlogSidebarProps) {
  if (tags.length === 0) return null

  return (
    <aside id="sidebar" className={`flex flex-col ${className}`}>
      <h2 className="mb-4 flex items-center text-lg font-semibold text-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="me-2 text-muted-foreground"
        >
          <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
          <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
        </svg>
        Tags
      </h2>

      <ul className="flex flex-wrap gap-2">
        {tags.map(({ tag }) => (
          <li key={tag}>
            <Button title={tag} href={`/blog/tags/${tag}`} style="pill" />
          </li>
        ))}
      </ul>

      <span className="mt-4 block sm:text-end">
        <Link
          href="/blog/tags"
          className="text-sm text-muted-foreground transition-colors hover:text-primary hover:underline"
        >
          View all →
        </Link>
      </span>
    </aside>
  )
}
