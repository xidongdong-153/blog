import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { MdxContent } from '@/app/(site)/_components/blog/mdx-content'
import { TableOfContents } from '@/app/(site)/_components/blog/toc'
import { BLOG_CATEGORY_LABELS, calculateReadingTime, extractHeadings, formatDate } from '@/lib/content'
import { requirePostAdmin } from '@/server/modules/posts/posts-admin'
import { validatePostCompilation } from '@/server/modules/posts/posts-compile'
import { getManagedPost, PostServiceError } from '@/server/modules/posts/posts.service'

export const metadata: Metadata = { title: '工作稿预览' }

export default async function PreviewPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ revision?: string }>
}) {
  await requirePostAdmin()
  const { id } = await params
  const { revision } = await searchParams
  let post
  try {
    post = await getManagedPost(id)
  } catch (error) {
    if (error instanceof PostServiceError && error.statusCode === 404) notFound()
    throw error
  }
  const doc = post.document
  let error = ''
  if (revision && Number(revision) !== post.revision) error = '工作稿版本已变化，请返回编辑器保存并刷新预览。'
  if (!error) {
    try {
      await validatePostCompilation(doc.content)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '正文无法渲染'
    }
  }
  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-medium">无法预览</h1>
        <pre
          role="alert"
          className="mt-4 whitespace-pre-wrap break-words rounded-md border border-border p-4 text-sm text-red-700 dark:text-red-400"
        >
          {error}
        </pre>
      </div>
    )
  }
  const headings = extractHeadings(doc.content)
  return (
    <div className="mx-auto w-full max-w-5xl">
      {doc.heroColor && <style>{`:root { --page-highlight: ${doc.heroColor} }`}</style>}
      <p className="mb-6 border-b border-border pb-3 text-xs text-muted-foreground">
        工作稿预览 · 版本 {post.revision}
      </p>
      <div className="gap-10 lg:flex lg:items-start">
        <article id="content" className="min-w-0 flex-1 break-words">
          {doc.heroImage && (
            <div className="relative mb-6 aspect-video overflow-hidden rounded-lg">
              <Image src={doc.heroImage} alt={doc.title} fill unoptimized className="object-cover" />
            </div>
          )}
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{BLOG_CATEGORY_LABELS[doc.category]}</span>
            <time dateTime={doc.date}>{formatDate(doc.date)}</time>
            <span>{calculateReadingTime(doc.content)}</span>
            {doc.aiGenerated && <span>AI 生成</span>}
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">{doc.title || '未命名文章'}</h1>
          {doc.description && <p className="mt-3 leading-relaxed text-muted-foreground">{doc.description}</p>}
          <div className="mt-8">
            <MdxContent source={doc.content} />
          </div>
        </article>
        {headings.length > 0 && (
          <aside className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-56 shrink-0 overflow-y-auto lg:block">
            <TableOfContents headings={headings} />
          </aside>
        )}
      </div>
    </div>
  )
}
