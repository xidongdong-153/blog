import { compileMDX } from 'next-mdx-remote/rsc'
import { postMdxOptions } from '@/server/modules/posts/mdx-options'
import { mdxComponents, mdxProseClassName } from './mdx-components'

export async function MdxContent({ source }: { source: string }) {
  const { content } = await compileMDX({
    source,
    options: { parseFrontmatter: false, mdxOptions: postMdxOptions },
    components: mdxComponents,
  })
  return <div className={mdxProseClassName}>{content}</div>
}
