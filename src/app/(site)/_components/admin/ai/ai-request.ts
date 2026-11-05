import type { ApiResponse } from '@/server/shared/response'
import { ApiRequestError } from '@/lib/api-error'

/** 读取 AI 管理接口的响应，保留状态码与可操作的错误码。 */
export async function aiRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/ai${path}`, {
    method,
    cache: 'no-store',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = (await response.json()) as ApiResponse<T> & { code?: string }
  if (!response.ok || !result.success || result.data === undefined) {
    throw new ApiRequestError(result.error || '请求失败，请稍后重试', response.status, result.code)
  }
  return result.data
}
