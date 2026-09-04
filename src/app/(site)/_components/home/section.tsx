import type { ReactNode } from 'react'

interface SectionProps {
  /** 两位模块序号，如 01 */
  index: string
  /** 模块标题，如 最近写的、关于我 */
  title: string
  children: ReactNode
}

/**
 * 首页纵向 Section 容器。
 * 序号与标题组成上方 Label，内容在下方占满可用宽度。
 */
export function Section({ index, title, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-y-6">
      <h2 className="flex items-center gap-3 font-mono text-xs font-medium tracking-wider text-muted-foreground">
        <span className="text-primary">{index}</span>
        <span aria-hidden="true" className="text-border">
          /
        </span>
        <span>{title}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-border/60" />
      </h2>
      <div className="flex flex-col gap-y-4">{children}</div>
    </section>
  )
}
