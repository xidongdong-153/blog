import type { AppDatabase } from '@/server/infra/db/client'
import type { AuthSession } from '@/server/modules/auth/auth.service'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { MAX_AI_REQUEST_BYTES } from '@/lib/ai-agent'
import { getSession, isSiteAdmin } from '@/server/modules/auth/auth.service'
import { createFailureResponse, createSuccessResponse } from '@/server/shared/response'
import { AiAgentServiceError } from './agents.errors'
import { chatWithWriterAgent, getAiAgents, saveWriterAgent } from './agents.service'
import { getAiTools } from './tools.registry'

export function createAgentsRoute(
  options: {
    database?: AppDatabase
    session?: (headers: Headers) => Promise<AuthSession | null>
  } = {},
) {
  const route = new Hono()
  route.use('*', async (c, next) => {
    c.header('Cache-Control', 'private, no-store, max-age=0')
    c.header('X-Robots-Tag', 'noindex, nofollow')
    const session = await (options.session ?? getSession)(c.req.raw.headers)
    if (!session?.user?.id) return c.json(createFailureResponse('请先登录', undefined, 'AI_AUTH_REQUIRED'), 401)
    if (!isSiteAdmin(session.user))
      return c.json(createFailureResponse('仅站长可使用 AI', undefined, 'AI_FORBIDDEN'), 403)
    if (!['GET', 'HEAD'].includes(c.req.method)) {
      const expectedOrigin = new URL(process.env.BETTER_AUTH_URL || c.req.url).origin
      const origin = c.req.header('Origin')
      if ((origin && origin !== expectedOrigin) || c.req.header('Sec-Fetch-Site') === 'cross-site')
        return c.json(createFailureResponse('请求来源不受支持', undefined, 'AI_ORIGIN_REJECTED'), 403)
    }
    await next()
  })
  route.use(
    '*',
    bodyLimit({
      maxSize: MAX_AI_REQUEST_BYTES,
      onError: (c) => c.json(createFailureResponse('对话内容过大，请新建对话', undefined, 'AI_REQUEST_TOO_LARGE'), 413),
    }),
  )
  route.onError((error, c) => {
    if (error instanceof AiAgentServiceError)
      return c.json(createFailureResponse(error.message, undefined, error.code), error.statusCode)
    if (error instanceof SyntaxError)
      return c.json(createFailureResponse('请求格式无效', undefined, 'AI_INVALID_REQUEST'), 400)
    return c.json(createFailureResponse('AI 操作失败，请稍后重试', undefined, 'AI_INTERNAL_ERROR'), 500)
  })
  route.get('/agents', async (c) => c.json(createSuccessResponse(await getAiAgents(options.database))))
  route.put('/agents/writer', async (c) => {
    const saved = await saveWriterAgent(await c.req.json(), options.database)
    return c.json(createSuccessResponse(saved))
  })
  route.get('/tools', (c) => c.json(createSuccessResponse(getAiTools())))
  route.post('/agents/writer/chat', async (c) => {
    const body: unknown = await c.req.json()
    if (!body || typeof body !== 'object' || !('messages' in body))
      throw new AiAgentServiceError('AI_INVALID_REQUEST', '请提供对话消息')
    return chatWithWriterAgent(body.messages, { database: options.database, signal: c.req.raw.signal })
  })
  route.all('/agents/*', (c) => c.json(createFailureResponse('Agent 不存在', undefined, 'AI_AGENT_NOT_FOUND'), 404))
  return route
}

export const agentsRoute = createAgentsRoute()
