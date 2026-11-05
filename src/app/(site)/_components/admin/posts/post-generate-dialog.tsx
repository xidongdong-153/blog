'use client'

import type { RefObject } from 'react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { MAX_DRAFT_OVERVIEW_LENGTH } from '@/lib/post-draft'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'

/** 输入概述生成初稿；取消或关闭时丢弃尚未完成的生成结果。 */
export function PostGenerateDialog({
  hasExistingContent,
  returnFocusRef,
  onGenerate,
  onClose,
}: {
  hasExistingContent: boolean
  returnFocusRef: RefObject<HTMLButtonElement | null>
  onGenerate: (overview: string, signal: AbortSignal) => Promise<void>
  onClose: () => void
}) {
  const [overview, setOverview] = useState('')
  const [replaceConfirmed, setReplaceConfirmed] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const overviewRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => () => request.current?.abort(), [])

  function close() {
    request.current?.abort()
    onClose()
  }

  async function generate() {
    if (request.current || !overview.trim() || (hasExistingContent && !replaceConfirmed)) return
    const controller = new AbortController()
    request.current = controller
    setGenerating(true)
    setError('')
    try {
      await onGenerate(overview.trim(), controller.signal)
      if (!controller.signal.aborted) onClose()
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '初稿生成失败，请稍后重试')
    } finally {
      if (request.current === controller) {
        request.current = null
        setGenerating(false)
      }
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <AlertDialogContent
        role="dialog"
        className="max-h-[calc(100dvh_-_2rem)] max-w-[calc(100vw_-_2rem)] overflow-y-auto"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          overviewRef.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusRef.current?.focus()
        }}
      >
        <form
          className="flex min-w-0 flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            void generate()
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>AI 生成初稿</AlertDialogTitle>
            <AlertDialogDescription>根据内容概述填入文章属性与正文，生成后可继续编辑。</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="post-draft-overview" className="text-sm font-medium">
              内容概述
            </label>
            <Textarea
              ref={overviewRef}
              id="post-draft-overview"
              value={overview}
              maxLength={MAX_DRAFT_OVERVIEW_LENGTH}
              required
              disabled={generating}
              aria-describedby="post-draft-overview-limit"
              placeholder="例如：写一篇面向 React 开发者的 Next.js 缓存入门，说明常见误区，并给出代码示例。"
              className="min-h-40 resize-y [field-sizing:fixed]"
              onChange={(event) => setOverview(event.target.value)}
            />
            <p id="post-draft-overview-limit" className="text-right text-xs tabular-nums text-muted-foreground">
              {overview.length} / {MAX_DRAFT_OVERVIEW_LENGTH}
            </p>
          </div>
          {hasExistingContent && (
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                checked={replaceConfirmed}
                disabled={generating}
                onChange={(event) => setReplaceConfirmed(event.target.checked)}
                className="mt-1 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              替换当前正文及相关文章属性，包括未保存的修改。生成后不会自动保存或发布。
            </label>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-600/40 bg-red-600/5 p-3 text-sm text-red-700 dark:text-red-400"
            >
              <p>{error}</p>
              {error.includes('AI 设置') && (
                <Link
                  href="/admin/ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block underline underline-offset-4"
                >
                  打开 AI 设置
                </Link>
              )}
            </div>
          )}
          {generating && (
            <p role="status" className="text-sm text-muted-foreground">
              正在生成初稿，请稍候…
            </p>
          )}
          <AlertDialogFooter>
            <Button variant="outline" onClick={close}>
              {generating ? '取消生成' : '取消'}
            </Button>
            <Button
              type="submit"
              pending={generating}
              disabled={!overview.trim() || (hasExistingContent && !replaceConfirmed)}
            >
              生成并填入
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
