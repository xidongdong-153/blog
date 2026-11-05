'use client'

import type { UseChatHelpers } from '@ai-sdk/react'
import type { DraftSaveState } from './ai-tool-message'
import type { AiAgentDto, AiAgentMessage, AiToolDto } from '@/lib/ai-agent'
import type { GeneratedPostDraft } from '@/lib/post-draft'
import * as Form from '@radix-ui/react-form'
import { Avatar, Badge, Box, Callout, Flex, Grid, ScrollArea, Text } from '@radix-ui/themes'
import { ArrowDown, ArrowUp, ArrowUpRight, Cpu, FileText, Sparkles, Square, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { isAiModelError, MAX_AI_MESSAGE_LENGTH, MAX_AI_MESSAGES } from '@/lib/ai-agent'
import { Button } from '../ui/button'
import { ShinyText } from '../ui/shiny-text'
import { SpotlightCard } from '../ui/spotlight-card'
import { Textarea } from '../ui/textarea'
import { getAiChatError } from './ai-chat-errors'
import { AiToolMessage } from './ai-tool-message'

/** 临时会话的左右对话视图与内嵌输入区；消息与输入由工作区持有，不随页签卸载。 */
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
  onUseTool,
  modelId,
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
  onUseTool: (tool: AiToolDto) => void
  modelId?: string
  modelReady: boolean
  configurationBusy: boolean
  notice: string
  saves: Record<string, DraftSaveState>
  onSave: (key: string, draft: GeneratedPostDraft, slug: string) => void
  onSlugChange: (key: string, slug: string) => void
}) {
  const running = chat.status === 'submitted' || chat.status === 'streaming'
  const viewport = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const atBottom = useRef(true)
  const [showLatest, setShowLatest] = useState(false)
  const composing = useRef(false)
  const error = chat.error ? getAiChatError(chat.error) : null
  const limitReached = chat.messages.length >= MAX_AI_MESSAGES - 1
  const enabledTools = tools.filter((tool) => agent.toolIds.includes(tool.id))
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

  function handleSelectTool(tool: AiToolDto) {
    const willImmediateFill = !input.trim()
    onUseTool(tool)
    if (willImmediateFill) {
      requestAnimationFrame(() => {
        messageInputRef.current?.focus()
      })
    }
  }

  return (
    <Box className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card/40">
      {/* 聊天窗口顶部状态条 */}
      <Flex
        align="center"
        justify="between"
        gap="3"
        wrap="wrap"
        className="border-b border-border/70 bg-background/60 px-4 py-2.5 sm:px-5"
      >
        <Flex align="center" gap="2" wrap="wrap" className="min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenModels}
            className="h-auto min-h-7 max-w-full gap-1.5 px-2.5 py-1 text-left font-mono text-xs whitespace-normal break-all"
          >
            <Cpu aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
            <Text className="min-w-0 break-all whitespace-normal">{modelId || '未配置模型'}</Text>
          </Button>
          <Box aria-live="polite" aria-atomic="true" className="min-w-0">
            {running ? (
              <ShinyText className="text-xs">写作 Agent 正在处理，可随时停止。</ShinyText>
            ) : (
              <Text size="1" color="gray">
                {notice || '临时对话 · 刷新后清空'}
              </Text>
            )}
          </Box>
        </Flex>
        <Button
          variant="ghost"
          size="sm"
          disabled={chat.messages.length === 0 && !input}
          onClick={onClear}
          className="h-8 px-2.5 text-xs text-muted-foreground"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
          清空对话
        </Button>
      </Flex>

      {!modelReady && (
        <Box className="border-b border-border/60 px-4 py-3 sm:px-5">
          <Callout.Root color="amber">
            <Callout.Text>
              模型尚未就绪。
              <Button variant="link" className="h-auto px-1 py-0" onClick={onOpenModels}>
                前往模型配置
              </Button>
            </Callout.Text>
          </Callout.Root>
        </Box>
      )}

      {/* 左右对话消息视口 */}
      <ScrollArea
        ref={viewport}
        type="auto"
        scrollbars="vertical"
        className="h-[min(56dvh,38rem)] min-h-72 w-full min-w-0 max-w-full [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!w-full [&_[data-radix-scroll-area-viewport]>div]:!min-w-0 [&_[data-radix-scroll-area-viewport]>div]:!max-w-full"
        onScroll={(event) => {
          const target = event.currentTarget
          atBottom.current = target.scrollHeight - target.scrollTop - target.clientHeight < 80
          setShowLatest(!atBottom.current)
        }}
        aria-label="与写作 Agent 的对话"
        tabIndex={0}
      >
        <Flex direction="column" gap="5" className="w-full min-w-0 max-w-full px-4 py-5 sm:px-6">
          {chat.messages.length === 0 && (
            <Flex direction="column" align="center" justify="center" gap="4" className="min-h-60 py-6">
              <Flex direction="column" align="center" gap="2">
                <Avatar src={agent.avatar} fallback="写" size="5" radius="full" alt="写作 Agent" />
                <Text size="4" weight="medium" className="font-serif">
                  想写点什么？
                </Text>
                <Text size="2" color="gray" align="center">
                  描述选题生成初稿，或粘贴正文生成摘要。
                </Text>
              </Flex>
              {enabledTools.length > 0 && (
                <Grid columns={{ initial: '1', sm: '2' }} gap="3" className="w-full max-w-2xl pt-1">
                  {enabledTools.map((tool) => (
                    <SpotlightCard key={tool.id} asChild>
                      <Button
                        variant="ghost"
                        disabled={running}
                        onClick={() => handleSelectTool(tool)}
                        className="h-auto min-h-20 w-full flex-col items-start justify-between gap-2 bg-background/80 p-3.5 text-left whitespace-normal hover:border-primary/50 hover:bg-background"
                      >
                        <Flex align="center" justify="between" gap="2" className="w-full min-w-0">
                          <Flex align="center" gap="2" className="min-w-0">
                            {tool.id === 'post-draft' ? (
                              <FileText aria-hidden="true" className="size-4 shrink-0 text-primary" />
                            ) : (
                              <Sparkles aria-hidden="true" className="size-4 shrink-0 text-primary" />
                            )}
                            <Text size="2" weight="medium">
                              {tool.name}
                            </Text>
                          </Flex>
                          <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                        </Flex>
                        <Text size="1" color="gray" className="leading-relaxed break-words">
                          {tool.description}
                        </Text>
                      </Button>
                    </SpotlightCard>
                  ))}
                </Grid>
              )}
            </Flex>
          )}

          {chat.messages.map((message, messageIndex) => {
            const isUser = message.role === 'user'
            if (isUser) {
              return (
                <Flex key={message.id} justify="end" align="start" gap="3" className="w-full min-w-0">
                  <Flex direction="column" align="end" gap="1" className="min-w-0 max-w-[85%] sm:max-w-[75%]">
                    <Text size="1" color="gray" className="font-mono">
                      你
                    </Text>
                    {message.parts.map((part, partIndex) => {
                      if (part.type === 'text') {
                        return (
                          <Box
                            key={`${message.id}-text-${partIndex}`}
                            className="max-w-full rounded-2xl rounded-tr-xs bg-primary px-4 py-2.5 text-primary-foreground"
                          >
                            <Text
                              as="p"
                              size="2"
                              className="whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere]"
                            >
                              {part.text}
                            </Text>
                          </Box>
                        )
                      }
                      return null
                    })}
                  </Flex>
                  <Avatar fallback="你" size="2" radius="full" color="blue" className="mt-1 shrink-0" />
                </Flex>
              )
            }

            return (
              <Flex key={message.id} justify="start" align="start" gap="3" className="w-full min-w-0">
                <Avatar
                  src={agent.avatar}
                  fallback="写"
                  size="2"
                  radius="full"
                  alt={agent.name}
                  className="mt-1 shrink-0"
                />
                <Flex direction="column" align="start" gap="2" className="min-w-0 flex-1 max-w-[88%] sm:max-w-[82%]">
                  <Flex align="center" gap="2" wrap="wrap" className="min-w-0">
                    <Text size="2" weight="medium">
                      {agent.name}
                    </Text>
                    {message.metadata && (
                      <Badge
                        color="gray"
                        size="1"
                        className="min-w-0 max-w-full font-mono !break-all !whitespace-normal"
                      >
                        {message.metadata.modelId} · 模型 r{message.metadata.modelRevision} · Agent r
                        {message.metadata.agentRevision}
                      </Badge>
                    )}
                  </Flex>
                  {message.parts.map((part, partIndex) => {
                    if (part.type === 'text') {
                      return (
                        <Box
                          key={`${message.id}-text-${partIndex}`}
                          className="max-w-full rounded-2xl rounded-tl-xs border border-border/80 bg-background px-4 py-3"
                        >
                          <Text
                            as="p"
                            size="2"
                            className="whitespace-pre-wrap break-words leading-7 [overflow-wrap:anywhere]"
                          >
                            {part.text}
                          </Text>
                        </Box>
                      )
                    }
                    if (part.type === 'tool-article-summary' || part.type === 'tool-post-draft') {
                      const key = `${message.id}:${part.toolCallId}`
                      return (
                        <Box key={key} className="w-full min-w-0">
                          <AiToolMessage
                            part={part}
                            tools={tools}
                            active={chat.status === 'streaming' && messageIndex === chat.messages.length - 1}
                            saveState={saves[key]}
                            onSlugChange={(slug) => onSlugChange(key, slug)}
                            onSave={(draft, slug) => onSave(key, draft, slug)}
                          />
                        </Box>
                      )
                    }
                    return null
                  })}
                </Flex>
              </Flex>
            )
          })}

          {chat.status === 'submitted' && (
            <Flex justify="start" align="start" gap="3" className="w-full min-w-0">
              <Avatar
                src={agent.avatar}
                fallback="写"
                size="2"
                radius="full"
                alt={agent.name}
                className="mt-1 shrink-0"
              />
              <Box className="rounded-2xl rounded-tl-xs border border-border/80 bg-background px-4 py-2.5">
                <ShinyText className="text-sm">正在连接写作 Agent…</ShinyText>
              </Box>
            </Flex>
          )}
        </Flex>
      </ScrollArea>

      {/* 底部内嵌输入区 */}
      <Box className="border-t border-border/80 bg-background/70 px-4 py-3.5 sm:px-5">
        {showLatest && (
          <Flex justify="center" mb="3">
            <Button variant="outline" size="sm" onClick={scrollLatest}>
              <ArrowDown aria-hidden="true" />
              回到最新消息
            </Button>
          </Flex>
        )}
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
            <Flex direction="column" gap="3">
              <Form.Label className="sr-only" htmlFor="ai-writer-message">
                消息
              </Form.Label>
              <Form.Control asChild>
                <Textarea
                  ref={messageInputRef}
                  id="ai-writer-message"
                  value={input}
                  maxLength={MAX_AI_MESSAGE_LENGTH}
                  rows={3}
                  className="min-h-24 resize-y bg-background [field-sizing:fixed]"
                  placeholder="描述选题生成初稿，或粘贴正文并说明需要摘要…"
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
              <Flex justify="between" align="center" gap="2" wrap="wrap">
                <Flex align="center" gap="2" wrap="wrap" className="min-w-0">
                  {enabledTools.map((tool) => (
                    <Button
                      key={tool.id}
                      variant="outline"
                      size="sm"
                      disabled={running}
                      onClick={() => handleSelectTool(tool)}
                      className="h-8 gap-1.5 px-2.5 text-xs"
                    >
                      {tool.id === 'post-draft' ? (
                        <FileText aria-hidden="true" className="size-3.5" />
                      ) : (
                        <Sparkles aria-hidden="true" className="size-3.5" />
                      )}
                      + {tool.name}
                    </Button>
                  ))}
                </Flex>
                <Flex align="center" gap="3" wrap="wrap" className="ml-auto">
                  <Text id="ai-message-limit" size="1" color="gray" className="font-mono tabular-nums">
                    Ctrl / ⌘ + Enter 发送 · {input.length} / {MAX_AI_MESSAGE_LENGTH}
                  </Text>
                  {running ? (
                    <Button variant="outline" size="sm" onClick={onStop}>
                      <Square aria-hidden="true" />
                      停止生成
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!input.trim() || !modelReady || configurationBusy || limitReached}
                    >
                      <ArrowUp aria-hidden="true" />
                      发送
                    </Button>
                  )}
                </Flex>
              </Flex>
            </Flex>
          </Form.Field>
        </Form.Root>
      </Box>
    </Box>
  )
}
