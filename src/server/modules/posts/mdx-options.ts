import type { serialize } from 'next-mdx-remote/serialize'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeKatex from 'rehype-katex'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'
import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { rehypeImageFigure, remarkBlockquoteAttribution, remarkGfmAlerts } from './mdx-plugins'
import { remarkSafeMdx } from './posts-mdx'

export const postMdxOptions: NonNullable<NonNullable<Parameters<typeof serialize>[1]>['mdxOptions']> = {
  remarkPlugins: [
    remarkGfm,
    remarkMath,
    remarkCjkFriendly,
    remarkSafeMdx,
    remarkGfmAlerts,
    remarkBlockquoteAttribution,
  ],
  remarkRehypeOptions: {
    footnoteLabel: '脚注',
    footnoteBackLabel: '返回正文',
  },
  rehypePlugins: [
    rehypeSlug,
    [
      rehypeAutolinkHeadings,
      {
        behavior: 'append',
        properties: { className: ['subheading-anchor'], ariaLabel: '链接至此段落' },
        content: { type: 'text', value: '#' },
      },
    ],
    [rehypeKatex, {}],
    [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
    [rehypePrettyCode, { theme: { light: 'catppuccin-latte', dark: 'catppuccin-mocha' }, keepBackground: false }],
    rehypeImageFigure,
  ],
}
