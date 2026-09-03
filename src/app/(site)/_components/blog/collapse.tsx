import type { ReactNode } from 'react'

interface CollapseProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

/**
 * MDX 折叠手风琴面板组件（RSC）。
 * 基于原生 details/summary 标签实现，用于在正文中收折长输出、配置参数或补充资料。
 */
export function Collapse({ title, defaultOpen = false, children }: CollapseProps) {
  return (
    <details
      open={defaultOpen}
      className="group my-4 overflow-hidden rounded-xl border border-border bg-card/40 text-sm"
    >
      <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 font-medium text-foreground transition-colors hover:bg-muted/50">
        <span>{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-90"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </summary>
      <div className="border-t border-border px-4 py-3 text-muted-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </details>
  )
}
