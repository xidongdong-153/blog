import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { SummaryProtocol } from '@/server/infra/ai/summary-model'
import { Hono } from 'hono'
import { getSession, isSiteAdmin } from '@/server/auth/session'
import { SummaryModelError } from '@/server/infra/ai/summary-model'
import {
  AiSummaryConfigError,
  checkAndEnableAiSummaryConfig,
  clearAiSummaryCredential,
  getAiSummaryConfig,
  getAvailableSummaryModels,
  saveAiSummaryConfig,
} from '@/server/services/ai-summary-config'
import { createFailureResponse, createSuccessResponse } from '@/server/shared/response'

export const aiRoute = new Hono()

/**
 * 统一异常处理，避免泄露内部调用堆栈或上游原始明文
 */
function handleAiRouteError(c: Context, err: unknown) {
  if (err instanceof AiSummaryConfigError || err instanceof SummaryModelError) {
    return c.json(createFailureResponse(err.message), err.statusCode as ContentfulStatusCode)
  }

  return c.json(createFailureResponse('AI 模块处理请求时发生未知错误'), 500)
}

/**
 * 校验请求是否为站长身份
 */
async function requireAdminAuth(c: Context) {
  const session = await getSession(c.req.raw.headers)
  if (!session?.user?.id) {
    return { ok: false as const, response: c.json(createFailureResponse('请先登录后再进行操作'), 401) }
  }

  if (!isSiteAdmin(session.user.email)) {
    return { ok: false as const, response: c.json(createFailureResponse('无权进行此操作，仅站长可访问'), 403) }
  }

  return { ok: true as const, session }
}

/**
 * GET /api/ai/summary-config
 * 站长读取当前 AI 摘要配置与凭据掩码
 */
aiRoute.get('/summary-config', async (c) => {
  const auth = await requireAdminAuth(c)
  if (!auth.ok) {
    return auth.response
  }

  try {
    const config = await getAiSummaryConfig()
    return c.json(createSuccessResponse(config))
  } catch (err) {
    return handleAiRouteError(c, err)
  }
})

/**
 * PUT /api/ai/summary-config
 * 站长保存 AI 摘要配置，更新凭据或保留原有凭据
 */
aiRoute.put('/summary-config', async (c) => {
  const auth = await requireAdminAuth(c)
  if (!auth.ok) {
    return auth.response
  }

  try {
    const body = await c.req.json().catch(() => ({}))
    const { protocol, baseUrl, modelId, apiKey } = body ?? {}

    if (!protocol || typeof protocol !== 'string') {
      return c.json(createFailureResponse('缺少协议 protocol 参数'), 400)
    }

    if (!baseUrl || typeof baseUrl !== 'string') {
      return c.json(createFailureResponse('缺少 Base URL 参数'), 400)
    }

    if (!modelId || typeof modelId !== 'string') {
      return c.json(createFailureResponse('缺少模型 ID 参数'), 400)
    }

    const saved = await saveAiSummaryConfig({
      protocol: protocol as SummaryProtocol,
      baseUrl,
      modelId,
      apiKey: typeof apiKey === 'string' ? apiKey : undefined,
    })

    return c.json(createSuccessResponse(saved))
  } catch (err) {
    return handleAiRouteError(c, err)
  }
})

/**
 * POST /api/ai/summary-config/check
 * 测试当前配置连通性，成功后更新为 ready 状态
 */
aiRoute.post('/summary-config/check', async (c) => {
  const auth = await requireAdminAuth(c)
  if (!auth.ok) {
    return auth.response
  }

  try {
    const enabled = await checkAndEnableAiSummaryConfig()
    return c.json(createSuccessResponse(enabled))
  } catch (err) {
    return handleAiRouteError(c, err)
  }
})

/**
 * DELETE /api/ai/summary-config/credential
 * 显式清除当前配置的 API Key 凭据
 */
aiRoute.delete('/summary-config/credential', async (c) => {
  const auth = await requireAdminAuth(c)
  if (!auth.ok) {
    return auth.response
  }

  try {
    const cleared = await clearAiSummaryCredential()
    return c.json(createSuccessResponse(cleared))
  } catch (err) {
    return handleAiRouteError(c, err)
  }
})

/**
 * POST /api/ai/summary-config/models
 * 站长拉取当前 Base URL 下可用的模型列表
 */
aiRoute.post('/summary-config/models', async (c) => {
  const auth = await requireAdminAuth(c)
  if (!auth.ok) {
    return auth.response
  }

  try {
    const body = await c.req.json().catch(() => ({}))
    const { baseUrl, apiKey } = body ?? {}

    const models = await getAvailableSummaryModels({
      baseUrl: typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim() : undefined,
      apiKey: typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : undefined,
    })

    return c.json(createSuccessResponse(models))
  } catch (err) {
    return handleAiRouteError(c, err)
  }
})
