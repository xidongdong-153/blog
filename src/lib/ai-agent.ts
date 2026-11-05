import type { UIDataTypes, UIMessage } from 'ai'
import type { GeneratedPostDraft } from './post-draft'
import { z } from 'zod'

export const AI_AGENT_ID = 'writer' as const
export const AI_TOOL_IDS = ['article-summary', 'post-draft'] as const
export const MAX_AI_REQUEST_BYTES = 512 * 1024
export const MAX_AI_MESSAGES = 40
export const MAX_AI_MESSAGE_LENGTH = 32_000
export const MAX_AI_SYSTEM_PROMPT_LENGTH = 12_000
export const AI_RUN_TIMEOUT_MS = 180_000
export const AI_MAX_STEPS = 4
export const AI_MAX_TOOL_CALLS = 2

export const aiToolIdSchema = z.enum(AI_TOOL_IDS)
export type AiToolId = z.infer<typeof aiToolIdSchema>

export const aiAgentConfigInputSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    modelConfigId: z.literal('default'),
    systemPrompt: z
      .string()
      .trim()
      .min(1, '请输入写作提示词')
      .max(MAX_AI_SYSTEM_PROMPT_LENGTH, '提示词不能超过 12000 字符'),
    toolIds: z
      .array(aiToolIdSchema)
      .max(AI_TOOL_IDS.length)
      .refine((ids) => new Set(ids).size === ids.length, 'Tool 不能重复'),
  })
  .strict()

export type AiAgentConfigInput = z.infer<typeof aiAgentConfigInputSchema>

export interface AiAgentDto {
  id: typeof AI_AGENT_ID
  name: string
  description: string
  avatar: string
  modelConfigId: 'default'
  systemPrompt: string
  toolIds: AiToolId[]
  revision: number
  updatedAt: string | null
}

export interface AiToolDto {
  id: AiToolId
  name: string
  description: string
  inputDescription: string
  outputDescription: string
}

export interface AiRunMetadata {
  runId: string
  modelId: string
  modelRevision: number
  agentRevision: number
}

export type AiAgentTools = Record<'article-summary', { input: { content: string }; output: { summary: string } }> &
  Record<'post-draft', { input: { overview: string }; output: { draft: GeneratedPostDraft } }>

export type AiAgentMessage = UIMessage<AiRunMetadata, UIDataTypes, AiAgentTools>

/** 只允许已知 AI 错误码触发模型配置入口，不依赖提示文案。 */
export function isAiModelError(code: string | undefined): boolean {
  return code === 'AI_MODEL_NOT_READY' || code === 'AI_MODEL_CONFIG_INVALID' || code === 'AI_TOOL_UNSUPPORTED'
}
