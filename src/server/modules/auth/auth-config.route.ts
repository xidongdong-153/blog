import { Hono } from 'hono'
import { createSuccessResponse } from '@/server/shared/response'
import { getPublicAuthConfig } from './auth.service'

export const authConfigRoute = new Hono().get('/auth', async (c) => {
  const config = await getPublicAuthConfig(c.req.raw.headers)
  return c.json(createSuccessResponse(config))
})
