import type { FriendApplyPayload } from '@/lib/email'
import { Hono } from 'hono'
import { sendFriendApplyEmail } from '@/lib/email'

/**
 * 内存简易频控记录：IP -> [时间戳列表]
 */
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 10 * 60 * 1000 // 10 分钟
const MAX_REQUESTS_PER_WINDOW = 3

/**
 * 检查 IP 频控是否超限
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) || []
  const recentTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW)

  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return true
  }

  recentTimestamps.push(now)
  rateLimitMap.set(ip, recentTimestamps)

  // 定期清理过期的键，防止内存泄漏
  if (rateLimitMap.size > 2000) {
    for (const [key, list] of rateLimitMap.entries()) {
      if (list.every((t) => now - t >= RATE_LIMIT_WINDOW)) {
        rateLimitMap.delete(key)
      }
    }
  }

  return false
}

/**
 * 验证 URL 是否合法
 */
function isValidUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 验证邮箱基础格式
 */
function isValidEmail(emailStr: string): boolean {
  return /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(emailStr)
}

export const linksRoute = new Hono().post('/apply', async (c) => {
  // 获取客户端标识
  const forwardedFor = c.req.header('x-forwarded-for')
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1'

  if (isRateLimited(clientIp)) {
    return c.json({ success: false, error: '发送过于频繁，请等待几分钟后再试' }, 429)
  }

  let body: Partial<FriendApplyPayload>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: '请求数据格式不正确' }, 400)
  }

  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : ''
  const siteName = typeof body.siteName === 'string' ? body.siteName.trim() : ''
  const siteUrl = typeof body.siteUrl === 'string' ? body.siteUrl.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const hasAddedUs = Boolean(body.hasAddedUs)

  // 校验必填项与长度
  if (!nickname || nickname.length > 32) {
    return c.json({ success: false, error: '请填写你的称呼（32 字以内）' }, 400)
  }

  if (!siteName || siteName.length > 50) {
    return c.json({ success: false, error: '请填写站点名称（50 字以内）' }, 400)
  }

  if (!siteUrl || !isValidUrl(siteUrl) || siteUrl.length > 200) {
    return c.json({ success: false, error: '请填写有效的站点网址（需以 http:// 或 https:// 开头）' }, 400)
  }

  if (!email || !isValidEmail(email) || email.length > 100) {
    return c.json({ success: false, error: '请填写有效的联系邮箱' }, 400)
  }

  if (avatarUrl && (!isValidUrl(avatarUrl) || avatarUrl.length > 300)) {
    return c.json({ success: false, error: '头像链接格式不正确' }, 400)
  }

  if (!description || description.length > 150) {
    return c.json({ success: false, error: '请填写站点简介（150 字以内）' }, 400)
  }

  const payload: FriendApplyPayload = {
    nickname,
    siteName,
    siteUrl,
    email,
    avatarUrl: avatarUrl || undefined,
    description,
    hasAddedUs,
  }

  const result = await sendFriendApplyEmail(payload)

  if (!result.success) {
    return c.json({ success: false, error: result.error || '邮件投递失败，请稍后再试' }, 500)
  }

  return c.json({
    success: true,
    message: result.mocked ? '申请已模拟记录（开发模式）' : '申请已送达',
  })
})
