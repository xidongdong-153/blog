'use client'

import type { AiAgentMessage, AiToolDto } from '@/lib/ai-agent'
import type { GeneratedPostDraft } from '@/lib/post-draft'
import * as Form from '@radix-ui/react-form'
import { Badge, Box, Code, Flex, Heading, Text } from '@radix-ui/themes'
import { ArrowRight, Check, ChevronDown, FileText, Sparkles, Wrench } from 'lucide-react'
import Link from 'next/link'
import { BLOG_CATEGORY_LABELS, calculateReadingTime } from '@/lib/blog-meta'
import { generatedPostDraftSchema } from '@/lib/post-draft'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { Input } from '../ui/input'
import { ShinyText } from '../ui/shiny-text'
import { SpotlightCard } from '../ui/spotlight-card'
import { StarBorder } from '../ui/star-border'
import { getAiChatError } from './ai-chat-errors'

export interface DraftSaveState {
  slug: string
  status: 'idle' | 'saving' | 'saved' | 'error' | 'unknown'
  postId?: string
  error?: string
}

type ToolPart = Extract<AiAgentMessage['parts'][number], { type: 'tool-article-summary' | 'tool-post-draft' }>

/** 展示一个真实 Tool 调用执行轨及其结构化产物卡，仅已校验的初稿允许保存。 */
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
  const isRunning = pending && active
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
    <Flex direction="column" gap="3" className="min-w-0">
      {/* Tool 调用执行轨 */}
      <StarBorder active={isRunning} contentClassName="p-3.5 sm:p-4">
        <Collapsible defaultOpen={toolId === 'article-summary' || failed || invalidOutput}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="group h-auto min-h-10 w-full justify-between gap-3 whitespace-normal px-1 py-1 text-left hover:bg-transparent"
            >
              <Flex align="center" gap="2" wrap="wrap" className="min-w-0">
                <Wrench aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <Text weight="medium" size="2">
                  {tool?.name ?? (toolId === 'post-draft' ? '文章初稿' : '文章摘要')}
                </Text>
                <Code variant="soft" size="1" className="!break-all !whitespace-normal">
                  {toolId}
                </Code>
                <Badge color={failed || invalidOutput ? 'red' : succeeded ? 'green' : active ? 'blue' : 'gray'}>
                  {status}
                </Badge>
                {isRunning && (
                  <ShinyText className="text-xs">
                    {part.state === 'input-streaming' ? '正在接收输入参数…' : '正在生成结构化结果…'}
                  </ShinyText>
                )}
              </Flex>
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--ui-duration) group-data-[state=open]:rotate-180"
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Flex direction="column" gap="3" pt="3" className="mt-2 border-t border-border/60">
              <Box className="min-w-0 rounded-md border border-border/70 bg-muted/35 p-3">
                <Flex align="center" justify="between" gap="2" mb="1">
                  <Text size="1" weight="medium" color="gray" className="font-mono uppercase tracking-wider">
                    Input · 输入
                  </Text>
                  {input && (
                    <Text size="1" color="gray" className="font-mono tabular-nums">
                      {input.length} 字
                    </Text>
                  )}
                </Flex>
                <Text
                  as="p"
                  size="2"
                  className="max-h-52 overflow-y-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                >
                  {input || (isRunning ? <ShinyText>正在接收输入…</ShinyText> : '无输入内容')}
                </Text>
              </Box>
              <Box className="min-w-0 rounded-md border border-border/70 bg-muted/35 p-3">
                <Flex align="center" justify="between" gap="2" mb="1">
                  <Text size="1" weight="medium" color="gray" className="font-mono uppercase tracking-wider">
                    Output · 输出
                  </Text>
                  {draft && (
                    <Text size="1" color="gray" className="font-mono tabular-nums">
                      {calculateReadingTime(draft.content)}
                    </Text>
                  )}
                </Flex>
                {draft ? (
                  <Text
                    as="p"
                    size="2"
                    className="max-h-80 overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                  >
                    {draft.content}
                  </Text>
                ) : summary ? (
                  <Flex direction="column" gap="2">
                    <Flex align="center" gap="1" className="text-muted-foreground">
                      <Sparkles aria-hidden="true" className="size-3.5" />
                      <Text size="1" color="gray" className="font-mono">
                        导读摘要
                      </Text>
                    </Flex>
                    <Text
                      as="p"
                      size="2"
                      className="leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                    >
                      {summary}
                    </Text>
                  </Flex>
                ) : (
                  <Text size="2" color={failed || invalidOutput ? 'red' : 'gray'}>
                    {part.state === 'output-error' ? (
                      getAiChatError(part.errorText).message
                    ) : invalidOutput ? (
                      '结果格式无效，无法保存。请重新生成。'
                    ) : part.state === 'output-denied' ? (
                      '调用被拒绝。'
                    ) : pending && !active ? (
                      '本次调用未完成，没有可保存的结果。'
                    ) : (
                      <ShinyText>等待结果…</ShinyText>
                    )}
                  </Text>
                )}
              </Box>
            </Flex>
          </CollapsibleContent>
        </Collapsible>
      </StarBorder>

      {/* 独立初稿产物卡片（Artifact Card） */}
      {draft && (
        <SpotlightCard className="p-4 sm:p-5">
          <Flex direction="column" gap="3" className="min-w-0">
            <Flex align="center" justify="between" gap="2" wrap="wrap">
              <Flex align="center" gap="2" wrap="wrap" className="min-w-0">
                <Text size="1" color="gray" className="font-mono uppercase tracking-wider">
                  // DRAFT ARTIFACT · {BLOG_CATEGORY_LABELS[draft.category]}
                </Text>
                {draft.tags.slice(0, 4).map((tag) => (
                  <Code key={tag} variant="ghost" size="1" color="gray" className="!break-all !whitespace-normal">
                    #{tag}
                  </Code>
                ))}
              </Flex>
              <Badge color="green">初稿就绪</Badge>
            </Flex>

            <Flex align="start" gap="3" className="min-w-0">
              <FileText aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
              <Flex direction="column" gap="2" className="min-w-0 flex-1">
                <Heading as="h3" size="4" className="font-serif break-words [overflow-wrap:anywhere]">
                  {draft.title}
                </Heading>
                <Text as="p" size="2" color="gray" className="leading-relaxed break-words [overflow-wrap:anywhere]">
                  {draft.description}
                </Text>
              </Flex>
            </Flex>

            <Box className="border-t border-border/60 pt-3">
              {saveState?.status === 'saved' && saveState.postId ? (
                <Button asChild variant="outline" className="self-start">
                  <Link href={`/admin/posts/${saveState.postId}/edit`}>
                    <Check aria-hidden="true" />
                    继续编辑草稿
                    <ArrowRight aria-hidden="true" />
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
                      <Form.Label htmlFor={`draft-slug-${part.toolCallId}`} className="text-xs font-medium">
                        文章地址
                      </Form.Label>
                      <Flex gap="2" wrap="wrap" align="center">
                        <Flex
                          align="center"
                          className="min-w-0 flex-1 rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring"
                        >
                          <Text
                            size="2"
                            color="gray"
                            className="shrink-0 border-r border-border bg-muted/50 px-2.5 py-2 font-mono text-xs select-none"
                          >
                            /blog/
                          </Text>
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
                              className="min-w-0 flex-1 border-0 bg-transparent font-mono focus-visible:ring-0"
                            />
                          </Form.Control>
                        </Flex>
                        <Button
                          type="submit"
                          pending={saveState?.status === 'saving'}
                          disabled={saveState?.status === 'saving' || saveState?.status === 'unknown'}
                        >
                          保存为草稿并编辑
                          <ArrowRight aria-hidden="true" />
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
                <Text as="p" size="2" color="red" role="alert" className="mt-2">
                  {saveState.error}
                </Text>
              )}
              {saveState?.status === 'unknown' && (
                <Button asChild variant="outline" className="mt-2 self-start">
                  <Link href="/admin/posts" target="_blank" rel="noopener noreferrer">
                    前往文章列表核对
                  </Link>
                </Button>
              )}
            </Box>
          </Flex>
        </SpotlightCard>
      )}
    </Flex>
  )
}
