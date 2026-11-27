import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AiGeneratedLabel } from '@/app/(site)/_components/blog/ai-generated-label'
import { MdxContent } from '@/app/(site)/_components/blog/mdx-content'
import { TableOfContents } from '@/app/(site)/_components/blog/toc'
import { PaperSurface } from '@/app/(site)/_components/site/paper-surface'
import { BLOG_CATEGORY_LABELS, calculateReadingTime, extractHeadings, formatDate } from '@/lib/content'
import { sanitizeCssColor } from '@/lib/utils'
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="font-serif text-2xl font-medium">无法预览</h1>
          <Link
            href={`/admin/posts/${post.id}/edit`}
            className="font-mono text-xs text-primary underline-offset-4 hover:underline"
          >
            ← 返回编辑器
          </Link>
        </div>
        <pre
          role="alert"
          className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </pre>
      </div>
    )
  }
  const headings = extractHeadings(doc.content)
  const safeHeroColor = sanitizeCssColor(doc.heroColor)

  return (
    <div className="mx-auto w-full max-w-5xl">
      {safeHeroColor && <style>{`:root { --page-highlight: ${safeHeroColor} }`}</style>}
      <div className="relative isolate mb-8 flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-xl px-4 py-2.5 text-xs">
        <PaperSurface />
        <div className="flex flex-wrap items-center gap-2 font-mono text-muted-foreground tabular-nums">
          <span className="font-medium text-foreground">工作稿预览</span>
          <span aria-hidden="true">·</span>
          <span>r{post.revision}</span>
          <span aria-hidden="true">·</span>
          <span>{post.published ? '已发布（预览当前工作稿）' : '草稿'}</span>
        </div>
        <Link
          href={`/admin/posts/${post.id}/edit`}
          className="inline-flex min-h-8 items-center gap-1 font-mono text-xs text-primary underline-offset-4 hover:underline"
        >
          <span>← 返回编辑器</span>
        </Link>
      </div>

      <div className="gap-12 lg:flex lg:items-start">
        <article id="content" className="min-w-0 flex-1 break-words">
          <header className="flex flex-col items-start gap-3.5 border-b border-hair pb-7 text-left">
            {doc.heroImage && (
              <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-xl border border-hair">
                <Image src={doc.heroImage} alt={doc.title} fill unoptimized className="object-cover" />
              </div>
            )}

            <h1 className="max-w-3xl text-balance font-serif text-3xl font-medium leading-[1.24] tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem]">
              {doc.title || '未命名文章'}
            </h1>

            <div className="flex flex-wrap items-center justify-start gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground">
              <time dateTime={doc.date}>{formatDate(doc.date)}</time>
              {doc.updatedDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>(已编辑 {formatDate(doc.updatedDate)})</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{BLOG_CATEGORY_LABELS[doc.category]}</span>
              {doc.tags.length > 0 && (
                <>
                  <span aria-hidden="true">/</span>
                  <span>{doc.tags.slice(0, 4).join(', ')}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{calculateReadingTime(doc.content)}</span>
              {doc.aiGenerated && (
                <>
                  <span aria-hidden="true">·</span>
                  <AiGeneratedLabel aiGenerated={doc.aiGenerated} />
                </>
              )}
            </div>

            {doc.description && (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{doc.description}</p>
            )}
          </header>

          <div className="mt-10">
            <MdxContent source={doc.content} />
          </div>
        </article>

        {headings.length > 0 && (
          <aside className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-56 shrink-0 flex-col lg:flex">
            <TableOfContents headings={headings} />
          </aside>
        )}
      </div>
    </div>
  )
}
