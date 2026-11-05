'use client'

import type { RefObject } from 'react'
import * as Form from '@radix-ui/react-form'
import { Callout, Checkbox, Flex, Text } from '@radix-ui/themes'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { isAiModelError } from '@/lib/ai-agent'
import { ApiRequestError } from '@/lib/api-error'
import { MAX_DRAFT_OVERVIEW_LENGTH } from '@/lib/post-draft'
import { AiThemeProvider } from '../ui/ai-theme-provider'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { Button } from '../ui/button'
import { ShinyText } from '../ui/shiny-text'
import { StarBorder } from '../ui/star-border'
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
  const [error, setError] = useState<{ message: string; code?: string } | null>(null)
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
    setError(null)
    try {
      await onGenerate(overview.trim(), controller.signal)
      if (!controller.signal.aborted) onClose()
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError({
          message: cause instanceof Error ? cause.message : '初稿生成失败，请稍后重试',
          code: cause instanceof ApiRequestError ? cause.code : undefined,
        })
      }
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
        <AiThemeProvider>
          <Form.Root
            className="flex min-w-0 flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              void generate()
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 font-serif">
                <Sparkles aria-hidden="true" className="size-4 text-primary" />
                AI 生成初稿
              </AlertDialogTitle>
              <AlertDialogDescription>根据内容概述填入文章属性与正文，生成后可继续编辑。</AlertDialogDescription>
            </AlertDialogHeader>
            <Form.Field name="overview" className="flex min-w-0 flex-col gap-2">
              <Flex justify="between" align="center" gap="2" wrap="wrap">
                <Form.Label htmlFor="post-draft-overview" className="text-sm font-medium">
                  内容概述
                </Form.Label>
                <Text
                  id="post-draft-overview-limit"
                  size="1"
                  className="ml-auto font-mono tabular-nums text-muted-foreground"
                >
                  {overview.length} / {MAX_DRAFT_OVERVIEW_LENGTH}
                </Text>
              </Flex>
              <StarBorder active={generating} contentClassName="p-0.5">
                <Form.Control asChild>
                  <Textarea
                    ref={overviewRef}
                    id="post-draft-overview"
                    value={overview}
                    maxLength={MAX_DRAFT_OVERVIEW_LENGTH}
                    required
                    disabled={generating}
                    aria-describedby="post-draft-overview-limit"
                    placeholder="例如：写一篇面向 React 开发者的 Next.js 缓存入门，说明常见误区，并给出代码示例。"
                    className="min-h-40 resize-y border-0 bg-transparent shadow-none focus-visible:ring-0 [field-sizing:fixed]"
                    onChange={(event) => setOverview(event.target.value)}
                  />
                </Form.Control>
              </StarBorder>
              <Form.Message match="valueMissing" className="text-sm text-destructive">
                请输入内容概述
              </Form.Message>
            </Form.Field>
            {hasExistingContent && (
              <Text
                as="label"
                size="2"
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 leading-relaxed"
              >
                <Checkbox
                  checked={replaceConfirmed}
                  disabled={generating}
                  onCheckedChange={(checked) => setReplaceConfirmed(checked === true)}
                  className="mt-1 shrink-0"
                />
                替换当前正文及相关文章属性，包括未保存的修改。生成后不会自动保存或发布。
              </Text>
            )}
            {error && (
              <Callout.Root role="alert" color="red" size="1" className="min-w-0">
                <Callout.Text className="break-words">{error.message}</Callout.Text>
                {isAiModelError(error.code) && (
                  <Button asChild variant="link" className="h-auto justify-start p-0">
                    <Link href="/admin/ai?tab=models" target="_blank" rel="noopener noreferrer">
                      打开模型配置
                    </Link>
                  </Button>
                )}
              </Callout.Root>
            )}
            {generating && (
              <Text role="status" size="2">
                <ShinyText>正在生成初稿，请稍候…</ShinyText>
              </Text>
            )}
            <AlertDialogFooter>
              <Button variant="outline" onClick={close}>
                {generating ? '取消生成' : '取消'}
              </Button>
              <Form.Submit asChild>
                <Button
                  type="submit"
                  pending={generating}
                  disabled={!overview.trim() || (hasExistingContent && !replaceConfirmed)}
                >
                  生成并填入
                </Button>
              </Form.Submit>
            </AlertDialogFooter>
          </Form.Root>
        </AiThemeProvider>
      </AlertDialogContent>
    </AlertDialog>
  )
}
