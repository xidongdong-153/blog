'use client'

import type { MDXRemoteSerializeResult } from 'next-mdx-remote'
import { MDXRemote } from 'next-mdx-remote'
import { useEffect, useState } from 'react'
import { mdxComponents, mdxProseClassName } from '../../blog/mdx-components'
import { renderMdxPreview } from './preview-action'

interface PreviewState {
  content: MDXRemoteSerializeResult | null
  renderedSource: string | null
  attemptedSource: string | null
  error: string
}

export function LiveMdxPreview({ source }: { source: string }) {
  const [preview, setPreview] = useState<PreviewState>({
    content: null,
    renderedSource: null,
    attemptedSource: null,
    error: '',
  })
  const empty = !source.trim()
  const updating = !empty && preview.attemptedSource !== source
  const error = preview.attemptedSource === source ? preview.error : ''
  const stale = !empty && preview.renderedSource !== null && preview.renderedSource !== source

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
  }, [source])

  return (
    <section aria-label="MDX 实时预览" className="min-w-0 overflow-hidden rounded-lg border border-border">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border px-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">实时预览</span>
        <span role="status">
          {empty
            ? ''
            : stale
              ? updating
                ? '上次成功预览 · 更新中…'
                : '上次成功预览 · 已过期'
              : updating
                ? '更新中…'
                : ''}
        </span>
      </div>
      {error && (
        <p
          role="alert"
          className="m-4 whitespace-pre-wrap break-words rounded-md border border-red-600/40 bg-red-600/5 p-3 text-sm text-red-700 dark:text-red-400"
        >
          {error}
        </p>
      )}
      <div
        className="max-h-[75vh] min-h-[560px] overflow-auto overscroll-contain p-5 [overflow-wrap:anywhere]"
        aria-busy={updating}
      >
        {empty ? (
          <p className="py-8 text-center text-sm text-muted-foreground">输入正文后显示预览</p>
        ) : preview.content ? (
          <div className={mdxProseClassName}>
            <MDXRemote {...preview.content} components={mdxComponents} />
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {updating ? '正在渲染…' : '修正正文后继续预览'}
          </p>
        )}
      </div>
    </section>
  )
}
