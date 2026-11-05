import type { ApiResponse } from '@/server/shared/response'
import { ApiRequestError } from '@/lib/api-error'

export async function postRequest<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/admin/posts${path}`, {
    method,
    signal,
    cache: 'no-store',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = (await response.json()) as ApiResponse<T>
  if (!response.ok || !result.success || result.data === undefined)
    throw new ApiRequestError(result.error || '请求失败，请稍后重试', response.status, result.code)
  return result.data
}
