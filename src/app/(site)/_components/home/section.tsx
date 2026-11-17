import type { ReactNode } from 'react'

interface SectionProps {
  /** 英文眉标，如 RECENT */
  eyebrow?: string
  /** 两位序号（用于交错入场延时计算） */
  index?: string
  /** 模块标题 */
  title: string
  align?: 'left' | 'right'
  /** 可选右侧动作槽（如“全部 →”） */
  action?: ReactNode
  children: ReactNode
}

/**
 * 首页内容区块容器。
 * 保持克制的眉标 + 衬线标题层级，支持可选右侧操作槽。
 */
export function Section({ eyebrow, index, title, align = 'left', action, children }: SectionProps) {
  const isRight = align === 'right'
  const delay = Math.min(Math.max(Number(index) || 0, 0) * 60 + 180, 360)

  return (
    <section className="entrance flex flex-col gap-y-4" style={{ animationDelay: `${delay}ms` }}>
      <header
        className={`flex flex-wrap items-end justify-between gap-2 border-b border-hair pb-3 ${
          isRight ? 'sm:flex-row-reverse sm:text-right' : ''
        }`}
      >
        <div className="flex flex-col gap-0.5">
          {eyebrow && (
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{eyebrow}</span>
          )}
          <h2 className="font-serif text-xl font-medium tracking-tight text-foreground sm:text-2xl">{title}</h2>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="flex flex-col gap-y-3">{children}</div>
    </section>
  )
}
