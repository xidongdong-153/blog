import type { AiAgentMessage } from '@/lib/ai-agent'
import { z } from 'zod'
import { AI_TOOL_IDS, MAX_AI_MESSAGE_LENGTH, MAX_AI_MESSAGES } from '@/lib/ai-agent'
import { generatedPostDraftSchema, postDraftRequestSchema } from '@/lib/post-draft'
import { AiAgentServiceError } from './agents.errors'
import { summaryToolInputSchema } from './tools.registry'

const partSchema = z.object({ type: z.string().max(100) }).passthrough()
const messageSchema = z.object({
  id: z.string().min(1).max(200),
  role: z.enum(['user', 'assistant']),
  parts: z.array(partSchema).max(100),
})
const messagesSchema = z.array(messageSchema).min(1).max(MAX_AI_MESSAGES)
const textSchema = z.string().max(MAX_AI_MESSAGE_LENGTH)
const toolPartSchema = z.object({
  toolCallId: z.string().min(1).max(200),
  state: z.enum(['input-streaming', 'input-available', 'output-available', 'output-error']),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  errorText: z.string().max(2000).optional(),
})

export function parseAgentMessages(input: unknown): AiAgentMessage[] {
  const parsed = messagesSchema.safeParse(input)
  if (!parsed.success)
    throw new AiAgentServiceError('AI_INVALID_MESSAGES', '对话格式无效，或已超出 40 条消息，请新建对话')
  const ids = new Set<string>()
  const calls = new Set<string>()
  try {
    if (parsed.data.at(-1)?.role !== 'user') throw new Error('missing user prompt')
    const history = parsed.data.filter((message) => message.role !== 'assistant' || message.parts.length > 0)
    const messages = history.map((message): AiAgentMessage => {
      if (ids.has(message.id)) throw new Error('duplicate message')
      ids.add(message.id)
      const parts: AiAgentMessage['parts'] = []
      for (const part of message.parts) {
        if (part.type === 'text') {
          parts.push({ type: 'text', text: textSchema.parse(part.text) })
          continue
        }
        if (message.role !== 'assistant') throw new Error('invalid user part')
        if (part.type === 'step-start') {
          parts.push({ type: 'step-start' })
          continue
        }
        const id = AI_TOOL_IDS.find((toolId) => part.type === `tool-${toolId}`)
        if (!id) throw new Error('unknown tool')
        const toolPart = toolPartSchema.parse(part)
        if (calls.has(toolPart.toolCallId)) throw new Error('duplicate tool call')
        calls.add(toolPart.toolCallId)
        if (toolPart.state === 'input-streaming' || toolPart.state === 'input-available') {
          parts.push({ type: 'text', text: '上轮 Tool 调用未完成。' })
          continue
        }
        const toolInput =
          id === 'article-summary'
            ? summaryToolInputSchema.parse(toolPart.input)
            : postDraftRequestSchema.parse(toolPart.input)
        if (toolPart.state === 'output-error') {
          parts.push({ type: 'text', text: '上轮 Tool 调用失败，未产生可用结果。' })
          continue
        }
        if (id === 'article-summary') {
          parts.push({
            type: 'tool-article-summary',
            toolCallId: toolPart.toolCallId,
            state: 'output-available',
            input: summaryToolInputSchema.parse(toolInput),
            output: z
              .object({ summary: z.string().min(1).max(260) })
              .strict()
              .parse(toolPart.output),
          })
        } else {
          parts.push({
            type: 'tool-post-draft',
            toolCallId: toolPart.toolCallId,
            state: 'output-available',
            input: postDraftRequestSchema.parse(toolInput),
            output: z.object({ draft: generatedPostDraftSchema }).strict().parse(toolPart.output),
          })
        }
      }
      if (!parts.length) throw new Error('empty message')
      return { id: message.id, role: message.role, parts }
    })
    const last = messages.at(-1)
    if (last?.role !== 'user' || !last.parts.some((part) => part.type === 'text' && part.text.trim()))
      throw new Error('missing user prompt')
    return messages
  } catch {
    throw new AiAgentServiceError('AI_INVALID_MESSAGES', '对话包含不支持的角色、内容或 Tool 结果，请新建对话')
  }
}
