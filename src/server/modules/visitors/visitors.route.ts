import type { Context } from 'hono'
import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { getBlogPost } from '@/lib/content'
import { VISITOR_COOKIE_MAX_AGE_SECONDS, VISITOR_COOKIE_NAME } from '@/lib/visitor'
import { visitorsService } from './visitors.service'
import { VisitorsServiceError } from './visitors.types'

export const visitorsRoute = new Hono()

const bootstrapRateLimitMap = new Map<string, number[]>()
const BOOTSTRAP_LIMIT_WINDOW = 60 * 1000 // 1 分钟
const MAX_BOOTSTRAP_PER_WINDOW = 30
const MAX_BOOTSTRAP_MAP_SIZE = 2000

export function isBootstrapRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = bootstrapRateLimitMap.get(ip) || []
  const recent = timestamps.filter((t) => now - t < BOOTSTRAP_LIMIT_WINDOW)
  if (recent.length >= MAX_BOOTSTRAP_PER_WINDOW) {
    return true
  }

  recent.push(now)
  bootstrapRateLimitMap.set(ip, recent)

  if (bootstrapRateLimitMap.size > MAX_BOOTSTRAP_MAP_SIZE) {
    for (const [key, list] of bootstrapRateLimitMap.entries()) {
      if (list.every((t) => now - t >= BOOTSTRAP_LIMIT_WINDOW)) {
        bootstrapRateLimitMap.delete(key)
      }
    }
  }
  return false
}

export function resetBootstrapRateLimitMap(): void {
  bootstrapRateLimitMap.clear()
}

function handleVisitorsError(c: Context, err: unknown) {
  if (err instanceof VisitorsServiceError) {
    return c.json({ error: err.message }, err.statusCode)
  }
  console.error('[VisitorsRoute] 未捕获异常:', err)
  return c.json({ error: '服务暂不可用' }, 500)
}

// 访客初始化：校验或生成匿名访客 Cookie 并持久化登记
visitorsRoute.post('/bootstrap', async (c) => {
  c.header('Cache-Control', 'no-store, max-age=0')

  const forwarded = c.req.header('x-forwarded-for')
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
  if (isBootstrapRateLimited(clientIp)) {
    return c.json({ error: '请求过于频繁，请稍后重试' }, 429)
  }

  const cookieVisitorId = getCookie(c, VISITOR_COOKIE_NAME)

  try {
    const { visitorId, isNew, response } = await visitorsService.bootstrapVisitor(cookieVisitorId)

    const isHttps = c.req.header('x-forwarded-proto') === 'https' || c.req.url.startsWith('https://')

    if (isNew || !cookieVisitorId) {
      setCookie(c, VISITOR_COOKIE_NAME, visitorId, {
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: VISITOR_COOKIE_MAX_AGE_SECONDS,
        secure: isHttps,
      })
    }

    return c.json(response)
  } catch (err) {
    return handleVisitorsError(c, err)
  }
})

// 公开只读统计查询（用于无 WebSocket 环境、运维诊断及单篇查询）
visitorsRoute.get('/stats', async (c) => {
  c.header('Cache-Control', 'no-store, max-age=0')
  const slug = c.req.query('slug')

  if (slug) {
    const post = getBlogPost(slug)
    if (!post) {
      return c.json({ error: '文章不存在' }, 400)
    }
  }

  try {
    const stats = await visitorsService.getStats(slug)
    return c.json(stats)
  } catch (err) {
    return handleVisitorsError(c, err)
  }
})

// 普通 HTTP 请求访问 WebSocket 路径返回 426
visitorsRoute.get('/socket', (c) => {
  c.header('Cache-Control', 'no-store, max-age=0')
  c.header('Connection', 'Upgrade')
  c.header('Upgrade', 'websocket')
  return c.text('Upgrade Required', 426)
})
