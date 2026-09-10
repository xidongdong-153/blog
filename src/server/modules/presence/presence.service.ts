import type { PublicPresence } from '@/lib/presence'
import { createOfflinePresence, parsePublicPresence } from '@/lib/presence'

const DEFAULT_SOURCE_URL = 'http://127.0.0.1:4401/api/presence'
const DATA_TIMEOUT_MS = 1_500
const HEALTH_TIMEOUT_MS = 800

function getSourceUrl(): string {
  const value = process.env.PRESENCE_SOURCE_URL?.trim() || DEFAULT_SOURCE_URL
  const url = new URL(value)
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
    throw new Error('PRESENCE_SOURCE_URL 必须是 HTTP(S) 地址，不能包含账号或密码')
  }
  return url.toString()
}

/**
 * 获取公开活动数据。
 * 超时 1500ms，上游不可用或数据不合法时优雅降级返回离线对象，不抛出异常。
 */
export async function getPublicPresenceData(options?: {
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
}): Promise<PublicPresence> {
  const controller = new AbortController()
  const timeoutMs = options?.timeoutMs ?? DATA_TIMEOUT_MS
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const customFetch = options?.fetch ?? fetch

  let presence = createOfflinePresence()

  try {
    const response = await customFetch(getSourceUrl(), {
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      return presence
    }

    const data = (await response.json()) as unknown
    const parsed = parsePublicPresence(data)
    if (parsed) {
      presence = parsed
    }
  } catch {
    // 异常情况下安全返回默认离线数据
  } finally {
    clearTimeout(timer)
  }

  return presence
}

export interface PresenceHealthResult {
  status: 'online' | 'standby'
  label: string
}

/**
 * 探测活动数据源服务健康状态（供状态页使用）。
 * 超时 800ms，仅探测 HTTP 服务是否正常响应，不强校验活动内容结构。
 */
export async function checkPresenceHealth(options?: {
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
}): Promise<PresenceHealthResult> {
  const controller = new AbortController()
  const timeoutMs = options?.timeoutMs ?? HEALTH_TIMEOUT_MS
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const customFetch = options?.fetch ?? fetch

  try {
    const res = await customFetch(getSourceUrl(), {
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (res.ok) {
      return { status: 'online', label: '活跃运行中' }
    }
    return { status: 'standby', label: '待机离线' }
  } catch {
    clearTimeout(timer)
    return { status: 'standby', label: '待机离线' }
  }
}
