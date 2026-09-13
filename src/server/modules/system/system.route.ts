import { Hono } from 'hono'
import { createFailureResponse, createSuccessResponse } from '@/server/shared/response'
import { checkDatabase, getSystemProcessHealth } from './system.service'

export const systemRoute = new Hono()
  .get('/health', (c) => {
    const health = getSystemProcessHealth()
    return c.json(
      createSuccessResponse({
        status: health.status,
        uptime: health.uptime,
      }),
    )
  })
  .get('/db-check', async (c) => {
    const result = await checkDatabase()
    if (result.status === 'connected') {
      return c.json(
        createSuccessResponse({
          status: result.status,
          latencyMs: result.latencyMs,
        }),
      )
    }

    console.error(`[System/db-check] 数据库检查失败 (${result.latencyMs}ms):`, result.message)
    return c.json(createFailureResponse('数据库连通性异常'), 503)
  })
