import { ApiRequestError } from '@/lib/api-error'

/** 解析普通 HTTP 错误和 SDK 流中的安全错误消息。 */
export function getAiChatError(error: Error | string): { message: string; code?: string } {
  const message = typeof error === 'string' ? error : error.message
  try {
    const parsed: unknown = JSON.parse(message)
    if (parsed && typeof parsed === 'object' && 'message' in parsed && typeof parsed.message === 'string') {
      return {
        message: parsed.message,
        code: 'code' in parsed && typeof parsed.code === 'string' ? parsed.code : undefined,
      }
    }
  } catch {
    // 普通错误消息直接显示，不要求流外错误使用 JSON。
  }
  return { message, code: error instanceof ApiRequestError ? error.code : undefined }
}

/** 保留官方 SDK 的流处理，仅将 HTTP 错误转换为管理端错误。 */
export const fetchAiChat: typeof fetch = async (input, init) => {
  const response = await fetch(input, init)
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
      throw new ApiRequestError(
        payload.error,
        response.status,
        'code' in payload && typeof payload.code === 'string' ? payload.code : undefined,
      )
    }
    throw new ApiRequestError('对话请求失败，请稍后重试', response.status)
  }
  return response
}
