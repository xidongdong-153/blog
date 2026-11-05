import { classifyAiError } from '@/server/infra/ai/summary-model'
import { PostDraftServiceError } from '@/server/modules/posts/posts-draft.service'

export class AiAgentServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: 400 | 401 | 403 | 408 | 409 | 413 | 500 | 502 | 503 | 504 = 400,
  ) {
    super(message)
    this.name = 'AiAgentServiceError'
  }
}

export function safeAgentError(error: unknown): AiAgentServiceError {
  if (error instanceof AiAgentServiceError) return error
  if (error instanceof PostDraftServiceError)
    return new AiAgentServiceError(error.code, error.message, error.statusCode)
  const classified = classifyAiError(error)
  if (classified.code === 'UPSTREAM_TIMEOUT')
    return new AiAgentServiceError('AI_RUN_TIMEOUT', 'AI 运行超时，请缩短内容后重试', 504)
  if (classified.code === 'REQUEST_ABORTED') return new AiAgentServiceError('AI_RUN_CANCELLED', 'AI 运行已停止', 408)
  if (classified.code === 'AUTH_FAILED' || classified.code === 'CONFIG_INVALID')
    return new AiAgentServiceError('AI_MODEL_CONFIG_INVALID', 'AI 模型配置不可用，请检查模型与 API Key', 400)
  if (
    classified.statusCode === 400 ||
    classified.statusCode === 422 ||
    (error instanceof Error && /UnsupportedFunctionality|ToolChoiceViolation|NoSuchTool/.test(error.name))
  ) {
    return new AiAgentServiceError('AI_TOOL_UNSUPPORTED', '当前模型无法完成 Tool 调用，请检查模型能力与协议', 400)
  }
  if (classified.code === 'UPSTREAM_UNAVAILABLE')
    return new AiAgentServiceError('AI_UPSTREAM_UNAVAILABLE', '无法连接 AI 模型，请稍后重试', 503)
  return new AiAgentServiceError('AI_GENERATION_FAILED', 'AI 生成失败，请稍后重试或检查模型配置', 502)
}

export function agentErrorText(error: unknown): string {
  const safe = safeAgentError(error)
  return JSON.stringify({ code: safe.code, message: safe.message })
}
