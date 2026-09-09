import { Hono } from 'hono'
import { auth } from '@/server/auth/config'

export const authRoute = new Hono()

// 将 /api/auth/* 的所有请求转交给 Better Auth Web Standard Handler
authRoute.all('/*', (c) => auth.handler(c.req.raw))
