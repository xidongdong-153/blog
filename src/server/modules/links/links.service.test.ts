/* eslint-disable test/no-import-node-test */

import assert from 'node:assert/strict'
import test from 'node:test'
import { eq } from 'drizzle-orm'
import { db } from '@/server/infra/db/client'
import { friendLinks } from '@/server/infra/db/schema'
import {
  applyFriendLink,
  getApprovedFriendLinks,
  getFriendReviewDetail,
  LinksServiceError,
  reviewFriendLink,
} from './links.service'

test('友链 Service 业务规则测试', async (t) => {
  const TEST_SITE_URL = 'https://example-friend.com'

  // 清理测试数据
  await db.delete(friendLinks).where(eq(friendLinks.url, TEST_SITE_URL))

  t.after(async () => {
    await db.delete(friendLinks).where(eq(friendLinks.url, TEST_SITE_URL))
  })

  await t.test('申请输入参数校验', async () => {
    // 缺少昵称
    await assert.rejects(
      () =>
        applyFriendLink({
          nickname: '',
          siteName: '测试站点',
          siteUrl: 'https://example.com',
          email: 'test@example.com',
          description: '测试简介',
        }),
      (err: unknown) => err instanceof LinksServiceError && err.statusCode === 400,
    )

    // 非法 URL
    await assert.rejects(
      () =>
        applyFriendLink({
          nickname: '小明',
          siteName: '测试站点',
          siteUrl: 'javascript:alert(1)',
          email: 'test@example.com',
          description: '测试简介',
        }),
      (err: unknown) => err instanceof LinksServiceError && err.statusCode === 400,
    )

    // 非法邮箱
    await assert.rejects(
      () =>
        applyFriendLink({
          nickname: '小明',
          siteName: '测试站点',
          siteUrl: 'https://example.com',
          email: 'invalid-email',
          description: '测试简介',
        }),
      (err: unknown) => err instanceof LinksServiceError && err.statusCode === 400,
    )
  })

  let reviewToken: string

  await t.test('成功提交申请并写入 pending 状态', async () => {
    const res = await applyFriendLink({
      nickname: '测试朋友',
      siteName: '示例小站',
      siteUrl: TEST_SITE_URL,
      email: 'friend@example-friend.com',
      description: '这是一个有趣的独立博客',
      hasAddedUs: true,
    })

    assert.equal(res.success, true)

    // 检查数据库记录
    const record = await db.query.friendLinks.findFirst({
      where: eq(friendLinks.url, TEST_SITE_URL),
    })

    assert.ok(record)
    assert.equal(record.status, 'pending')
    assert.equal(record.hasAddedUs, 1)
    assert.ok(record.reviewToken)
    assert.ok(record.tokenExpiresAt)
    assert.ok(record.tokenExpiresAt.getTime() > Date.now())

    reviewToken = record.reviewToken
  })

  await t.test('审核详情读取（只读验证）', async () => {
    // 伪造 token 返回 404
    await assert.rejects(
      () => getFriendReviewDetail('non-existing-uuid-token'),
      (err: unknown) => err instanceof LinksServiceError && err.statusCode === 404,
    )

    // 有效 token 返回脱敏详情
    const detail = await getFriendReviewDetail(reviewToken)
    assert.equal(detail.siteName, '示例小站')
    assert.equal(detail.nickname, '测试朋友')
    assert.equal(detail.status, 'pending')
    assert.equal(detail.hasAddedUs, true)
  })

  await t.test('执行审核并通过', async () => {
    // 非法操作抛出 400
    await assert.rejects(
      () => reviewFriendLink(reviewToken, 'unknown_action'),
      (err: unknown) => err instanceof LinksServiceError && err.statusCode === 400,
    )

    // 通过审核
    const reviewRes = await reviewFriendLink(reviewToken, 'approve')
    assert.equal(reviewRes.success, true)
    assert.equal(reviewRes.action, 'approve')

    // 检查数据库记录已更新为 approved，token 已被清空
    const updated = await db.query.friendLinks.findFirst({
      where: eq(friendLinks.url, TEST_SITE_URL),
    })

    assert.ok(updated)
    assert.equal(updated.status, 'approved')
    assert.equal(updated.reviewToken, null)
    assert.equal(updated.tokenExpiresAt, null)

    // 再次使用原 token 审核应返回 404（token 已清空）
    await assert.rejects(
      () => reviewFriendLink(reviewToken, 'approve'),
      (err: unknown) => err instanceof LinksServiceError && err.statusCode === 404,
    )
  })

  await t.test('公开列表只展示 approved 友链', async () => {
    const list = await getApprovedFriendLinks()
    assert.ok(Array.isArray(list))
    const item = list.find((i) => i.url === TEST_SITE_URL)
    assert.ok(item)
    assert.equal(item.name, '示例小站')
  })
})
