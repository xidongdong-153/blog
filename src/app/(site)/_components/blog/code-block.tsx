import type { ComponentProps } from 'react'
import { CopyButton } from './copy-button'
import { FIGURE_CAPTION_CLASS } from './figure'

/**
 * MDX figure 外层容器组件（RSC）。
 * 分别处理 rehype-pretty-code 代码块与独占行图片 figure。
 */
export function CodeFigure({ children, className = '', ...props }: ComponentProps<'figure'>) {
  if ('data-rehype-pretty-code-figure' in props) {
    return (
      <figure
        className={`relative my-7 overflow-hidden rounded-xl border border-hair bg-code-bg/95 text-code-fg ${className}`}
        {...props}
      >
        {children}
        <CopyButton className="absolute right-2.5 top-2" />
      </figure>
    )
  }

  if ('data-image-figure' in props) {
    return (
      <figure className={`my-7 flex flex-col items-center ${className}`} {...props}>
        {children}
      </figure>
    )
  }

  return (
    <figure className={className} {...props}>
      {children}
    </figure>
  )
}

/**
 * MDX figcaption 组件（RSC）。
 * 分别处理代码块顶部文件名、代码块底部注释与图片/通用注释。
 */
export function CodeTitle({ children, className = '', ...props }: ComponentProps<'figcaption'>) {
  if ('data-rehype-pretty-code-title' in props) {
    return (
      <figcaption
        className={`flex min-h-10 min-w-0 items-center border-b border-hair px-4 pr-12 font-mono text-xs leading-none text-muted-foreground ${className}`}
        {...props}
      >
        <span aria-hidden="true" className="mr-2 size-1.5 rounded-full bg-primary/55" />
        <span className="truncate">{children}</span>
      </figcaption>
    )
  }

  if ('data-rehype-pretty-code-caption' in props) {
    return (
      <figcaption
        className={`border-t border-hair bg-muted/20 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground ${className}`}
        {...props}
      >
        {children}
      </figcaption>
    )
  }

  if ('data-image-caption' in props) {
    return (
      <figcaption className={`${FIGURE_CAPTION_CLASS} ${className}`} {...props}>
        {children}
      </figcaption>
    )
  }

  return (
    <figcaption className={`${FIGURE_CAPTION_CLASS} ${className}`} {...props}>
      {children}
    </figcaption>
  )
}

/**
 * 代码块正文区域 pre 组件。
 * 保持 relative 定位以确保右下角语言标识始终贴合 pre，不与底部 caption 重叠。
 */
export function CodePre({ children, className = '', ...props }: ComponentProps<'pre'>) {
  return (
    <pre
      className={`relative overflow-x-auto p-4 pb-7 pr-14 font-mono text-sm leading-relaxed subpixel-antialiased [tab-size:2] ${className}`}
      {...props}
    >
      {children}
    </pre>
  )
}
