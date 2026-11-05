'use client'

import type { AiSummaryConfigDto, SummaryProtocol, UpstreamModelItem } from '@/server/modules/ai/ai.types'
import { useRef, useState } from 'react'
import { aiRequest } from './ai-request'

/** 模型表单状态由工作区持有，切换页签时保留未保存的输入。 */
export function useModelSettings({
  initialConfig,
  masterKeyAvailable,
  onConfigChange,
}: {
  initialConfig: AiSummaryConfigDto | null
  masterKeyAvailable: boolean
  onConfigChange: (config: AiSummaryConfigDto | null) => void
}) {
  const [config, setConfig] = useState(initialConfig)
  const [protocol, setProtocol] = useState<SummaryProtocol>(initialConfig?.protocol ?? 'openai-completions')
  const [baseUrl, setBaseUrl] = useState(initialConfig?.baseUrl ?? 'https://api.openai.com/v1')
  const [modelId, setModelId] = useState(initialConfig?.modelId ?? '')
  const [apiKey, setApiKey] = useState('')
  const [models, setModels] = useState<UpstreamModelItem[]>([])
  const [customModel, setCustomModel] = useState(true)
  const [operation, setOperation] = useState<'save' | 'check' | 'models' | 'clear' | 'refresh' | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [clearOpen, setClearOpen] = useState(false)
  const pending = useRef(false)
  const dirty =
    protocol !== (config?.protocol ?? 'openai-completions') ||
    baseUrl.trim() !== (config?.baseUrl ?? 'https://api.openai.com/v1') ||
    modelId.trim() !== (config?.modelId ?? '') ||
    Boolean(apiKey.trim())

  function updateConfig(next: AiSummaryConfigDto | null) {
    setConfig(next)
    onConfigChange(next)
  }

  async function perform(kind: NonNullable<typeof operation>, action: () => Promise<void>) {
    if (pending.current) return
    pending.current = true
    setOperation(kind)
    setMessage('')
    setError('')
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败，请稍后重试')
    } finally {
      pending.current = false
      setOperation(null)
    }
  }

  function save() {
    return perform('save', async () => {
      if (!baseUrl.trim() || !modelId.trim()) throw new Error('请填写服务地址和模型 ID')
      const next = await aiRequest<AiSummaryConfigDto>('/summary-config', 'PUT', {
        protocol,
        baseUrl: baseUrl.trim(),
        modelId: modelId.trim(),
        apiKey: apiKey.trim() || undefined,
      })
      updateConfig(next)
      setProtocol(next.protocol)
      setBaseUrl(next.baseUrl)
      setModelId(next.modelId)
      setApiKey('')
      setModels([])
      setCustomModel(true)
      setMessage('已保存。测试通过后可用于 Agent 与文章生成。')
    })
  }

  function check() {
    return perform('check', async () => {
      if (dirty || !config) throw new Error('请先保存模型配置，再测试并启用')
      updateConfig(await aiRequest<AiSummaryConfigDto>('/summary-config/check', 'POST'))
      setMessage('连接测试通过，模型已启用。')
    })
  }

  function fetchModels() {
    return perform('models', async () => {
      if (!baseUrl.trim()) throw new Error('请先填写服务地址')
      if (!apiKey.trim() && !config?.hasCredential) throw new Error('请先输入 API Key 或保存凭据')
      const next = await aiRequest<UpstreamModelItem[]>('/summary-config/models', 'POST', {
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim() || undefined,
      })
      setModels(next)
      if (!modelId.trim() && next.length > 0) setModelId(next[0].id)
      setCustomModel(next.length === 0 || Boolean(modelId.trim() && !next.some((item) => item.id === modelId.trim())))
      setMessage(next.length > 0 ? `已获取 ${next.length} 个模型。` : '服务商未返回模型列表，可手动填写模型 ID。')
    })
  }

  function refresh() {
    return perform('refresh', async () => {
      if (dirty) throw new Error('存在未保存的修改，请先保存后再刷新')
      const next = await aiRequest<AiSummaryConfigDto | null>('/summary-config')
      updateConfig(next)
      setProtocol(next?.protocol ?? 'openai-completions')
      setBaseUrl(next?.baseUrl ?? 'https://api.openai.com/v1')
      setModelId(next?.modelId ?? '')
      setApiKey('')
      setModels([])
      setCustomModel(true)
      setMessage('已读取最新配置。')
    })
  }

  function clearCredential() {
    return perform('clear', async () => {
      updateConfig(await aiRequest<AiSummaryConfigDto>('/summary-config/credential', 'DELETE'))
      setApiKey('')
      setClearOpen(false)
      setMessage('已清除凭据，模型已停用。')
    })
  }

  return {
    config,
    protocol,
    baseUrl,
    modelId,
    apiKey,
    models,
    customModel,
    operation,
    message,
    error,
    clearOpen,
    dirty,
    masterKeyAvailable: config?.masterKeyAvailable ?? masterKeyAvailable,
    setProtocol,
    setBaseUrl,
    setModelId,
    setApiKey,
    setCustomModel,
    setClearOpen,
    save,
    check,
    fetchModels,
    refresh,
    clearCredential,
  }
}

export type ModelSettingsState = ReturnType<typeof useModelSettings>
