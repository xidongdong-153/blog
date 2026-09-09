'use client'

import type { AiSummaryConfigDto } from '@/server/services/ai-summary-config'
import { AlertCircle, CheckCircle2, Loader2, ShieldAlert, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

type ProtocolType = 'openai-completions' | 'openai-responses' | 'anthropic-messages'

const PROTOCOL_OPTIONS: { value: ProtocolType; label: string; desc: string }[] = [
  {
    value: 'openai-completions',
    label: 'Chat Completions',
    desc: '适用于兼容 /chat/completions 的通用中转',
  },
  {
    value: 'openai-responses',
    label: 'Responses',
    desc: '适用于 OpenAI 原生 /responses 协议',
  },
  {
    value: 'anthropic-messages',
    label: 'Anthropic',
    desc: '适用于 Anthropic 格式 /messages 协议',
  },
]

interface AiSummarySettingsFormProps {
  initialMasterKeyAvailable?: boolean
}

export function AiSummarySettingsForm({ initialMasterKeyAvailable = true }: AiSummarySettingsFormProps) {
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<AiSummaryConfigDto | null>(null)

  // 表单状态
  const [protocol, setProtocol] = useState<ProtocolType>('openai-completions')
  const [baseUrl, setBaseUrl] = useState('')
  const [modelId, setModelId] = useState('')
  const [apiKey, setApiKey] = useState('')

  // 交互与状态反馈
  const [isSaving, setIsSaving] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 从服务端加载配置
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      const res = await fetch('/api/ai/summary-config')
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || '获取 AI 配置失败')
      }

      const data = json.data as AiSummaryConfigDto | null
      setConfig(data)

      if (data) {
        setProtocol(data.protocol)
        setBaseUrl(data.baseUrl)
        setModelId(data.modelId)
      } else {
        // 初始默认值
        setProtocol('openai-completions')
        setBaseUrl('https://api.openai.com/v1')
        setModelId('gpt-4o-mini')
      }
      setApiKey('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '加载配置异常')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchConfig()
  }, [fetchConfig])

  // 检测表单是否有未保存的改动
  const isDirty = useMemo(() => {
    if (!config) {
      return Boolean(baseUrl.trim() || modelId.trim() || apiKey.trim())
    }
    const hasFieldChanged =
      protocol !== config.protocol || baseUrl.trim() !== config.baseUrl || modelId.trim() !== config.modelId
    const hasNewKey = Boolean(apiKey.trim())
    return hasFieldChanged || hasNewKey
  }, [config, protocol, baseUrl, modelId, apiKey])

  // 保存配置
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/ai/summary-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol,
          baseUrl: baseUrl.trim(),
          modelId: modelId.trim(),
          apiKey: apiKey.trim() || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '保存配置失败')
      }

      const updated = json.data as AiSummaryConfigDto
      setConfig(updated)
      setApiKey('')
      setStatusMessage('配置保存成功，状态已重置为待测试。需测试通过后方可启用。')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '保存配置异常')
    } finally {
      setIsSaving(false)
    }
  }

  // 测试并启用
  const handleCheckAndEnable = async () => {
    if (isDirty) {
      setErrorMessage('表单存在未保存的修改，请先保存配置后再执行测试')
      return
    }

    setIsChecking(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/ai/summary-config/check', {
        method: 'POST',
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '模型连接测试失败')
      }

      const updated = json.data as AiSummaryConfigDto
      setConfig(updated)
      setStatusMessage('模型连接测试成功，已正式启用并可用于文章摘要生成。')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '测试过程发生异常')
    } finally {
      setIsChecking(false)
    }
  }

  // 清除凭据
  const handleClearCredential = async () => {
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      '确定清除当前 API Key 凭据吗？清除后数据库中的加密密文将被彻底抹去，配置状态将变为待测试并暂停摘要生成功能。',
    )
    if (!confirmed) return

    setIsClearing(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/ai/summary-config/credential', {
        method: 'DELETE',
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '清除凭据失败')
      }

      const updated = json.data as AiSummaryConfigDto
      setConfig(updated)
      setApiKey('')
      setStatusMessage('已成功清除 API Key 凭据，当前配置已停用。')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '清除凭据异常')
    } finally {
      setIsClearing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <span className="font-mono text-xs">正在读取配置...</span>
      </div>
    )
  }

  const isReady = config?.status === 'ready'
  const hasCredential = Boolean(config?.hasCredential)
  const masterKeyAvailable = config ? config.masterKeyAvailable : initialMasterKeyAvailable
  const masterKeyMissing = !masterKeyAvailable

  return (
    <div className="flex flex-col gap-8">
      {/* 主密钥缺失告警 */}
      {masterKeyMissing && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-600 dark:text-amber-400"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="font-medium">服务端未检测到有效的凭据加密主密钥</span>
            <span>
              环境变量 AI_CREDENTIAL_ENCRYPTION_KEY 未配置或格式不合法（需为 32 字节
              base64）。在此之前无法保存或解密凭据。
            </span>
          </div>
        </div>
      )}

      {/* 状态徽标栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">// 当前状态:</span>
          {config === null ? (
            <span className="rounded bg-muted/60 px-2 py-0.5 font-mono text-xs text-muted-foreground">未配置</span>
          ) : isReady ? (
            <span className="inline-flex items-center gap-1.5 rounded bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              已启用 (READY)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded bg-amber-500/10 px-2.5 py-0.5 font-mono text-xs font-medium text-amber-600 dark:text-amber-400">
              <AlertCircle className="size-3.5" />
              待测试 (NEEDS_CHECK)
            </span>
          )}
        </div>

        {config && <div className="font-mono text-xs text-muted-foreground">版本 r{config.revision}</div>}
      </div>

      {/* 表单反馈区域 (aria-live) */}
      <div aria-live="polite" aria-atomic="true">
        {statusMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* 配置表单 */}
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* 协议选择 */}
        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            模型协议 (Protocol)
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup">
            {PROTOCOL_OPTIONS.map((opt) => {
              const isSelected = protocol === opt.value
              return (
                <label
                  key={opt.value}
                  className={`relative flex cursor-pointer flex-col items-start rounded-lg border p-3 text-left transition-all focus-within:ring-1 focus-within:ring-ring ${
                    isSelected
                      ? 'border-primary/80 bg-primary/5 text-foreground shadow-xs'
                      : 'border-border/60 bg-card/20 text-muted-foreground hover:border-foreground/30 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{opt.label}</span>
                    <input
                      type="radio"
                      name="ai-protocol"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => setProtocol(opt.value)}
                      className="size-3.5 accent-primary"
                    />
                  </div>
                  <span className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{opt.desc}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {/* Base URL */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="ai-base-url" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Base URL (服务地址前缀)
            </label>
          </div>
          <input
            id="ai-base-url"
            type="url"
            required
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="h-10 w-full rounded-md border border-border/80 bg-background px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <span className="text-xs text-muted-foreground">
            Base URL 将作为路径前缀。若中转服务提供的是 /v1/messages 或 /v1/chat/completions，需保留末尾的 /v1。
          </span>
        </div>

        {/* 模型 ID */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ai-model-id" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            模型 ID (Model ID)
          </label>
          <input
            id="ai-model-id"
            type="text"
            required
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="gpt-4o-mini 或 claude-3-5-haiku-latest"
            className="h-10 w-full rounded-md border border-border/80 bg-background px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* API Key 凭据 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="ai-api-key" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              API Key 凭据
            </label>
            {hasCredential && (
              <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                已配置凭据: {config?.credentialMask}
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              id="ai-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasCredential ? '留空表示保留现有凭据；输入将替换' : 'sk-...'}
              autoComplete="new-password"
              className="h-10 w-full rounded-md border border-border/80 bg-background pr-10 pl-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {hasCredential && (
              <button
                type="button"
                onClick={handleClearCredential}
                disabled={isClearing}
                title="清除已保存的凭据"
                aria-label="清除已保存的凭据"
                className="absolute right-2 text-muted-foreground transition-colors hover:text-red-500 focus-visible:outline-none disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {hasCredential
              ? '当前已安全存储加密凭据。如无变更请留空；点击垃圾桶可彻底清除。'
              : '凭据将在服务端通过 AES-256-GCM 随机盐加密持久化，接口与界面只展示脱敏掩码。'}
          </span>
        </div>

        {/* 底部操作按钮 */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-3">
            {/* 保存配置 (主操作) */}
            <button
              type="submit"
              disabled={isSaving || isChecking}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 font-mono text-xs font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存配置'
              )}
            </button>

            {/* 测试并启用 (次操作) */}
            <button
              type="button"
              onClick={handleCheckAndEnable}
              disabled={isSaving || isChecking || isDirty || !hasCredential}
              title={
                isDirty
                  ? '表单有未保存更改，需先保存'
                  : !hasCredential
                    ? '尚未配置凭据'
                    : '向模型发起连接测试，通过后启用'
              }
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 font-mono text-xs font-medium text-foreground shadow-xs transition-colors hover:border-foreground/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  测试连接中...
                </>
              ) : (
                '测试并启用'
              )}
            </button>
          </div>

          {isDirty && (
            <span className="font-mono text-xs text-amber-600 dark:text-amber-400">存在未保存修改，请先保存</span>
          )}
        </div>
      </form>
    </div>
  )
}
