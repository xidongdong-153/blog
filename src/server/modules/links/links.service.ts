import type {
  ApplyFriendLinkInput,
  ApplyFriendLinkResult,
  FriendLinkItem,
  FriendReviewRecordDto,
  ReviewFriendLinkResult,
} from './links.types'
import crypto from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/server/infra/db/client'
import { friendLinks } from '@/server/infra/db/schema'
import { sendFriendApplyEmail } from '@/server/infra/email'

export class LinksServiceError extends Error {
  statusCode: 400 | 401 | 403 | 404 | 410 | 429 | 500

  constructor(statusCode: 400 | 401 | 403 | 404 | 410 | 429 | 500, message: string) {
    super(message)
    this.name = 'LinksServiceError'
    this.statusCode = statusCode
  }
}

function isValidUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isValidEmail(emailStr: string): boolean {
  return /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(emailStr)
}

/**
 * 访客提交友链申请：校验字段、生成 7 天审核令牌、插入 pending 记录并发送通知邮件。
 * 若邮件发送失败，抛出错误，但保留已写入的申请记录。
 */
export async function applyFriendLink(input: ApplyFriendLinkInput): Promise<ApplyFriendLinkResult> {
  const nickname = typeof input.nickname === 'string' ? input.nickname.trim() : ''
  const siteName = typeof input.siteName === 'string' ? input.siteName.trim() : ''
  const siteUrl = typeof input.siteUrl === 'string' ? input.siteUrl.trim() : ''
  const email = typeof input.email === 'string' ? input.email.trim() : ''
  const avatarUrl = typeof input.avatarUrl === 'string' ? input.avatarUrl.trim() : ''
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  const hasAddedUs = Boolean(input.hasAddedUs)

  if (!nickname || nickname.length > 32) {
    throw new LinksServiceError(400, '请填写你的称呼（32 字以内）')
  }

  if (!siteName || siteName.length > 50) {
    throw new LinksServiceError(400, '请填写站点名称（50 字以内）')
  }

  if (!siteUrl || !isValidUrl(siteUrl) || siteUrl.length > 200) {
    throw new LinksServiceError(400, '请填写有效的站点网址（需以 http:// 或 https:// 开头）')
  }

  if (!email || !isValidEmail(email) || email.length > 100) {
    throw new LinksServiceError(400, '请填写有效的联系邮箱')
  }

  if (avatarUrl && (!isValidUrl(avatarUrl) || avatarUrl.length > 300)) {
    throw new LinksServiceError(400, '头像链接格式不正确')
  }

  if (!description || description.length > 150) {
    throw new LinksServiceError(400, '请填写站点简介（150 字以内）')
  }

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
    console.error('[LinksService] 数据库写入失败:', err)
    throw new LinksServiceError(500, '系统数据写入失败，请稍后重试')
  }

  const result = await sendFriendApplyEmail({
    nickname,
    siteName,
    siteUrl,
    email,
    avatarUrl: avatarUrl || undefined,
    description,
    hasAddedUs,
    reviewToken,
  })

  if (!result.success) {
    throw new LinksServiceError(500, result.error || '邮件投递失败，请稍后再试')
  }

  return {
    success: true,
    message: result.mocked ? '申请已模拟记录（开发模式）' : '申请已送达',
  }
}

/**
 * 查询待审核友链申请详情（供确认落地页展示）。
 */
export async function getFriendReviewDetail(token: string): Promise<FriendReviewRecordDto> {
  if (!token || typeof token !== 'string') {
    throw new LinksServiceError(400, '缺失审批凭证')
  }

  let record
  try {
    record = await db.query.friendLinks.findFirst({
      where: eq(friendLinks.reviewToken, token),
    })
  } catch (err) {
    console.error('[LinksService] 查询待审申请异常:', err)
    throw new LinksServiceError(500, '查询申请信息失败')
  }

  if (!record) {
    throw new LinksServiceError(404, '该审批链接不存在或已被处理')
  }

  if (record.tokenExpiresAt && record.tokenExpiresAt.getTime() < Date.now()) {
    throw new LinksServiceError(410, '该审批链接已过期，请手动处理')
  }

  return {
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
  }
}

/**
 * 站长提交审核操作（通过 / 拒绝）。
 * 注意：缓存刷新由调用方路由负责，业务服务仅负责状态更新。
 */
export async function reviewFriendLink(token: string, action: string): Promise<ReviewFriendLinkResult> {
  const trimmedToken = typeof token === 'string' ? token.trim() : ''
  if (!trimmedToken) {
    throw new LinksServiceError(400, '缺少审批令牌')
  }

  if (action !== 'approve' && action !== 'reject') {
    throw new LinksServiceError(400, '未知的审批操作')
  }

  let record
  try {
    record = await db.query.friendLinks.findFirst({
      where: eq(friendLinks.reviewToken, trimmedToken),
    })
  } catch (err) {
    console.error('[LinksService] 审批查询异常:', err)
    throw new LinksServiceError(500, '执行审批失败，请重试')
  }

  if (!record) {
    throw new LinksServiceError(404, '该申请已处理或令牌已失效')
  }

  if (record.status !== 'pending') {
    throw new LinksServiceError(400, `该申请处于「${record.status}」状态，不能重复审批`)
  }

  if (record.tokenExpiresAt && record.tokenExpiresAt.getTime() < Date.now()) {
    throw new LinksServiceError(410, '该审批链接已过期')
  }

  const now = new Date()

  try {
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

      return {
        success: true,
        message: `已成功通过「${record.name}」的友链申请，该站点已在前台展示`,
        action: 'approve',
      }
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

    return {
      success: true,
      message: `已将「${record.name}」的友链申请标记为婉拒`,
      action: 'reject',
    }
  } catch (err) {
    console.error('[LinksService] 审批更新失败:', err)
    throw new LinksServiceError(500, '执行审批失败，请重试')
  }
}

/**
 * 查询已通过审核的公开友链列表，供前台页面展示。
 */
export async function getApprovedFriendLinks(): Promise<FriendLinkItem[]> {
  try {
    const records = await db.query.friendLinks.findMany({
      where: eq(friendLinks.status, 'approved'),
      orderBy: [desc(friendLinks.sortOrder), desc(friendLinks.createdAt)],
    })

    return records.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      url: r.url,
      avatarUrl: r.avatarUrl || undefined,
    }))
  } catch (err) {
    console.error('[LinksService] 查询公开友链失败:', err)
    return []
  }
}
