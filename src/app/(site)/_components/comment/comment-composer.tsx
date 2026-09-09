'use client'

import { useEffect, useRef, useState } from 'react'

interface CommentComposerProps {
  slug: string
  replyToId?: number | null
  replyToAuthorName?: string
  onSuccess: () => void
  onCancel?: () => void
  autoFocus?: boolean
  placeholder?: string
}

/**
 * 评论编辑器：提交顶级评论或指向指定评论的平铺回复，并限制正文长度。
 */
export function CommentComposer({
  slug,
  replyToId,
  replyToAuthorName,
  onSuccess,
  onCancel,
  autoFocus = false,
  placeholder,
}: CommentComposerProps) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  const trimmed = content.trim()
  const charCount = trimmed.length
  const isOverLimit = charCount > 1000
  const canSubmit = charCount >= 1 && !isOverLimit && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          content: trimmed,
          replyToId: replyToId ?? null,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '发布评论失败，请重试')
      }

      setContent('')
      onSuccess()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '网络请求失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      {replyToAuthorName && (
        <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
          <span>// 回复 @{replyToAuthorName}:</span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              取消回复
            </button>
          )}
        </div>
      )}

      <div className="relative rounded-lg border border-border/60 bg-background/50 focus-within:border-foreground/30">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder || (replyToAuthorName ? `回复 @${replyToAuthorName}...` : '写下你的想法...')}
          rows={3}
          maxLength={1000}
          className="w-full resize-y bg-transparent p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />

        <div className="flex items-center justify-between border-t border-border/40 px-3 py-2">
          <span className={`font-mono text-xs ${isOverLimit ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            {charCount} / 1000
          </span>

          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="rounded-md px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                取消
              </button>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center rounded-md bg-foreground px-3.5 py-1 font-mono text-xs font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? '发送中...' : '发送 ↗'}
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="rounded-md bg-red-500/10 p-2 text-xs text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}
    </form>
  )
}
