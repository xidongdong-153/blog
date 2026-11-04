import { serialize } from 'next-mdx-remote/serialize'
import { postMdxOptions } from './mdx-options'
import { validatePostMdx } from './posts-mdx'

export async function validatePostCompilation(source: string): Promise<void> {
  await validatePostMdx(source)
  await serialize(source, { parseFrontmatter: false, mdxOptions: postMdxOptions })
}
