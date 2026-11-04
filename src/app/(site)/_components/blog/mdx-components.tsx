import type { ComponentProps } from 'react'
import Link from 'next/link'
import { Callout } from './callout'
import { CodeFigure, CodePre, CodeTitle } from './code-block'
import { Collapse } from './collapse'
import { ImageZoom } from './image-zoom'
import { Video } from './video'

function CustomAnchor({ href = '', children, ...props }: ComponentProps<'a'>) {
  if (href.startsWith('/') || href.startsWith('#')) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <a {...props} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

function CustomTable({ children, className = '', ...props }: ComponentProps<'table'>) {
  return (
    <div
      role="region"
      aria-label="文章数据表格"
      tabIndex={0}
      className="my-7 w-full overflow-x-auto overscroll-x-contain rounded-lg border border-border/60 bg-card/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <table
        className={`w-full min-w-[40rem] table-auto border-collapse text-sm [&_tbody_tr]:border-b [&_tbody_tr]:border-border/50 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/20 [&_tbody_tr:last-child]:border-b-0 [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_th]:whitespace-nowrap [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-foreground [&_thead]:border-b [&_thead]:border-border/70 [&_thead]:bg-muted/35 ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

export const mdxProseClassName = 'prose text-base text-muted-foreground max-w-none'

export const mdxComponents = {
  figure: CodeFigure,
  figcaption: CodeTitle,
  pre: CodePre,
  a: CustomAnchor,
  table: CustomTable,
  img: ImageZoom,
  video: Video,
  Video,
  Callout,
  Collapse,
}
