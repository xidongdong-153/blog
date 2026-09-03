import type { ReactNode } from 'react'

interface LinkCardProps {
  href?: string | null
  heading: string
  subheading?: string
  period?: string
  children?: ReactNode
}

/**
 * 首页经历与开源项目卡片组件。
 * 提供悬浮边框高亮与阴影过渡。有 href 时渲染为外链，否则为静态卡片。
 */
export function LinkCard({ href, heading, subheading, period, children }: LinkCardProps) {
  const content = (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="text-base font-medium tracking-tight text-foreground">{heading}</h3>
        {period && <span className="text-xs text-muted-foreground">{period}</span>}
      </div>
      {subheading && <p className="text-sm text-muted-foreground">{subheading}</p>}
      {children}
    </div>
  )

  const cardClass =
    'block rounded-2xl border border-border bg-muted/30 px-5 py-3 transition-all hover:border-foreground/25 hover:shadow-sm'

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cardClass}>
        {content}
      </a>
    )
  }

  return <div className={cardClass}>{content}</div>
}
