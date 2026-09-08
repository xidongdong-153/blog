import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../infra/db/client'
import { createFailureResponse, createSuccessResponse } from '../shared/response'

export const systemRoute = new Hono()
  .get('/health', (c) => {
    return c.json(
      createSuccessResponse({
        status: 'ok',
        uptime: process.uptime(),
      }),
    )
  })
  .get('/db-check', async (c) => {
    const start = Date.now()
    try {
      const result = await db.run(sql`SELECT 1 as ping`)
      const latencyMs = Date.now() - start
      return c.json(
        createSuccessResponse({
          status: 'connected',
          latencyMs,
          provider: process.env.TURSO_DATABASE_URL ? 'turso' : 'local-sqlite',
          result,
        }),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error'
      return c.json(createFailureResponse(`Database check failed (${Date.now() - start}ms): ${message}`), 500)
    }
  })
