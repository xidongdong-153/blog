'use client'

import type { DraftSaveState } from './ai-tool-message'
import type { AiAgentConfigInput, AiAgentDto, AiAgentMessage, AiToolDto } from '@/lib/ai-agent'
import type { GeneratedPostDraft } from '@/lib/post-draft'
import type { ManagedPost } from '@/lib/posts'
import type { AiSummaryConfigDto } from '@/server/modules/ai/ai.types'
import { useChat } from '@ai-sdk/react'
import * as Form from '@radix-ui/react-form'
import { Avatar, Badge, Box, Callout, Flex, Grid, Heading, ScrollArea, Text } from '@radix-ui/themes'
import { DefaultChatTransport } from 'ai'
import { ArrowRight, Check, Settings2, Wrench } from 'lucide-react'
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
import { Switch } from '../ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'
import { fetchAiChat } from './ai-chat-errors'
import { AiConversation } from './ai-conversation'
import { aiRequest } from './ai-request'
import { AiSummarySettingsForm } from './ai-summary-settings-form'
import { useModelSettings } from './use-model-settings'

type WorkspaceTab = 'agents' | 'models' | 'tools'

/** 模型、Agent 配置与临时会话共用一个状态边界，切换页签不丢输入。 */
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
  const tab: WorkspaceTab = tabParam === 'models' || tabParam === 'tools' ? tabParam : 'agents'
  const [agent, setAgent] = useState(initialAgents.find((item) => item.id === 'writer') ?? null)
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

  function selectTab(value: string) {
    const next: WorkspaceTab = value === 'models' || value === 'tools' ? value : 'agents'
    const url = new URL(window.location.href)
    url.searchParams.set('tab', next)
    url.searchParams.set('agent', 'writer')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
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
    selectTab('agents')
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
      <Flex align="center" justify="between" gap="3" wrap="wrap" className="mb-6">
        <Heading as="h1" size="7" className="font-serif">
          AI
        </Heading>
        <Badge color={modelReady ? 'green' : 'amber'}>{modelReady ? '模型就绪' : '模型未就绪'}</Badge>
      </Flex>
      <Tabs value={tab} onValueChange={selectTab} className="min-w-0 gap-5">
        <TabsList variant="line" aria-label="AI 工作区" className="max-w-full flex-wrap">
          <TabsTrigger value="agents">Agent 管理台</TabsTrigger>
          <TabsTrigger value="models">模型配置{model.dirty && <Badge color="gray">未保存</Badge>}</TabsTrigger>
          <TabsTrigger value="tools">Tool 列表</TabsTrigger>
        </TabsList>
        <TabsContent value="agents" className="min-w-0">
          <ScrollArea scrollbars="horizontal" type="auto" className="pb-3">
            <Flex gap="3" py="2">
              <Button
                variant="outline"
                aria-pressed="true"
                className="h-auto min-h-28 w-28 shrink-0 flex-col gap-2 border-primary bg-accent py-3"
                onClick={() => selectTab('agents')}
              >
                <Avatar src={agent.avatar} alt={agent.name} fallback="写" radius="full" size="5" />
                <Text size="2" weight="medium">
                  {agent.name}
                </Text>
                <Check aria-hidden="true" className="size-3.5" />
              </Button>
            </Flex>
          </ScrollArea>
          <Flex direction="column" gap="1" pt="3" pb="5">
            <Heading as="h2" size="5">
              {agent.name}
            </Heading>
            <Text size="2" color="gray">
              {agent.description}
            </Text>
          </Flex>
          <Tabs value={agentPanel} onValueChange={setAgentPanel} className="min-w-0">
            <TabsList aria-label="写作 Agent">
              <TabsTrigger value="conversation">对话</TabsTrigger>
              <TabsTrigger value="configuration">配置{agentDirty && <Badge color="gray">未保存</Badge>}</TabsTrigger>
            </TabsList>
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
                modelReady={modelReady}
                configurationBusy={configurationBusy || clearing}
                notice={notice}
                saves={saves}
                onSave={(key, draft, slug) => void saveDraft(key, draft, slug)}
                onSlugChange={(key, slug) => setSaves((current) => ({ ...current, [key]: { slug, status: 'idle' } }))}
              />
            </TabsContent>
            <TabsContent value="configuration" className="min-w-0 max-w-3xl py-5">
              <Form.Root
                onSubmit={(event) => {
                  event.preventDefault()
                  void saveAgent()
                }}
              >
                <Flex direction="column" gap="5">
                  <Flex justify="between" align="center" gap="3" wrap="wrap">
                    <Heading as="h3" size="4">
                      写作配置
                    </Heading>
                    <Text size="2" color="gray">
                      版本 {agent.revision}
                    </Text>
                  </Flex>
                  <Flex gap="3" align="center" wrap="wrap">
                    <Text size="2">默认模型：{modelConfig?.modelId || '未配置'}</Text>
                    <Button variant="link" size="sm" onClick={() => selectTab('models')}>
                      <Settings2 aria-hidden="true" />
                      模型配置
                    </Button>
                  </Flex>
                  <Form.Field name="systemPrompt">
                    <Flex direction="column" gap="2">
                      <Form.Label htmlFor="ai-agent-system-prompt">系统提示词</Form.Label>
                      <Form.Control asChild>
                        <Textarea
                          id="ai-agent-system-prompt"
                          value={agentDraft.systemPrompt}
                          maxLength={MAX_AI_SYSTEM_PROMPT_LENGTH}
                          required
                          disabled={running || configurationBusy}
                          rows={10}
                          className="min-h-64 resize-y [field-sizing:fixed]"
                          onChange={(event) =>
                            setAgentDraft((current) => ({ ...current, systemPrompt: event.target.value }))
                          }
                          aria-describedby="ai-agent-prompt-limit"
                        />
                      </Form.Control>
                      <Text id="ai-agent-prompt-limit" size="1" color="gray">
                        {agentDraft.systemPrompt.length} / {MAX_AI_SYSTEM_PROMPT_LENGTH}
                      </Text>
                    </Flex>
                  </Form.Field>
                  <Flex direction="column" gap="3">
                    <Heading as="h3" size="3">
                      可用 Tool
                    </Heading>
                    {tools.map((tool) => (
                      <Flex
                        key={tool.id}
                        align="center"
                        justify="between"
                        gap="4"
                        className="border-b border-border py-3"
                      >
                        <Flex direction="column" gap="1">
                          <Text as="label" htmlFor={`agent-tool-${tool.id}`} weight="medium" size="2">
                            {tool.name}
                          </Text>
                          <Text size="2" color="gray">
                            {tool.description}
                          </Text>
                        </Flex>
                        <Switch
                          id={`agent-tool-${tool.id}`}
                          checked={agentDraft.toolIds.includes(tool.id)}
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
                    ))}
                  </Flex>
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
                  <Button
                    type="submit"
                    className="self-start"
                    pending={agentSaving}
                    disabled={running || configurationBusy || !agentDirty}
                  >
                    保存 Agent 配置
                  </Button>
                </Flex>
              </Form.Root>
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="models">
          <AiSummarySettingsForm state={model} running={running} />
        </TabsContent>
        <TabsContent value="tools">
          <Grid columns={{ initial: '1', md: '2' }} gap="5" py="5">
            {tools.map((tool) => (
              <Flex key={tool.id} direction="column" gap="4" className="min-w-0 rounded-lg border border-border p-5">
                <Flex align="center" justify="between" gap="3">
                  <Flex align="center" gap="2">
                    <Wrench aria-hidden="true" className="size-4" />
                    <Heading as="h2" size="4">
                      {tool.name}
                    </Heading>
                  </Flex>
                  <Badge color={agent.toolIds.includes(tool.id) ? 'green' : 'gray'}>
                    {agent.toolIds.includes(tool.id) ? '已启用' : '未启用'}
                  </Badge>
                </Flex>
                <Text size="2">{tool.description}</Text>
                <Flex direction="column" gap="2">
                  <Text size="2" weight="medium">
                    输入
                  </Text>
                  <Text size="2" color="gray">
                    {tool.inputDescription}
                  </Text>
                  <Text size="2" weight="medium">
                    输出
                  </Text>
                  <Text size="2" color="gray">
                    {tool.outputDescription}
                  </Text>
                </Flex>
                <Text size="2" color="gray">
                  使用默认模型 · {agent.name}
                </Text>
                <Flex mt="auto" gap="2" wrap="wrap">
                  <Button
                    variant="outline"
                    disabled={running || !agent.toolIds.includes(tool.id)}
                    onClick={() => useTool(tool)}
                  >
                    在写作 Agent 中使用
                    <ArrowRight aria-hidden="true" />
                  </Button>
                  {!agent.toolIds.includes(tool.id) && (
                    <Button
                      variant="link"
                      onClick={() => {
                        setAgentPanel('configuration')
                        selectTab('agents')
                      }}
                    >
                      配置 Tool
                    </Button>
                  )}
                </Flex>
              </Flex>
            ))}
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
