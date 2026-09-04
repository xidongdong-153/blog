import type { ComponentProps } from 'react'
import { CopyButton } from './copy-button'

/**
 * MDX 代码块外层容器组件（RSC）。
 * 针对 rehype-pretty-code 生成的 figure 进行样式包装，并在右上角集成常驻复制按钮。
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
      className={`relative my-7 overflow-hidden rounded-lg border border-border/60 bg-code-bg text-code-fg ${className}`}
      {...props}
    >
      {children}
      <CopyButton className="absolute right-2 top-2" />
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
      className={`flex min-h-10 min-w-0 items-center border-b border-border/50 px-4 pr-12 font-mono text-xs leading-none text-muted-foreground ${className}`}
      {...props}
    >
      <span aria-hidden="true" className="mr-2 text-muted-foreground/50">
        //
      </span>
      <span className="truncate">{children}</span>
    </figcaption>
  )
}

/**
 * 代码块正文区域 pre 组件。
 */
export function CodePre({ children, className = '', ...props }: ComponentProps<'pre'>) {
  return (
    <pre
      className={`overflow-x-auto p-4 pb-7 pr-14 font-mono text-sm leading-relaxed subpixel-antialiased [tab-size:2] ${className}`}
      {...props}
    >
      {children}
    </pre>
  )
}
