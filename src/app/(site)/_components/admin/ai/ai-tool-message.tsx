'use client'

import type { AiAgentMessage, AiToolDto } from '@/lib/ai-agent'
import type { GeneratedPostDraft } from '@/lib/post-draft'
import * as Form from '@radix-ui/react-form'
import { Badge, Box, Flex, Heading, Text } from '@radix-ui/themes'
import { Check, ChevronDown, FileText, Wrench } from 'lucide-react'
import Link from 'next/link'
import { generatedPostDraftSchema } from '@/lib/post-draft'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { Input } from '../ui/input'
import { getAiChatError } from './ai-chat-errors'

export interface DraftSaveState {
  slug: string
  status: 'idle' | 'saving' | 'saved' | 'error' | 'unknown'
  postId?: string
  error?: string
}

type ToolPart = Extract<AiAgentMessage['parts'][number], { type: 'tool-article-summary' | 'tool-post-draft' }>

/** 展示一个真实 Tool 调用及其完整输入输出，仅已校验的初稿允许保存。 */
export function AiToolMessage({
  part,
  tools,
  active,
  saveState,
  onSlugChange,
  onSave,
}: {
  part: ToolPart
  tools: AiToolDto[]
  active: boolean
  saveState?: DraftSaveState
  onSlugChange: (slug: string) => void
  onSave: (draft: GeneratedPostDraft, slug: string) => void
}) {
  const toolId = part.type === 'tool-post-draft' ? 'post-draft' : 'article-summary'
  const tool = tools.find((item) => item.id === toolId)
  const succeeded = part.state === 'output-available' && !part.preliminary
  const failed = part.state === 'output-error' || part.state === 'output-denied'
  const pending = !succeeded && !failed
  const parsedDraft =
    part.type === 'tool-post-draft' && succeeded ? generatedPostDraftSchema.safeParse(part.output.draft) : null
  const draft = parsedDraft?.success ? parsedDraft.data : null
  const summary =
    part.type === 'tool-article-summary' && succeeded && typeof part.output.summary === 'string'
      ? part.output.summary.trim()
      : ''
  const invalidOutput = succeeded && !(draft || summary)
  const status =
    failed || invalidOutput
      ? '失败'
      : succeeded
        ? '完成'
        : active
          ? part.state === 'input-streaming'
            ? '准备输入'
            : '执行中'
          : '已中断'
  const input = part.input
    ? 'overview' in part.input
      ? part.input.overview
      : 'content' in part.input
        ? part.input.content
        : ''
    : ''

  return (
    <Box className="min-w-0 rounded-lg border border-border bg-background p-4">
      <Collapsible defaultOpen={toolId === 'article-summary'}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="h-auto min-h-11 w-full justify-between whitespace-normal px-0 text-left">
            <Flex align="center" gap="2" className="min-w-0">
              <Wrench aria-hidden="true" />
              <Text weight="medium">{tool?.name ?? (toolId === 'post-draft' ? '文章初稿' : '文章摘要')}</Text>
              <Badge color={failed || invalidOutput ? 'red' : succeeded ? 'green' : active ? 'blue' : 'gray'}>
                {status}
              </Badge>
            </Flex>
            <ChevronDown aria-hidden="true" className="shrink-0" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Flex direction="column" gap="3" pt="3">
            <Text size="2" weight="medium">
              输入
            </Text>
            <Text
              as="p"
              size="2"
              className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
            >
              {input || '正在接收输入…'}
            </Text>
            <Text size="2" weight="medium">
              输出
            </Text>
            {draft ? (
              <Text
                as="p"
                size="2"
                className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
              >
                {draft.content}
              </Text>
            ) : summary ? (
              <Text as="p" size="2" className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {summary}
              </Text>
            ) : (
              <Text size="2" color={failed || invalidOutput ? 'red' : 'gray'}>
                {part.state === 'output-error'
                  ? getAiChatError(part.errorText).message
                  : invalidOutput
                    ? '结果格式无效，无法保存。请重新生成。'
                    : part.state === 'output-denied'
                      ? '调用被拒绝。'
                      : pending && !active
                        ? '本次调用未完成，没有可保存的结果。'
                        : '等待结果…'}
              </Text>
            )}
          </Flex>
        </CollapsibleContent>
      </Collapsible>
      {draft && (
        <Flex direction="column" gap="3" pt="3">
          <Flex align="start" gap="2">
            <FileText aria-hidden="true" className="mt-1 size-4 shrink-0" />
            <Heading as="h3" size="3" className="break-words">
              {draft.title}
            </Heading>
          </Flex>
          <Text as="p" size="2" color="gray" className="break-words">
            {draft.description}
          </Text>
          {saveState?.status === 'saved' && saveState.postId ? (
            <Button asChild variant="outline" className="self-start">
              <Link href={`/admin/posts/${saveState.postId}/edit`}>
                <Check aria-hidden="true" />
                继续编辑草稿
              </Link>
            </Button>
          ) : (
            <Form.Root
              onSubmit={(event) => {
                event.preventDefault()
                onSave(draft, saveState?.slug ?? draft.slug)
              }}
            >
              <Form.Field name="slug">
                <Flex direction="column" gap="2">
                  <Form.Label htmlFor={`draft-slug-${part.toolCallId}`}>文章地址</Form.Label>
                  <Flex gap="2" wrap="wrap">
                    <Form.Control asChild>
                      <Input
                        id={`draft-slug-${part.toolCallId}`}
                        value={saveState?.slug ?? draft.slug}
                        required
                        maxLength={128}
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        aria-describedby={`draft-slug-hint-${part.toolCallId}`}
                        disabled={saveState?.status === 'saving' || saveState?.status === 'unknown'}
                        onChange={(event) => onSlugChange(event.target.value)}
                        className="min-w-0 flex-1"
                      />
                    </Form.Control>
                    <Button
                      type="submit"
                      pending={saveState?.status === 'saving'}
                      disabled={saveState?.status === 'saving' || saveState?.status === 'unknown'}
                    >
                      保存为草稿并编辑
                    </Button>
                  </Flex>
                  <Text size="1" color="gray" id={`draft-slug-hint-${part.toolCallId}`}>
                    小写字母、数字和连字符；保存后仍需在编辑器中发布。
                  </Text>
                </Flex>
              </Form.Field>
            </Form.Root>
          )}
          {saveState?.error && (
            <Text as="p" size="2" color="red" role="alert">
              {saveState.error}
            </Text>
          )}
          {saveState?.status === 'unknown' && (
            <Button asChild variant="outline" className="self-start">
              <Link href="/admin/posts" target="_blank" rel="noopener noreferrer">
                前往文章列表核对
              </Link>
            </Button>
          )}
        </Flex>
      )}
    </Box>
  )
}
