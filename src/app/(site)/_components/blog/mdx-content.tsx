import type { ComponentProps } from 'react'
import type { Options as PrettyCodeOptions } from 'rehype-pretty-code'
import { compileMDX } from 'next-mdx-remote/rsc'
import Link from 'next/link'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeKatex from 'rehype-katex'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'
import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { Callout } from './callout'
import { CodeFigure, CodePre, CodeTitle } from './code-block'
import { Collapse } from './collapse'
import { ImageZoom } from './image-zoom'
import { Video } from './video'

const prettyCodeOptions: PrettyCodeOptions = {
  theme: {
    light: 'catppuccin-latte',
    dark: 'catppuccin-mocha',
  },
  keepBackground: false,
}

function CustomAnchor({ href = '', children, ...props }: ComponentProps<'a'>) {
  const isInternal = href.startsWith('/') || href.startsWith('#')
  if (isInternal) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
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

/**
 * MDX 渲染组件（异步 RSC）。
 * 编译管道集成：
 * - remarkGfm: 表格、任务列表、删除线
 * - remarkMath + rehypeKatex: LaTeX 数学公式排版
 * - remarkCjkFriendly: 修复中文紧贴全角标点的加粗排版
 * - rehypeSlug: 生成标准语义 id
 * - rehypeAutolinkHeadings: 为正文标题追加悬停直达 # 锚点
 * - rehypeExternalLinks: 外部链接新窗口安全打开
 * - rehypePrettyCode: 基于 Shiki 的双主题代码块高亮与装饰
 * 自定义组件映射：
 * - a: 站内路由 Link 优化与外部链接安全化
 * - table: 响应式横向滚动包装
 * - img: 支持点击全屏灯箱放大 (ImageZoom)
 * - Callout: 语义提示卡片
 * - Collapse: 手风琴折叠面板
 */
export async function MdxContent({ source }: { source: string }) {
  const { content } = await compileMDX({
    source,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath, remarkCjkFriendly],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: 'append',
              properties: {
                className: ['subheading-anchor'],
                ariaLabel: '链接至此段落',
              },
              content: {
                type: 'text',
                value: '#',
              },
            },
          ],
          [rehypeKatex, {}],
          [
            rehypeExternalLinks,
            {
              target: '_blank',
              rel: ['noopener', 'noreferrer'],
            },
          ],
          [rehypePrettyCode, prettyCodeOptions],
        ],
      },
    },
    components: {
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
    },
  })

  return <div className="prose text-base text-muted-foreground max-w-none">{content}</div>
}
