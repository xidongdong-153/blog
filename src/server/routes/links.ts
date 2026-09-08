import type { FriendApplyPayload } from '@/lib/email'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { revalidatePath } from 'next/cache'
import { sendFriendApplyEmail } from '@/lib/email'
import { db } from '@/server/infra/db/client'
import { friendLinks } from '@/server/infra/db/schema'

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

export const linksRoute = new Hono()
  // 访客提交友链互换申请
  .post('/apply', async (c) => {
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

    // 生成一次性审核令牌，有效期 7 天
    const reviewToken = crypto.randomUUID()
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const now = new Date()

    try {
      await db.insert(friendLinks).values({
        name: siteName,
        url: siteUrl,
        description,
        avatarUrl: avatarUrl || null,
        ownerName: nickname,
        email,
        hasAddedUs: hasAddedUs ? 1 : 0,
        status: 'pending',
        reviewToken,
        tokenExpiresAt,
        sortOrder: 0,
        isBroken: 0,
        createdAt: now,
        updatedAt: now,
      })
    } catch (err) {
      console.error('[FriendApply] 数据库写入失败:', err)
      return c.json({ success: false, error: '系统数据写入失败，请稍后重试' }, 500)
    }

    const payload: FriendApplyPayload = {
      nickname,
      siteName,
      siteUrl,
      email,
      avatarUrl: avatarUrl || undefined,
      description,
      hasAddedUs,
      reviewToken,
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

  // 查询待审核友链申请详情（供确认落地页展示）
  .get('/review', async (c) => {
    const token = c.req.query('token')
    if (!token || typeof token !== 'string') {
      return c.json({ success: false, error: '缺失审批凭证' }, 400)
    }

    try {
      const record = await db.query.friendLinks.findFirst({
        where: eq(friendLinks.reviewToken, token),
      })

      if (!record) {
        return c.json({ success: false, error: '该审批链接不存在或已被处理' }, 404)
      }

      if (record.tokenExpiresAt && record.tokenExpiresAt.getTime() < Date.now()) {
        return c.json({ success: false, error: '该审批链接已过期，请手动处理' }, 410)
      }

      return c.json({
        success: true,
        data: {
          id: record.id,
          siteName: record.name,
          siteUrl: record.url,
          description: record.description,
          avatarUrl: record.avatarUrl,
          nickname: record.ownerName,
          email: record.email,
          hasAddedUs: Boolean(record.hasAddedUs),
          status: record.status,
          createdAt: record.createdAt,
        },
      })
    } catch (err) {
      console.error('[FriendReview] 查询待审申请异常:', err)
      return c.json({ success: false, error: '查询申请信息失败' }, 500)
    }
  })

  // 站长提交审核操作（通过 / 拒绝）
  .post('/review', async (c) => {
    let body: { token?: string; action?: string }
    try {
      body = await c.req.json()
    } catch {
      return c.json({ success: false, error: '请求数据格式不正确' }, 400)
    }

    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const action = body.action === 'approve' || body.action === 'reject' ? body.action : ''

    if (!token) {
      return c.json({ success: false, error: '缺少审批令牌' }, 400)
    }

    if (!action) {
      return c.json({ success: false, error: '未知的审批操作' }, 400)
    }

    try {
      const record = await db.query.friendLinks.findFirst({
        where: eq(friendLinks.reviewToken, token),
      })

      if (!record) {
        return c.json({ success: false, error: '该申请已处理或令牌已失效' }, 404)
      }

      if (record.status !== 'pending') {
        return c.json({ success: false, error: `该申请处于「${record.status}」状态，不能重复审批` }, 400)
      }

      if (record.tokenExpiresAt && record.tokenExpiresAt.getTime() < Date.now()) {
        return c.json({ success: false, error: '该审批链接已过期' }, 410)
      }

      const now = new Date()

      if (action === 'approve') {
        await db
          .update(friendLinks)
          .set({
            status: 'approved',
            reviewToken: null,
            tokenExpiresAt: null,
            updatedAt: now,
          })
          .where(eq(friendLinks.id, record.id))

        // 触发前台友链路由静态缓存重新验证
        try {
          revalidatePath('/links')
        } catch {
          // 容错处理
        }

        return c.json({
          success: true,
          message: `已成功通过「${record.name}」的友链申请，该站点已在前台展示`,
        })
      }

      // action === 'reject'
      await db
        .update(friendLinks)
        .set({
          status: 'rejected',
          reviewToken: null,
          tokenExpiresAt: null,
          updatedAt: now,
        })
        .where(eq(friendLinks.id, record.id))

      return c.json({
        success: true,
        message: `已将「${record.name}」的友链申请标记为婉拒`,
      })
    } catch (err) {
      console.error('[FriendReview] 审批处理失败:', err)
      return c.json({ success: false, error: '执行审批失败，请重试' }, 500)
    }
  })
