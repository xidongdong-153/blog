import { createOfflinePresence, parsePublicPresence } from '@/lib/presence'

export const dynamic = 'force-dynamic'

const DEFAULT_SOURCE_URL = 'http://127.0.0.1:4401/api/presence'
const REQUEST_TIMEOUT_MS = 1_500

function sourceUrl(): string {
  const value = process.env.PRESENCE_SOURCE_URL?.trim() || DEFAULT_SOURCE_URL
  const url = new URL(value)
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
    throw new Error('PRESENCE_SOURCE_URL 必须是 HTTP(S) 地址，不能包含账号或密码')
  }
  return url.toString()
}

export async function GET() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let presence = createOfflinePresence()

  try {
    const response = await fetch(sourceUrl(), {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`活动服务返回 HTTP ${response.status}`)
    const parsed = parsePublicPresence((await response.json()) as unknown)
    if (parsed) presence = parsed
  } catch {
    // 上游不可用时返回固定离线响应，页面不等待或暴露内部错误。
  } finally {
    clearTimeout(timeoutId)
  }

  const response = Response.json(presence)
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  return response
}
