'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { formatDate } from '@/lib/date'

interface DeletePreview {
  id: number
  articleTitle: string
  articleSlug: string
  authorName: string
  contentSnippet: string
  createdAt: string
}

function CommentDeleteContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<DeletePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('缺少删除凭证 token')
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    fetch(`/api/comments/delete?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json()
        if (!isMounted) return
        if (json.success && json.data) {
          setPreview(json.data)
        } else {
          setError(json.error || '凭证无效或已过期')
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : '网络请求失败')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [token])

  const handleConfirmDelete = async () => {
    if (!token || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/comments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()
      if (json.success) {
        setSuccess(true)
      } else {
        setError(json.error || '删除失败，凭证可能已失效')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交删除失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      {/* 头部标题区 */}
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <div className="font-mono text-xs tracking-wider text-muted-foreground">// 评论管理 · 删除确认</div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">确认删除评论</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          此操作来自站长邮件的一键管理链接。确认后将软删除评论并立即使该凭证失效。
        </p>
      </div>

      {/* 状态反馈与内容卡片 */}
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border/60 bg-card/30 p-12 text-center text-muted-foreground"
        >
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="font-mono text-xs">正在校验凭证并读取评论摘要...</span>
        </div>
      ) : success ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-4 rounded-lg border border-green-500/30 bg-green-500/5 p-6"
        >
          <div className="flex items-center gap-2 font-mono text-xs text-green-600 dark:text-green-400">
            <span>✓</span>
            <span>操作成功</span>
          </div>
          <p className="text-sm text-foreground">该评论已被成功软删除，该一次性凭证已销毁。</p>
          {preview?.articleSlug && (
            <div className="pt-2">
              <Link
                href={`/blog/${preview.articleSlug}`}
                className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
              >
                <span>返回文章《{preview.articleTitle}》</span>
                <span>↗</span>
              </Link>
            </div>
          )}
        </div>
      ) : error ? (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col gap-4 rounded-lg border border-red-500/30 bg-red-500/5 p-6"
        >
          <div className="flex items-center gap-2 font-mono text-xs text-red-600 dark:text-red-400">
            <span>✕</span>
            <span>凭证校验失败</span>
          </div>
          <p className="text-sm text-foreground">{error}</p>
          <div className="pt-2">
            <Link href="/" className="font-mono text-xs text-muted-foreground hover:text-foreground">
              ← 返回博客首页
            </Link>
          </div>
        </div>
      ) : preview ? (
        <div className="flex flex-col gap-6 rounded-lg border border-border/60 bg-card/30 p-6">
          <div className="flex flex-col gap-3 border-b border-border/40 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground">// 所属文章</span>
              <span className="font-mono text-xs text-muted-foreground">{formatDate(preview.createdAt)}</span>
            </div>
            <Link
              href={`/blog/${preview.articleSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-serif text-lg font-medium text-foreground hover:underline"
            >
              {preview.articleTitle} ↗
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span>// 评论作者:</span>
              <span className="font-medium text-foreground">{preview.authorName}</span>
            </div>
            <div className="rounded-md border border-border/40 bg-background/50 p-4 font-sans text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {preview.contentSnippet}
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-2">
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
              提示：点击下方按钮后将立即执行软删除。被删评论的正文将被清空，但其已有的回复关系将被保留以维护讨论完整性。
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 font-mono text-xs font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
              >
                {submitting ? '正在删除...' : '确认软删除 ✕'}
              </button>

              <Link
                href={`/blog/${preview.articleSlug}`}
                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                取消并返回文章
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** 评论删除确认页：GET 只读取预览，用户确认后 POST 执行软删除。 */
export default function CommentDeletePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-12 text-center text-muted-foreground">
          <span className="font-mono text-xs">加载页面中...</span>
        </div>
      }
    >
      <CommentDeleteContent />
    </Suspense>
  )
}
