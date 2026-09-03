import { compileMDX } from 'next-mdx-remote/rsc'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'

/**
 * MDX 渲染组件（异步 RSC）。
 * rehype-slug 给标题生成锚点 id，目录（TOC）的链接依赖这些 id。
 */
export async function MdxContent({ source }: { source: string }) {
  const { content } = await compileMDX({
    source,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug],
      },
    },
  })

  return <div className="prose text-base text-muted-foreground max-w-none">{content}</div>
}
