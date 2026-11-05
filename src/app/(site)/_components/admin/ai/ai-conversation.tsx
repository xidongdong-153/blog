'use client'

import type { UseChatHelpers } from '@ai-sdk/react'
import type { DraftSaveState } from './ai-tool-message'
import type { AiAgentDto, AiAgentMessage, AiToolDto } from '@/lib/ai-agent'
import type { GeneratedPostDraft } from '@/lib/post-draft'
import * as Form from '@radix-ui/react-form'
import { Avatar, Badge, Box, Callout, Flex, ScrollArea, Text } from '@radix-ui/themes'
import { ArrowDown, ArrowUp, Square, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { isAiModelError, MAX_AI_MESSAGE_LENGTH, MAX_AI_MESSAGES } from '@/lib/ai-agent'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { getAiChatError } from './ai-chat-errors'
import { AiToolMessage } from './ai-tool-message'

/** 临时会话的消息视图；消息与输入由工作区持有，不随页签卸载。 */
export function AiConversation({
  agent,
  tools,
  chat,
  input,
  onInputChange,
  onSend,
  onStop,
  onClear,
  onOpenModels,
  modelReady,
  configurationBusy,
  notice,
  saves,
  onSave,
  onSlugChange,
}: {
  agent: AiAgentDto
  tools: AiToolDto[]
  chat: UseChatHelpers<AiAgentMessage>
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  onClear: () => void
  onOpenModels: () => void
  modelReady: boolean
  configurationBusy: boolean
  notice: string
  saves: Record<string, DraftSaveState>
  onSave: (key: string, draft: GeneratedPostDraft, slug: string) => void
  onSlugChange: (key: string, slug: string) => void
}) {
  const running = chat.status === 'submitted' || chat.status === 'streaming'
  const viewport = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const [showLatest, setShowLatest] = useState(false)
  const composing = useRef(false)
  const error = chat.error ? getAiChatError(chat.error) : null
  const limitReached = chat.messages.length >= MAX_AI_MESSAGES - 1
  const previousParts = [...chat.messages].reverse().find((message) => message.role === 'user')?.parts ?? []
  const previousInput = previousParts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')

  useEffect(() => {
    const target = viewport.current
    if (target && atBottom.current) target.scrollTop = target.scrollHeight
  }, [chat.messages])

  function scrollLatest() {
    const target = viewport.current
    if (target) target.scrollTop = target.scrollHeight
    atBottom.current = true
    setShowLatest(false)
  }

  return (
    <Flex direction="column" className="min-w-0 py-4">
      <Flex align="center" justify="between" gap="3" wrap="wrap" pb="3">
        <Text size="2" color="gray">
          临时对话 · 刷新后清空
        </Text>
        <Button variant="ghost" size="sm" disabled={chat.messages.length === 0 && !input} onClick={onClear}>
          <Trash2 aria-hidden="true" />
          清空对话
        </Button>
      </Flex>
      {!modelReady && (
        <Callout.Root color="amber" mb="3">
          <Callout.Text>
            模型尚未就绪。
            <Button variant="link" className="h-auto px-1 py-0" onClick={onOpenModels}>
              前往模型配置
            </Button>
          </Callout.Text>
        </Callout.Root>
      )}
      <ScrollArea
        ref={viewport}
        type="auto"
        scrollbars="vertical"
        className="h-[min(52dvh,36rem)] min-h-64 min-w-0 max-w-full rounded-lg border border-border [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!w-full [&_[data-radix-scroll-area-viewport]>div]:!min-w-0 [&_[data-radix-scroll-area-viewport]>div]:!max-w-full"
        onScroll={(event) => {
          const target = event.currentTarget
          atBottom.current = target.scrollHeight - target.scrollTop - target.clientHeight < 80
          setShowLatest(!atBottom.current)
        }}
        aria-label="与写作 Agent 的对话"
        tabIndex={0}
      >
        <Flex direction="column" gap="6" p={{ initial: '3', sm: '5' }} className="w-full min-w-0 max-w-full">
          {chat.messages.length === 0 && (
            <Flex direction="column" align="center" justify="center" gap="3" className="min-h-52">
              <Avatar src={agent.avatar} fallback="写" size="5" radius="full" alt="写作 Agent" />
              <Text size="3" weight="medium">
                想写点什么？
              </Text>
              <Text size="2" color="gray" align="center">
                描述选题生成初稿，或粘贴正文生成摘要。
              </Text>
            </Flex>
          )}
          {chat.messages.map((message, messageIndex) => (
            <Flex
              key={message.id}
              direction="column"
              gap="2"
              className={message.role === 'user' ? 'ml-auto w-full max-w-3xl' : 'w-full min-w-0'}
            >
              <Flex align="center" gap="2" wrap="wrap">
                <Text size="2" weight="medium">
                  {message.role === 'user' ? '你' : agent.name}
                </Text>
                {message.role === 'assistant' && message.metadata && (
                  <Badge color="gray" className="min-w-0 max-w-full !break-all !whitespace-normal">
                    {message.metadata.modelId} · 模型 r{message.metadata.modelRevision} · Agent r
                    {message.metadata.agentRevision}
                  </Badge>
                )}
              </Flex>
              {message.parts.map((part, partIndex) => {
                if (part.type === 'text') {
                  return (
                    <Text
                      key={`${message.id}-text-${partIndex}`}
                      as="p"
                      size="2"
                      className={`whitespace-pre-wrap break-words leading-7 [overflow-wrap:anywhere] ${message.role === 'user' ? 'rounded-lg bg-muted px-4 py-3' : ''}`}
                    >
                      {part.text}
                    </Text>
                  )
                }
                if (part.type === 'tool-article-summary' || part.type === 'tool-post-draft') {
                  const key = `${message.id}:${part.toolCallId}`
                  return (
                    <AiToolMessage
                      key={key}
                      part={part}
                      tools={tools}
                      active={chat.status === 'streaming' && messageIndex === chat.messages.length - 1}
                      saveState={saves[key]}
                      onSlugChange={(slug) => onSlugChange(key, slug)}
                      onSave={(draft, slug) => onSave(key, draft, slug)}
                    />
                  )
                }
                return null
              })}
            </Flex>
          ))}
          {chat.status === 'submitted' && (
            <Text size="2" color="gray">
              正在连接写作 Agent…
            </Text>
          )}
        </Flex>
      </ScrollArea>
      {showLatest && (
        <Button variant="outline" size="sm" className="mt-2 self-center" onClick={scrollLatest}>
          <ArrowDown aria-hidden="true" />
          回到最新消息
        </Button>
      )}
      <Box aria-live="polite" aria-atomic="true" className="min-h-8 py-2">
        <Text size="2" color="gray">
          {running ? '写作 Agent 正在处理，可随时停止。' : notice}
        </Text>
      </Box>
      {error && (
        <Callout.Root color="red" mb="3" role="alert">
          <Callout.Text>
            {error.message}
            {previousInput && (
              <Button
                variant="link"
                className="h-auto px-1 py-0"
                disabled={Boolean(input.trim())}
                onClick={() => onInputChange(previousInput)}
              >
                取回上条输入
              </Button>
            )}
            {isAiModelError(error.code) && (
              <Button variant="link" className="h-auto px-1 py-0" onClick={onOpenModels}>
                检查模型配置
              </Button>
            )}
          </Callout.Text>
        </Callout.Root>
      )}
      {limitReached && (
        <Callout.Root color="amber" mb="3">
          <Callout.Text>本次对话已达到消息上限，清空后可开始新对话。</Callout.Text>
        </Callout.Root>
      )}
      <Form.Root
        onSubmit={(event) => {
          event.preventDefault()
          onSend()
        }}
      >
        <Form.Field name="message">
          <Flex direction="column" gap="2">
            <Form.Label className="text-sm font-medium" htmlFor="ai-writer-message">
              消息
            </Form.Label>
            <Form.Control asChild>
              <Textarea
                id="ai-writer-message"
                value={input}
                maxLength={MAX_AI_MESSAGE_LENGTH}
                rows={4}
                className="min-h-28 resize-y [field-sizing:fixed]"
                placeholder="描述选题，或粘贴正文并说明需要摘要…"
                aria-describedby="ai-message-limit"
                onChange={(event) => onInputChange(event.target.value)}
                onCompositionStart={() => {
                  composing.current = true
                }}
                onCompositionEnd={() => {
                  composing.current = false
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    (event.ctrlKey || event.metaKey) &&
                    !event.nativeEvent.isComposing &&
                    !composing.current
                  ) {
                    event.preventDefault()
                    onSend()
                  }
                }}
              />
            </Form.Control>
            <Flex justify="between" align="center" gap="3" wrap="wrap">
              <Text id="ai-message-limit" size="1" color="gray">
                Ctrl / ⌘ + Enter 发送 · {input.length} / {MAX_AI_MESSAGE_LENGTH}
              </Text>
              {running ? (
                <Button variant="outline" onClick={onStop}>
                  <Square aria-hidden="true" />
                  停止生成
                </Button>
              ) : (
                <Button type="submit" disabled={!input.trim() || !modelReady || configurationBusy || limitReached}>
                  <ArrowUp aria-hidden="true" />
                  发送
                </Button>
              )}
            </Flex>
          </Flex>
        </Form.Field>
      </Form.Root>
    </Flex>
  )
}
