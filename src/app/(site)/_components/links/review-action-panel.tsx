'use client'

import Link from 'next/link'
import { useState } from 'react'

interface ReviewActionPanelProps {
  token: string
  initialAction?: string
  siteName: string
}

export function ReviewActionPanel({ token, initialAction, siteName }: ReviewActionPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ success: boolean; message: string; action: 'approve' | 'reject' } | null>(null)

  const isPreSelectedApprove = initialAction !== 'reject'

  const handleAction = async (action: 'approve' | 'reject') => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/links/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, action }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || '操作失败，请重试')
      }

      setResult({
        success: true,
        message: data.message,
        action,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络异常，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-border/80 bg-card/60 p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            ✓
          </span>
          <h3 className="font-serif text-lg font-medium text-foreground">处理完成</h3>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{result.message}</p>
        <div className="mt-2 flex items-center gap-4">
          <Link
            href="/links"
            className="inline-flex items-center gap-1 rounded-md bg-foreground px-4 py-2 font-mono text-xs font-medium text-background transition-colors hover:bg-foreground/85"
          >
            前往友链页查看 ↗
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md border border-border/70 px-4 py-2 font-mono text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border/80 bg-card/60 p-6">
      <div className="flex flex-col gap-1">
        <div className="font-mono text-xs tracking-wider text-muted-foreground">// 审批确认</div>
        <div className="text-sm text-foreground">
          你正在审核来自「<span className="font-medium">{siteName}</span>」的友链互换申请。
        </div>
        <div className="text-xs text-muted-foreground">
          {isPreSelectedApprove
            ? '邮件预选操作：通过并上线展示。点击下方按钮后将正式生效。'
            : '邮件预选操作：婉拒申请。点击下方按钮将标记为婉拒。'}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleAction('approve')}
          className={`inline-flex items-center justify-center rounded-md px-4 py-2.5 font-mono text-xs font-semibold transition-all disabled:opacity-50 ${
            isPreSelectedApprove
              ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
              : 'border border-border/80 bg-card hover:bg-muted/50 text-foreground'
          }`}
        >
          {loading ? '处理中...' : '确认通过并上线'}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleAction('reject')}
          className={`inline-flex items-center justify-center rounded-md px-4 py-2.5 font-mono text-xs font-medium transition-all disabled:opacity-50 ${
            !isPreSelectedApprove
              ? 'border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20'
              : 'border border-border/80 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          {loading ? '处理中...' : '婉拒此申请'}
        </button>
      </div>
    </div>
  )
}
