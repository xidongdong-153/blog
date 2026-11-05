'use client'

import type { DraftSaveState } from './ai-tool-message'
import type { AiAgentConfigInput, AiAgentDto, AiAgentMessage, AiToolDto } from '@/lib/ai-agent'
import type { GeneratedPostDraft } from '@/lib/post-draft'
import type { ManagedPost } from '@/lib/posts'
import type { AiSummaryConfigDto } from '@/server/modules/ai/ai.types'
import { useChat } from '@ai-sdk/react'
import * as Form from '@radix-ui/react-form'
import { Avatar, Badge, Box, Callout, Code, Flex, Grid, Heading, Text } from '@radix-ui/themes'
import { DefaultChatTransport } from 'ai'
import { ArrowLeft, ArrowRight, Cpu, FileText, MessageSquare, Settings2, Sparkles, Wrench } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import {
  aiAgentConfigInputSchema,
  MAX_AI_MESSAGE_LENGTH,
  MAX_AI_MESSAGES,
  MAX_AI_REQUEST_BYTES,
  MAX_AI_SYSTEM_PROMPT_LENGTH,
} from '@/lib/ai-agent'
import { ApiRequestError } from '@/lib/api-error'
import { generatedPostDraftSchema } from '@/lib/post-draft'
import { createEmptyPost, postInputSchema } from '@/lib/posts'
import { postRequest } from '../posts/post-api'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { Button } from '../ui/button'
import { SpotlightCard } from '../ui/spotlight-card'
import { Switch } from '../ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'
import { fetchAiChat } from './ai-chat-errors'
import { AiConversation } from './ai-conversation'
import { aiRequest } from './ai-request'
import { AiSummarySettingsForm } from './ai-summary-settings-form'
import { useModelSettings } from './use-model-settings'

type WorkspaceTab = 'agents' | 'models' | 'tools'

/** 模型、Agent 配置与临时会话共用一个状态边界，点击 Agent 转入独立对话/配置视图，避免纵向堆叠。 */
export function AiWorkspace({
  initialAgents,
  initialModelConfig,
  tools,
  masterKeyAvailable,
}: {
  initialAgents: AiAgentDto[]
  initialModelConfig: AiSummaryConfigDto | null
  tools: AiToolDto[]
  masterKeyAvailable: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialAgentParam = searchParams.get('agent')
  const tab: WorkspaceTab = tabParam === 'models' || tabParam === 'tools' ? tabParam : 'agents'
  const [agent, setAgent] = useState(initialAgents.find((item) => item.id === 'writer') ?? null)
  const [activeAgentView, setActiveAgentView] = useState<boolean>(initialAgentParam === 'writer')
  const [agentPanel, setAgentPanel] = useState('conversation')
  const [agentDraft, setAgentDraft] = useState<AiAgentConfigInput>({
    revision: agent?.revision ?? 0,
    modelConfigId: 'default',
    systemPrompt: agent?.systemPrompt ?? '',
    toolIds: agent?.toolIds ?? [],
  })
  const [modelConfig, setModelConfig] = useState(initialModelConfig)
  const model = useModelSettings({
    initialConfig: initialModelConfig,
    masterKeyAvailable,
    onConfigChange: setModelConfig,
  })
  const [agentSaving, setAgentSaving] = useState(false)
  const agentSavingRef = useRef(false)
  const [agentError, setAgentError] = useState('')
  const [agentMessage, setAgentMessage] = useState('')
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState('')
  const [session, setSession] = useState(0)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [pendingPrefill, setPendingPrefill] = useState<string | null>(null)
  const [saves, setSaves] = useState<Record<string, DraftSaveState>>({})
  const saveLocks = useRef(new Set<string>())
  const savedPosts = useRef(new Map<string, string>())
  const unknownSaves = useRef(new Set<string>())
  const sendLock = useRef(false)
  const runEpoch = useRef(0)
  const transport = useMemo(
    () => new DefaultChatTransport<AiAgentMessage>({ api: '/api/ai/agents/writer/chat', fetch: fetchAiChat }),
    [],
  )
  const chat = useChat<AiAgentMessage>({
    id: `writer-${session}`,
    transport,
    throttle: 60,
    onFinish: ({ isAbort, isDisconnect, isError }) => {
      setNotice(
        isAbort
          ? '已停止生成，保留已收到的内容。'
          : isDisconnect || isError
            ? '本次生成未完成，可修改消息后重新发送。'
            : '本次处理已完成。',
      )
    },
  })
  const running = chat.status === 'submitted' || chat.status === 'streaming'
  const modelReady = Boolean(
    modelConfig?.status === 'ready' && modelConfig.hasCredential && modelConfig.masterKeyAvailable,
  )
  const agentDirty = Boolean(
    agent &&
    (agentDraft.systemPrompt !== agent.systemPrompt ||
      agentDraft.toolIds.length !== agent.toolIds.length ||
      agentDraft.toolIds.some((id) => !agent.toolIds.includes(id))),
  )
  const configurationBusy = agentSaving || Boolean(model.operation)

  function syncUrl(nextTab: WorkspaceTab, openWriter: boolean) {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', nextTab)
    if (openWriter) url.searchParams.set('agent', 'writer')
    else url.searchParams.delete('agent')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }

  function selectTab(value: string) {
    const next: WorkspaceTab = value === 'models' || value === 'tools' ? value : 'agents'
    syncUrl(next, next === 'agents' ? activeAgentView : false)
  }

  function openAgent(panel: 'conversation' | 'configuration' = 'conversation') {
    setAgentPanel(panel)
    setActiveAgentView(true)
    syncUrl('agents', true)
  }

  function closeAgent() {
    setActiveAgentView(false)
    syncUrl('agents', false)
  }

  async function send() {
    if (sendLock.current || running || clearing || configurationBusy || !modelReady || !input.trim()) return
    if (chat.messages.length >= MAX_AI_MESSAGES - 1) {
      setNotice('对话已达到消息上限，请清空后继续。')
      return
    }
    const text = input.trim()
    if (text.length > MAX_AI_MESSAGE_LENGTH) {
      setNotice('消息过长，请缩短后发送。')
      return
    }
    if (
      new TextEncoder().encode(
        JSON.stringify({ messages: [...chat.messages, { role: 'user', parts: [{ type: 'text', text }] }] }),
      ).length >
      MAX_AI_REQUEST_BYTES - 1024
    ) {
      setNotice('本次对话内容过长，请清空后重新发送。')
      return
    }
    sendLock.current = true
    const epoch = ++runEpoch.current
    setInput('')
    setNotice('')
    chat.clearError()
    try {
      await chat.sendMessage({ text })
    } catch (cause) {
      if (runEpoch.current === epoch) setNotice(cause instanceof Error ? cause.message : '消息发送失败，请重新发送。')
    } finally {
      if (runEpoch.current === epoch) sendLock.current = false
    }
  }

  async function stop() {
    await chat.stop()
    sendLock.current = false
    setNotice('已停止生成，保留已收到的内容。')
  }

  async function clearConversation() {
    if (clearing || saveLocks.current.size > 0) return
    setClearing(true)
    await chat.stop()
    runEpoch.current += 1
    sendLock.current = false
    chat.setMessages([])
    chat.clearError()
    setSession((value) => value + 1)
    setInput('')
    setSaves({})
    savedPosts.current.clear()
    unknownSaves.current.clear()
    setNotice('')
    setClearOpen(false)
    setClearing(false)
  }

  async function saveAgent() {
    if (!agent || running || configurationBusy || agentSavingRef.current) return
    const parsed = aiAgentConfigInputSchema.safeParse(agentDraft)
    if (!parsed.success) {
      setAgentError(parsed.error.issues[0]?.message ?? '配置无效')
      return
    }
    agentSavingRef.current = true
    setAgentSaving(true)
    setAgentError('')
    setAgentMessage('')
    try {
      const next = await aiRequest<AiAgentDto>('/agents/writer', 'PUT', parsed.data)
      setAgent(next)
      setAgentDraft({
        revision: next.revision,
        modelConfigId: next.modelConfigId,
        systemPrompt: next.systemPrompt,
        toolIds: next.toolIds,
      })
      setAgentMessage('Agent 配置已保存，下一次对话请求将使用新配置。')
    } catch (cause) {
      setAgentError(
        cause instanceof ApiRequestError && cause.status === 409
          ? '配置已在其他页面更新。请复制未保存的提示词后刷新页面，再重新修改。'
          : cause instanceof Error
            ? cause.message
            : 'Agent 配置保存失败',
      )
    } finally {
      agentSavingRef.current = false
      setAgentSaving(false)
    }
  }

  async function saveDraft(key: string, candidate: GeneratedPostDraft, slug: string) {
    const existingId = savedPosts.current.get(key)
    if (existingId) {
      router.push(`/admin/posts/${existingId}/edit`)
      return
    }
    if (saveLocks.current.has(key) || unknownSaves.current.has(key)) return
    const parsed = generatedPostDraftSchema.safeParse(candidate)
    if (!parsed.success) {
      setSaves((current) => ({ ...current, [key]: { slug, status: 'error', error: '初稿格式无效，请重新生成。' } }))
      return
    }
    const empty = createEmptyPost()
    const { slug: generatedSlug, ...fields } = parsed.data
    const inputResult = postInputSchema.safeParse({
      slug: slug.trim() || generatedSlug,
      document: { ...empty.document, ...fields, aiGenerated: true },
    })
    if (!inputResult.success) {
      setSaves((current) => ({
        ...current,
        [key]: { slug, status: 'error', error: inputResult.error.issues[0]?.message ?? '请检查文章地址' },
      }))
      return
    }
    saveLocks.current.add(key)
    setSaves((current) => ({ ...current, [key]: { slug, status: 'saving' } }))
    try {
      const post = await postRequest<ManagedPost>('', 'POST', inputResult.data)
      savedPosts.current.set(key, post.id)
      setSaves((current) => ({ ...current, [key]: { slug: post.slug, status: 'saved', postId: post.id } }))
      router.push(`/admin/posts/${post.id}/edit`)
    } catch (cause) {
      const knownFailure = cause instanceof ApiRequestError && cause.status >= 400 && cause.status < 500
      if (!knownFailure) unknownSaves.current.add(key)
      setSaves((current) => ({
        ...current,
        [key]: {
          slug,
          status: knownFailure ? 'error' : 'unknown',
          error:
            cause instanceof ApiRequestError && cause.status === 409
              ? '文章地址已存在，请修改地址后重新保存。'
              : knownFailure
                ? cause.message
                : '保存结果暂时无法确认。请先到文章列表核对，避免重复创建。',
        },
      }))
    } finally {
      saveLocks.current.delete(key)
    }
  }

  function applyPrefill(text: string) {
    setInput(text)
    setAgentPanel('conversation')
    setActiveAgentView(true)
    syncUrl('agents', true)
    setPendingPrefill(null)
  }

  function useTool(tool: AiToolDto) {
    const text =
      tool.id === 'post-draft'
        ? '请调用文章初稿 Tool，根据以下概述生成文章初稿：\n\n'
        : '请调用文章摘要 Tool，为以下正文生成摘要：\n\n'
    if (input.trim()) setPendingPrefill(text)
    else applyPrefill(text)
  }

  if (!agent) {
    return (
      <Callout.Root color="red" role="alert">
        <Callout.Text>写作 Agent 暂不可用，请刷新页面。</Callout.Text>
      </Callout.Root>
    )
  }

  return (
    <Box className="min-w-0 pb-10">
      <Flex direction="column" gap="2" className="mb-6">
        <Flex align="center" gap="2" className="font-mono text-xs tracking-wider text-muted-foreground">
          <Text>// ADMIN</Text>
          <Text color="gray">•</Text>
          <Text className="font-medium text-primary">AI 工作台</Text>
        </Flex>
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Heading as="h1" size="7" className="font-serif">
            AI
          </Heading>
          <Flex align="center" gap="2" wrap="wrap">
            {modelConfig?.modelId && (
              <Code variant="soft" size="2" className="font-mono !break-all !whitespace-normal">
                {modelConfig.modelId}
              </Code>
            )}
            <Badge color={modelReady ? 'green' : 'amber'}>{modelReady ? '模型就绪' : '模型未就绪'}</Badge>
          </Flex>
        </Flex>
      </Flex>

      <Tabs value={tab} onValueChange={selectTab} className="min-w-0 gap-5">
        <TabsList variant="line" aria-label="AI 工作区" className="max-w-full flex-wrap border-b border-border pb-1">
          <TabsTrigger value="agents" onClick={() => setActiveAgentView(false)}>
            Agent 管理台
          </TabsTrigger>
          <TabsTrigger value="models">模型配置{model.dirty && <Badge color="gray">未保存</Badge>}</TabsTrigger>
          <TabsTrigger value="tools">Tool 列表</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="min-w-0">
          {!activeAgentView ? (
            /* Agent 管理台卡片列表视图：点击 Agent 转到临时对话页 */
            <Grid columns={{ initial: '1', md: initialAgents.length > 1 ? '2' : '1' }} gap="5" py="3">
              {initialAgents.map((item) => {
                const enabledCount = item.toolIds.length
                return (
                  <SpotlightCard
                    key={item.id}
                    onClick={() => openAgent('conversation')}
                    className="cursor-pointer p-5 transition-colors hover:border-primary/50 sm:p-6"
                  >
                    <Flex direction="column" justify="between" gap="5" className="h-full min-w-0">
                      <Flex direction="column" gap="4" className="min-w-0">
                        <Flex align="start" justify="between" gap="3" wrap="wrap">
                          <Flex align="center" gap="3" className="min-w-0">
                            <Avatar src={item.avatar} alt={item.name} fallback="写" radius="full" size="4" />
                            <Flex direction="column" gap="1" className="min-w-0">
                              <Flex align="center" gap="2" wrap="wrap">
                                <Heading as="h2" size="4" className="font-serif">
                                  {item.name}
                                </Heading>
                                <Code variant="soft" size="1" className="font-mono">
                                  {item.id}
                                </Code>
                              </Flex>
                              <Text size="2" color="gray" className="break-words">
                                {item.description}
                              </Text>
                            </Flex>
                          </Flex>
                          <Badge color={modelReady ? 'green' : 'amber'}>{modelReady ? '可对话' : '待配置模型'}</Badge>
                        </Flex>

                        <Grid columns={{ initial: '1', sm: '2' }} gap="3">
                          <Box className="rounded-lg border border-border/70 bg-muted/35 p-3.5">
                            <Text size="1" color="gray" className="font-mono uppercase tracking-wider">
                              关联模型
                            </Text>
                            <Text as="p" size="2" className="mt-1 font-mono text-xs break-all whitespace-normal">
                              {modelConfig?.modelId || '未配置'}
                            </Text>
                          </Box>
                          <Box className="rounded-lg border border-border/70 bg-muted/35 p-3.5">
                            <Text size="1" color="gray" className="font-mono uppercase tracking-wider">
                              已启用 Tool
                            </Text>
                            <Text as="p" size="2" className="mt-1 font-mono text-xs">
                              {enabledCount} / {tools.length} 个能力已挂载
                            </Text>
                          </Box>
                        </Grid>
                      </Flex>

                      <Flex
                        align="center"
                        justify="between"
                        gap="2"
                        wrap="wrap"
                        className="border-t border-border/60 pt-4"
                      >
                        <Button
                          onClick={(event) => {
                            event.stopPropagation()
                            openAgent('conversation')
                          }}
                        >
                          <MessageSquare aria-hidden="true" />
                          {chat.messages.length > 0 ? `继续临时对话 (${chat.messages.length})` : '进入临时对话'}
                          <ArrowRight aria-hidden="true" />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation()
                            openAgent('configuration')
                          }}
                        >
                          <Settings2 aria-hidden="true" />
                          Agent 配置
                          {agentDirty && <Badge color="gray">未保存</Badge>}
                        </Button>
                      </Flex>
                    </Flex>
                  </SpotlightCard>
                )
              })}
            </Grid>
          ) : (
            /* 点击 Agent 后转入的专属临时对话 / 配置页 */
            <Tabs value={agentPanel} onValueChange={setAgentPanel} className="min-w-0 gap-4 py-2">
              <Flex
                align="center"
                justify="between"
                gap="3"
                wrap="wrap"
                className="rounded-xl border border-border bg-card/50 px-3.5 py-2.5 sm:px-4"
              >
                <Flex align="center" gap="3" wrap="wrap" className="min-w-0">
                  <Button variant="ghost" size="sm" onClick={closeAgent} className="h-8 px-2.5 text-xs">
                    <ArrowLeft aria-hidden="true" />
                    返回 Agent 管理台
                  </Button>
                  <Text color="gray" aria-hidden="true">
                    /
                  </Text>
                  <Flex align="center" gap="2" className="min-w-0">
                    <Avatar src={agent.avatar} alt={agent.name} fallback="写" radius="full" size="2" />
                    <Heading as="h2" size="3" className="font-serif">
                      {agent.name}
                    </Heading>
                  </Flex>
                </Flex>

                <TabsList aria-label="写作 Agent">
                  <TabsTrigger value="conversation">对话</TabsTrigger>
                  <TabsTrigger value="configuration">
                    配置{agentDirty && <Badge color="gray">未保存</Badge>}
                  </TabsTrigger>
                </TabsList>
              </Flex>

              <TabsContent value="conversation" className="min-w-0">
                <AiConversation
                  agent={agent}
                  tools={tools}
                  chat={chat}
                  input={input}
                  onInputChange={setInput}
                  onSend={() => void send()}
                  onStop={() => void stop()}
                  onClear={() => setClearOpen(true)}
                  onOpenModels={() => selectTab('models')}
                  onUseTool={useTool}
                  modelId={modelConfig?.modelId}
                  modelReady={modelReady}
                  configurationBusy={configurationBusy || clearing}
                  notice={notice}
                  saves={saves}
                  onSave={(key, draft, slug) => void saveDraft(key, draft, slug)}
                  onSlugChange={(key, slug) => setSaves((current) => ({ ...current, [key]: { slug, status: 'idle' } }))}
                />
              </TabsContent>

              <TabsContent value="configuration" className="min-w-0">
                <Box className="w-full rounded-xl border border-border bg-card/50 p-5 sm:p-6">
                  <Form.Root
                    onSubmit={(event) => {
                      event.preventDefault()
                      void saveAgent()
                    }}
                  >
                    <Flex direction="column" gap="5">
                      <Flex
                        justify="between"
                        align="center"
                        gap="3"
                        wrap="wrap"
                        className="border-b border-border/60 pb-4"
                      >
                        <Flex direction="column" gap="1">
                          <Heading as="h3" size="4" className="font-serif">
                            写作配置
                          </Heading>
                          <Flex gap="2" align="center" wrap="wrap">
                            <Text size="2" color="gray" className="break-all">
                              默认模型：{modelConfig?.modelId || '未配置'}
                            </Text>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto px-1 py-0"
                              onClick={() => selectTab('models')}
                            >
                              <Settings2 aria-hidden="true" />
                              模型配置
                            </Button>
                          </Flex>
                        </Flex>
                        <Badge color="gray" className="font-mono">
                          版本 r{agent.revision}
                        </Badge>
                      </Flex>

                      <Grid columns={{ initial: '1', lg: '2' }} gap="6">
                        <Form.Field name="systemPrompt">
                          <Flex direction="column" gap="2">
                            <Flex justify="between" align="center" gap="2" wrap="wrap">
                              <Form.Label htmlFor="ai-agent-system-prompt" className="text-sm font-medium">
                                系统提示词
                              </Form.Label>
                              <Text id="ai-agent-prompt-limit" size="1" color="gray" className="font-mono tabular-nums">
                                {agentDraft.systemPrompt.length} / {MAX_AI_SYSTEM_PROMPT_LENGTH}
                              </Text>
                            </Flex>
                            <Form.Control asChild>
                              <Textarea
                                id="ai-agent-system-prompt"
                                value={agentDraft.systemPrompt}
                                maxLength={MAX_AI_SYSTEM_PROMPT_LENGTH}
                                required
                                disabled={running || configurationBusy}
                                rows={10}
                                className="min-h-60 resize-y font-mono text-xs leading-relaxed [field-sizing:fixed]"
                                onChange={(event) =>
                                  setAgentDraft((current) => ({ ...current, systemPrompt: event.target.value }))
                                }
                                aria-describedby="ai-agent-prompt-limit"
                              />
                            </Form.Control>
                          </Flex>
                        </Form.Field>

                        <Flex direction="column" gap="3">
                          <Heading as="h3" size="3">
                            可用 Tool
                          </Heading>
                          <Flex direction="column" gap="3">
                            {tools.map((tool) => {
                              const enabled = agentDraft.toolIds.includes(tool.id)
                              return (
                                <Flex
                                  key={tool.id}
                                  align="center"
                                  justify="between"
                                  gap="4"
                                  className="rounded-lg border border-border/80 bg-background p-3.5"
                                >
                                  <Flex direction="column" gap="1" className="min-w-0">
                                    <Flex align="center" gap="2" wrap="wrap">
                                      <Text as="label" htmlFor={`agent-tool-${tool.id}`} weight="medium" size="2">
                                        {tool.name}
                                      </Text>
                                      <Code variant="soft" size="1" className="font-mono">
                                        {tool.id}
                                      </Code>
                                    </Flex>
                                    <Text size="2" color="gray">
                                      {tool.description}
                                    </Text>
                                  </Flex>
                                  <Switch
                                    id={`agent-tool-${tool.id}`}
                                    checked={enabled}
                                    disabled={running || configurationBusy}
                                    onCheckedChange={(checked) =>
                                      setAgentDraft((current) => ({
                                        ...current,
                                        toolIds: checked
                                          ? [...current.toolIds, tool.id]
                                          : current.toolIds.filter((id) => id !== tool.id),
                                      }))
                                    }
                                  />
                                </Flex>
                              )
                            })}
                          </Flex>
                        </Flex>
                      </Grid>

                      {running && (
                        <Text size="2" color="gray">
                          对话结束后可修改 Agent 配置。
                        </Text>
                      )}
                      {agentError && (
                        <Callout.Root color="red" role="alert">
                          <Callout.Text>{agentError}</Callout.Text>
                        </Callout.Root>
                      )}
                      {agentMessage && (
                        <Text size="2" role="status">
                          {agentMessage}
                        </Text>
                      )}
                      <Flex align="center" gap="3" className="border-t border-border/60 pt-3">
                        <Button
                          type="submit"
                          pending={agentSaving}
                          disabled={running || configurationBusy || !agentDirty}
                        >
                          保存 Agent 配置
                        </Button>
                      </Flex>
                    </Flex>
                  </Form.Root>
                </Box>
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        <TabsContent value="models" className="min-w-0">
          <AiSummarySettingsForm state={model} running={running} />
        </TabsContent>

        <TabsContent value="tools" className="min-w-0">
          <Grid columns={{ initial: '1', md: '2' }} gap="5" py="3">
            {tools.map((tool) => {
              const isEnabled = agent.toolIds.includes(tool.id)
              return (
                <SpotlightCard key={tool.id} className="p-5">
                  <Flex direction="column" gap="4" className="h-full min-w-0">
                    <Flex align="center" justify="between" gap="3" wrap="wrap">
                      <Flex align="center" gap="2" className="min-w-0">
                        {tool.id === 'post-draft' ? (
                          <FileText aria-hidden="true" className="size-4 shrink-0 text-primary" />
                        ) : (
                          <Sparkles aria-hidden="true" className="size-4 shrink-0 text-primary" />
                        )}
                        <Heading as="h2" size="4" className="font-serif">
                          {tool.name}
                        </Heading>
                        <Code variant="soft" size="1" className="font-mono">
                          {tool.id}
                        </Code>
                      </Flex>
                      <Badge color={isEnabled ? 'green' : 'gray'}>{isEnabled ? '已启用' : '未启用'}</Badge>
                    </Flex>

                    <Text size="2" className="leading-relaxed">
                      {tool.description}
                    </Text>

                    <Grid columns="1" gap="3">
                      <Box className="rounded-md border border-border/70 bg-muted/35 p-3">
                        <Text size="1" weight="medium" color="gray" className="font-mono uppercase tracking-wider">
                          Input · 输入
                        </Text>
                        <Text as="p" size="2" color="gray" className="mt-1">
                          {tool.inputDescription}
                        </Text>
                      </Box>
                      <Box className="rounded-md border border-border/70 bg-muted/35 p-3">
                        <Text size="1" weight="medium" color="gray" className="font-mono uppercase tracking-wider">
                          Output · 输出
                        </Text>
                        <Text as="p" size="2" color="gray" className="mt-1">
                          {tool.outputDescription}
                        </Text>
                      </Box>
                    </Grid>

                    <Flex
                      mt="auto"
                      pt="3"
                      align="center"
                      justify="between"
                      gap="2"
                      wrap="wrap"
                      className="border-t border-border/60"
                    >
                      <Flex align="center" gap="2" className="text-muted-foreground">
                        <Cpu aria-hidden="true" className="size-3.5" />
                        <Text size="1" color="gray" className="font-mono">
                          默认模型 · {agent.name}
                        </Text>
                      </Flex>
                      <Flex gap="2" wrap="wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={running || !isEnabled}
                          onClick={() => useTool(tool)}
                        >
                          在写作 Agent 中使用
                          <ArrowRight aria-hidden="true" />
                        </Button>
                        {!isEnabled && (
                          <Button variant="link" size="sm" onClick={() => openAgent('configuration')}>
                            <Wrench aria-hidden="true" />
                            配置 Tool
                          </Button>
                        )}
                      </Flex>
                    </Flex>
                  </Flex>
                </SpotlightCard>
              )
            })}
          </Grid>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={clearOpen}
        onOpenChange={(open) => {
          if (!clearing) setClearOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空临时对话？</AlertDialogTitle>
            <AlertDialogDescription>
              当前生成将停止，消息、未保存的输入与初稿结果会被清除。已保存的文章草稿不会删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>取消</AlertDialogCancel>
            <Button
              variant="destructive"
              pending={clearing}
              disabled={Object.values(saves).some((item) => item.status === 'saving')}
              onClick={() => void clearConversation()}
            >
              清空对话
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingPrefill !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPrefill(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>替换未发送的消息？</AlertDialogTitle>
            <AlertDialogDescription>Tool 提示将替换输入框中的内容，确认后仍需手动发送。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <Button
              onClick={() => {
                if (pendingPrefill !== null) applyPrefill(pendingPrefill)
              }}
            >
              替换输入
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  )
}
