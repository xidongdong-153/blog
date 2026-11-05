import type { ReadySummaryConfig } from './summary-config.service'
import type { AiToolDto, AiToolId } from '@/lib/ai-agent'
import type { AppDatabase } from '@/server/infra/db/client'
import { tool, zodSchema } from 'ai'
import { z } from 'zod'
import { AI_MAX_TOOL_CALLS, MAX_AI_MESSAGE_LENGTH } from '@/lib/ai-agent'
import { postDraftRequestSchema } from '@/lib/post-draft'
import { generatePostDraft } from '@/server/modules/posts/posts-draft.service'
import { AiAgentServiceError, safeAgentError } from './agents.errors'
import { generateSummaryText } from './summary.service'

const TOOLS: AiToolDto[] = [
  {
    id: 'article-summary',
    name: '文章摘要',
    description: '生成纯文本摘要，保留文章的核心信息',
    inputDescription: '完整正文，最多 32000 字符',
    outputDescription: '80 至 260 字的纯文本摘要，不写入文章缓存',
  },
  {
    id: 'post-draft',
    name: '文章初稿',
    description: '根据内容概述生成可继续编辑的文章初稿',
    inputDescription: '内容概述，最多 4000 字符',
    outputDescription: '标题、简介、分类、标签、正文与主题色；需手动保存',
  },
]

export const summaryToolInputSchema = z
  .object({
    content: z.string().trim().min(1, '请提供需要摘要的正文').max(MAX_AI_MESSAGE_LENGTH),
  })
  .strict()

export function getAiTools(): AiToolDto[] {
  return TOOLS.map((item) => ({ ...item }))
}

export function createWriterTools(options: {
  config: ReadySummaryConfig
  database: AppDatabase
  enabledToolIds: AiToolId[]
  signal: AbortSignal
}) {
  let calls = 0
  function beforeTool(id: AiToolId, toolSignal?: AbortSignal) {
    const signal = toolSignal ? AbortSignal.any([options.signal, toolSignal]) : options.signal
    signal.throwIfAborted()
    if (!options.enabledToolIds.includes(id)) throw new AiAgentServiceError('AI_TOOL_DISABLED', '此 Tool 已停用')
    if (calls >= AI_MAX_TOOL_CALLS)
      throw new AiAgentServiceError('AI_TOOL_LIMIT', '本轮 Tool 调用已达上限，请开启下一轮对话')
    calls++
    return signal
  }
  return {
    'article-summary': tool({
      description: '根据完整文章正文生成准确的中文纯文本摘要。不会保存文章或修改公开摘要。',
      inputSchema: zodSchema(summaryToolInputSchema),
      execute: async ({ content }, { abortSignal }) => {
        const signal = beforeTool('article-summary', abortSignal)
        try {
          const summary = await generateSummaryText(content, options.config, { signal })
          signal.throwIfAborted()
          return { summary }
        } catch (error) {
          throw safeAgentError(error)
        }
      },
    }),
    'post-draft': tool({
      description: '根据内容概述及写作要求生成完整文章初稿。返回结构化成稿供用户检查，不保存或发布。',
      inputSchema: zodSchema(postDraftRequestSchema),
      execute: async ({ overview }, { abortSignal }) => {
        const signal = beforeTool('post-draft', abortSignal)
        try {
          const draft = await generatePostDraft(
            { overview },
            { database: options.database, signal, config: options.config },
          )
          signal.throwIfAborted()
          return { draft }
        } catch (error) {
          throw safeAgentError(error)
        }
      },
    }),
  }
}
