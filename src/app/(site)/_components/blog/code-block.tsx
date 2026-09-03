import type { ComponentProps } from 'react'
import { CopyButton } from './copy-button'

/**
 * MDX 代码块外层容器组件（RSC）。
 * 针对 rehype-pretty-code 生成的 figure 进行样式包装，并在右上角集成悬浮复制按钮。
 */
export function CodeFigure({ children, className = '', ...props }: ComponentProps<'figure'>) {
  const isCodeFigure = 'data-rehype-pretty-code-figure' in props

  if (!isCodeFigure) {
    return (
      <figure className={className} {...props}>
        {children}
      </figure>
    )
  }

  return (
    <figure
      className={`group relative my-6 overflow-hidden rounded-xl border border-border bg-card/60 shadow-xs ${className}`}
      {...props}
    >
      {children}
      <CopyButton className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" />
    </figure>
  )
}

/**
 * 代码块标题栏组件（如 ```ts title="index.ts" 时生成）。
 */
export function CodeTitle({ children, className = '', ...props }: ComponentProps<'figcaption'>) {
  const isCodeTitle = 'data-rehype-pretty-code-title' in props

  if (!isCodeTitle) {
    return (
      <figcaption className={className} {...props}>
        {children}
      </figcaption>
    )
  }

  return (
    <figcaption
      className={`flex items-center border-b border-border bg-muted/40 px-4 py-2 font-mono text-xs text-muted-foreground ${className}`}
      {...props}
    >
      {children}
    </figcaption>
  )
}

/**
 * 代码块正文区域 pre 组件。
 */
export function CodePre({ children, className = '', ...props }: ComponentProps<'pre'>) {
  return (
    <pre
      className={`overflow-x-auto p-4 font-mono text-[13px] leading-relaxed subpixel-antialiased [tab-size:2] ${className}`}
      {...props}
    >
      {children}
    </pre>
  )
}
