import Link from 'next/link'

export interface ButtonProps {
  title?: string
  href?: string
  style?: 'button' | 'pill' | 'back' | 'ahead'
  className?: string
  children?: React.ReactNode
}

/**
 * 通用按钮与胶囊标签组件，复刻 Joye Button 样式体系。
 * 支持普通按钮、胶囊标签（pill）、返回按钮（back）与前进按钮（ahead）。
 * back 与 ahead 带有动态伸缩展开的 SVG 箭头动效。
 */
export function Button({ title, href, style = 'button', className = '', children }: ButtonProps) {
  const isBack = style === 'back'
  const isAhead = style === 'ahead'

  const baseClasses = [
    'group inline-flex items-center gap-x-1.5 border border-border/60 bg-muted/30 px-2.5 py-1 font-mono text-xs text-muted-foreground transition-all hover:border-foreground/30 hover:bg-muted/60 hover:text-foreground no-underline select-none rounded-md',
    !href ? 'cursor-default' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {isBack && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-muted-foreground transition-colors group-hover:stroke-primary"
        >
          <line
            x1="19"
            y1="12"
            x2="5"
            y2="12"
            className="translate-x-3 scale-x-0 transition-all duration-300 ease-in-out group-hover:translate-x-0 group-hover:scale-x-100"
          />
          <polyline
            points="12 19 5 12 12 5"
            className="translate-x-1 transition-all duration-300 ease-in-out group-hover:translate-x-0"
          />
        </svg>
      )}
      {children ?? (title && <span className="my-0">{title}</span>)}
      {isAhead && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-muted-foreground transition-colors group-hover:stroke-primary"
        >
          <line
            x1="5"
            y1="12"
            x2="19"
            y2="12"
            className="translate-x-4 scale-x-0 transition-all duration-300 ease-in-out group-hover:translate-x-1 group-hover:scale-x-100"
          />
          <polyline
            points="12 5 19 12 12 19"
            className="translate-x-0 transition-all duration-300 ease-in-out group-hover:translate-x-1"
          />
        </svg>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    )
  }

  return <span className={baseClasses}>{content}</span>
}
