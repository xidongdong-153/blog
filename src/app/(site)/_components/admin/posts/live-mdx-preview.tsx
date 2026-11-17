'use client'

/* eslint-disable next/no-img-element */
import type { MDXRemoteSerializeResult } from 'next-mdx-remote'
import type { RefObject } from 'react'
import type { PostDocument } from '@/lib/posts'
import { MDXRemote } from 'next-mdx-remote'
import { useEffect, useState } from 'react'
import { BLOG_CATEGORY_LABELS, calculateReadingTime } from '@/lib/blog-meta'
import { formatDate } from '@/lib/date'
import { isMediaUrl } from '@/lib/posts'
import { REGISTERED_SERIES } from '@/lib/series'
import { sanitizeCssColor } from '@/lib/utils'
import { AiGeneratedLabel } from '../../blog/ai-generated-label'
import { mdxComponents, mdxProseClassName } from '../../blog/mdx-components'
import { AmbientBackdrop } from '../../site/ambient-backdrop'
import { renderMdxPreview } from './preview-action'

interface PreviewState {
  content: MDXRemoteSerializeResult | null
  renderedSource: string | null
  attemptedSource: string | null
  error: string
}

/** 文章级实时 MDX 预览，同步标题、摘要、元信息、专栏与 heroColor 顶光效果。 */
export function LiveMdxPreview({
  source,
  title,
  description,
  category,
  date,
  updatedDate,
  tags,
  heroImage,
  heroColor,
  aiGenerated,
  series,
  scrollRef,
  focusMode = false,
  onRendered,
}: {
  source: string
  title: string
  description: string
  category: PostDocument['category']
  date: string
  updatedDate?: string
  tags: string[]
  heroImage?: string
  heroColor?: string
  aiGenerated?: boolean
  series?: PostDocument['series']
  scrollRef?: RefObject<HTMLDivElement | null>
  focusMode?: boolean
  onRendered?: () => void
}) {
  const [preview, setPreview] = useState<PreviewState>({
    content: null,
    renderedSource: null,
    attemptedSource: null,
    error: '',
  })
  const [failedImageUrl, setFailedImageUrl] = useState('')
  const empty = !source.trim()
  const updating = !empty && preview.attemptedSource !== source
  const error = preview.attemptedSource === source ? preview.error : ''
  const stale = !empty && preview.renderedSource !== null && preview.renderedSource !== source
  const safeHeroColor = sanitizeCssColor(heroColor)
  const trimmedHeroImage = heroImage?.trim() ?? ''
  const showHeroImage = Boolean(trimmedHeroImage && isMediaUrl(trimmedHeroImage) && failedImageUrl !== trimmedHeroImage)
  const seriesInfo = series ? REGISTERED_SERIES[series.id] : null

  useEffect(() => {
    if (!source.trim()) return
    let active = true
    const timer = window.setTimeout(async () => {
      try {
        const result = await renderMdxPreview(source)
        if (!active) return
        setPreview((previous) =>
          result.error
            ? { ...previous, attemptedSource: source, error: result.error }
            : { content: result.content, renderedSource: source, attemptedSource: source, error: '' },
        )
        if (!result.error && onRendered) {
          window.requestAnimationFrame(() => onRendered())
        }
      } catch {
        if (active) {
          setPreview((previous) => ({
            ...previous,
            attemptedSource: source,
            error: '预览请求失败，请检查网络后继续编辑',
          }))
        }
      }
    }, 350)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [source, onRendered])

  const readingTime = calculateReadingTime(source)
  const statusText = empty
    ? '等待正文'
    : stale
      ? updating
        ? '上次成功预览 · 更新中…'
        : '上次成功预览 · 已过期'
      : updating
        ? '更新中…'
        : '已同步'

  return (
    <section
      aria-label="MDX 实时预览"
      className="relative isolate flex min-w-0 flex-col overflow-hidden rounded-xl border border-hair bg-background/70"
    >
      <AmbientBackdrop color={safeHeroColor ?? undefined} className="!h-52 !-z-10 !opacity-35 dark:!opacity-45" />

      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-hair bg-muted/35 px-4 py-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">实时预览</span>
          {safeHeroColor && (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full border border-hair"
                style={{ backgroundColor: safeHeroColor }}
              />
              {safeHeroColor}
            </span>
          )}
        </div>
        <span role="status" className="font-mono text-xs">
          {statusText}
        </span>
      </div>

      {error && (
        <p
          role="alert"
          className="m-4 whitespace-pre-wrap break-words rounded-lg border border-destructive/35 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div
        ref={scrollRef}
        className={`overflow-auto overscroll-contain p-5 transition-[height] duration-200 sm:p-6 [overflow-wrap:anywhere] ${
          focusMode ? 'h-[max(460px,calc(100dvh-16rem))]' : 'h-[max(460px,calc(100dvh-23rem))]'
        }`}
        aria-busy={updating}
      >
        <header className="mb-7 flex flex-col items-start gap-3 border-b border-hair pb-6 text-left">
          {trimmedHeroImage && isMediaUrl(trimmedHeroImage) && (
            <div className="relative mb-2 w-full overflow-hidden rounded-xl border border-hair bg-muted/30">
              {showHeroImage ? (
                <img
                  src={trimmedHeroImage}
                  alt={title || '文章封面预览'}
                  className="aspect-video w-full object-cover"
                  onError={() => setFailedImageUrl(trimmedHeroImage)}
                />
              ) : (
                <div className="flex items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground">
                  <span>封面图片暂不可加载</span>
                  <button
                    type="button"
                    onClick={() => setFailedImageUrl('')}
                    className="cursor-pointer font-mono text-primary underline-offset-4 hover:underline"
                  >
                    重试
                  </button>
                </div>
              )}
            </div>
          )}

          {seriesInfo && series && (
            <span className="font-mono text-xs text-primary">
              专栏：{seriesInfo.title} · 第 {series.order} 讲
            </span>
          )}

          <h2 className="font-serif text-2xl font-medium leading-[1.28] tracking-tight text-foreground sm:text-3xl">
            {title.trim() || '未命名文章'}
          </h2>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground">
            {date && <time dateTime={date}>{formatDate(date)}</time>}
            {updatedDate && (
              <>
                <span aria-hidden="true">·</span>
                <span>(已编辑 {formatDate(updatedDate)})</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{BLOG_CATEGORY_LABELS[category]}</span>
            {tags.length > 0 && (
              <>
                <span aria-hidden="true">/</span>
                <span>{tags.slice(0, 4).join(', ')}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{readingTime}</span>
            {aiGenerated && (
              <>
                <span aria-hidden="true">·</span>
                <AiGeneratedLabel aiGenerated />
              </>
            )}
          </div>

          {description.trim() && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </header>

        {empty ? (
          <p className="py-10 text-center text-sm text-muted-foreground">输入正文后在此呈现完整文章排版</p>
        ) : preview.content ? (
          <div className={`${mdxProseClassName} relative [contain:layout]`}>
            <MDXRemote {...preview.content} components={mdxComponents} />
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {updating ? '正在渲染…' : '修正正文语法后继续预览'}
          </p>
        )}
      </div>
    </section>
  )
}
