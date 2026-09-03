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

function CustomTable({ children, ...props }: ComponentProps<'table'>) {
  return (
    <div className="my-6 w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm" {...props}>
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
