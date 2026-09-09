import { Hono } from 'hono'
import { getSession, isSiteAdmin } from '@/server/auth/session'
import { createSuccessResponse } from '@/server/shared/response'

export const configRoute = new Hono().get('/auth', async (c) => {
  const session = await getSession(c.req.raw.headers)
  const isOwner = isSiteAdmin(session?.user?.email)

  return c.json(
    createSuccessResponse({
      providers: {
        github: Boolean(process.env.GITHUB_CLIENT_ID?.trim() && process.env.GITHUB_CLIENT_SECRET?.trim()),
        google: Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()),
      },
      isOwner,
    }),
  )
})
