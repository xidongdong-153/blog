import type { ApiResponse } from '@/server/shared/response'

export async function postRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/admin/posts${path}`, {
    method,
    cache: 'no-store',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = (await response.json()) as ApiResponse<T>
  if (!response.ok || !result.success || result.data === undefined)
    throw new Error(result.error || '请求失败，请稍后重试')
  return result.data
}
