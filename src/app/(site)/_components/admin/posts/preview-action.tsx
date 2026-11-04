'use server'

import type { MDXRemoteSerializeResult } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import { headers } from 'next/headers'
import { MAX_POST_BYTES } from '@/lib/posts'
import { getSession, isSiteAdmin } from '@/server/modules/auth/auth.service'
import { postMdxOptions } from '@/server/modules/posts/mdx-options'

export async function renderMdxPreview(
  source: string,
): Promise<{ content: MDXRemoteSerializeResult | null; error: string }> {
  const session = await getSession(await headers())
  if (!session?.user?.id) return { content: null, error: '请先登录后预览' }
  if (!isSiteAdmin(session.user)) return { content: null, error: '仅站长可预览文章' }
  if (typeof source !== 'string') return { content: null, error: '正文格式无效' }
  if (new TextEncoder().encode(source).length > MAX_POST_BYTES) return { content: null, error: '正文不能超过 1 MiB' }
  if (!source.trim()) return { content: null, error: '' }

  try {
    return {
      content: await serialize(source, { parseFrontmatter: false, mdxOptions: postMdxOptions }),
      error: '',
    }
  } catch (cause) {
    return {
      content: null,
      error: cause instanceof Error ? cause.message.slice(0, 600) : 'MDX 预览失败，请检查正文语法',
    }
  }
}
