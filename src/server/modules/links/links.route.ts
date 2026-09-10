import type { Context } from 'hono'
import type { ApplyFriendLinkInput } from './links.types'
import { Hono } from 'hono'
import { revalidatePath } from 'next/cache'
import { isRateLimited } from './links.rate-limit'
import { applyFriendLink, getFriendReviewDetail, LinksServiceError, reviewFriendLink } from './links.service'

export const linksRoute = new Hono()

function handleLinksError(c: Context, err: unknown) {
  if (err instanceof LinksServiceError) {
    return c.json({ success: false, error: err.message }, err.statusCode)
  }
  console.error('[LinksRoute] 未捕获异常:', err)
  return c.json({ success: false, error: '服务器内部错误' }, 500)
}

// 访客提交友链互换申请
linksRoute.post('/apply', async (c) => {
  // 获取客户端标识进行频控
  const forwardedFor = c.req.header('x-forwarded-for')
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1'

  if (isRateLimited(clientIp)) {
    return c.json({ success: false, error: '发送过于频繁，请等待几分钟后再试' }, 429)
  }

  let body: Partial<ApplyFriendLinkInput>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: '请求数据格式不正确' }, 400)
  }

  try {
    const result = await applyFriendLink({
      nickname: body.nickname as string,
      siteName: body.siteName as string,
      siteUrl: body.siteUrl as string,
      email: body.email as string,
      avatarUrl: body.avatarUrl as string,
      description: body.description as string,
      hasAddedUs: body.hasAddedUs,
    })

    return c.json(result)
  } catch (err) {
    return handleLinksError(c, err)
  }
})

// 查询待审核友链申请详情（供确认落地页展示）
linksRoute.get('/review', async (c) => {
  const token = c.req.query('token')
  if (!token || typeof token !== 'string') {
    return c.json({ success: false, error: '缺失审批凭证' }, 400)
  }

  try {
    const record = await getFriendReviewDetail(token)
    return c.json({
      success: true,
      data: record,
    })
  } catch (err) {
    return handleLinksError(c, err)
  }
})

// 站长提交审核操作（通过 / 拒绝）
linksRoute.post('/review', async (c) => {
  let body: { token?: string; action?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: '请求数据格式不正确' }, 400)
  }

  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const action = body?.action === 'approve' || body?.action === 'reject' ? body.action : ''

  if (!token) {
    return c.json({ success: false, error: '缺少审批令牌' }, 400)
  }

  if (!action) {
    return c.json({ success: false, error: '未知的审批操作' }, 400)
  }

  try {
    const result = await reviewFriendLink(token, action)

    // 审核通过后触发前台友链路由静态缓存重新验证
    if (result.action === 'approve') {
      try {
        revalidatePath('/links')
      } catch {
        // 容错处理
      }
    }

    return c.json({
      success: true,
      message: result.message,
    })
  } catch (err) {
    return handleLinksError(c, err)
  }
})
