import type { ReactNode } from 'react'

/** 媒体、表格与通用块级注释的统一排版样式（字体跟随正文）。 */
export const FIGURE_CAPTION_CLASS = 'mt-2.5 max-w-[92%] text-center text-xs leading-relaxed text-muted-foreground'

interface FigureProps {
  /** 可选底部注释说明 */
  caption?: string
  children: ReactNode
  className?: string
}

/**
 * MDX 通用带注释容器组件（RSC）。
 * 可包裹表格、图表、多图等块级内容，在底部呈现一行与图注一致的小字说明。
 */
export function Figure({ caption, children, className = '' }: FigureProps) {
  const trimmedCaption = caption?.trim()

  return (
    <figure
      data-content-figure=""
      className={`my-7 flex w-full max-w-full flex-col items-center [&>[role=region]]:my-0 [&>*:first-child]:mt-0 ${className}`}
    >
      <div className="w-full [&>[role=region]]:my-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>
      {trimmedCaption && <figcaption className={FIGURE_CAPTION_CLASS}>{trimmedCaption}</figcaption>}
    </figure>
  )
}
