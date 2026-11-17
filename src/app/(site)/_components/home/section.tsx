import type { ReactNode } from 'react'

interface SectionProps {
  /** 模块标题 */
  title: string
  /** 可选右侧动作槽（如“全部文章 →”） */
  action?: ReactNode
  delayMs?: number
  children: ReactNode
}

/**
 * 首页内容区块容器。
 * 直接以衬线标题与底部发丝线建立章节秩序，去掉多余英文眉标与编号。
 */
export function Section({ title, action, delayMs = 180, children }: SectionProps) {
  return (
    <section className="entrance flex flex-col gap-y-4" style={{ animationDelay: `${delayMs}ms` }}>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-hair pb-3">
        <h2 className="font-serif text-xl font-medium tracking-tight text-foreground sm:text-2xl">{title}</h2>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="flex flex-col gap-y-3">{children}</div>
    </section>
  )
}
