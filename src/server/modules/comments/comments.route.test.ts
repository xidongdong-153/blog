/* eslint-disable test/no-import-node-test */

import assert from 'node:assert/strict'
import test from 'node:test'
import { app } from '../../app.ts'
import { isCommentRateLimited, resetCommentRateLimit } from './comments.rate-limit.ts'

const TEST_SLUG = '20260615-hello-blog'

test('评论 Hono 路由与权限状态码测试', async (t) => {
  await t.test('GET /api/comments 参数校验', async () => {
    // 缺少 slug 返回 400
    const resNoSlug = await app.request('/api/comments')
    assert.equal(resNoSlug.status, 400)
    const jsonNoSlug = (await resNoSlug.json()) as { success: boolean; error: string }
    assert.equal(jsonNoSlug.success, false)
    assert.ok(jsonNoSlug.error.includes('slug'))

    // 携带有效 slug 返回 200
    const res = await app.request(`/api/comments?slug=${TEST_SLUG}`)
    assert.equal(res.status, 200)
    const json = (await res.json()) as {
      success: boolean
      data: {
        targetKey: string
        totalCount: number
        comments: unknown[]
        isOwner: boolean
      }
    }
    assert.equal(json.success, true)
    assert.equal(json.data.targetKey, TEST_SLUG)
    assert.ok(Array.isArray(json.data.comments))
  })

  await t.test('POST /api/comments 未登录拦截 401', async () => {
    const res = await app.request('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: TEST_SLUG,
        content: '未登录尝试提交的评论',
      }),
    })
    assert.equal(res.status, 401)
    const json = (await res.json()) as { success: boolean; error: string }
    assert.equal(json.success, false)
    assert.ok(json.error.includes('登录'))
  })

  await t.test('PATCH /api/comments/:id/pin 权限拦截', async () => {
    // 未登录返回 401
    const res = await app.request('/api/comments/123/pin', {
      method: 'PATCH',
    })
    assert.equal(res.status, 401)
  })

  await t.test('DELETE /api/comments/:id 权限拦截', async () => {
    // 未登录返回 401
    const res = await app.request('/api/comments/123', {
      method: 'DELETE',
    })
    assert.equal(res.status, 401)
  })

  await t.test('/api/comments/delete 凭证端点基础校验', async () => {
    // GET /delete 缺少 token 返回 400
    const getRes = await app.request('/api/comments/delete')
    assert.equal(getRes.status, 400)

    // POST /delete 缺少 token 返回 400
    const postRes = await app.request('/api/comments/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(postRes.status, 400)
  })

  await t.test('isCommentRateLimited 频控规则', () => {
    resetCommentRateLimit()
    const testUserId = 'test-user-limit-1'
    const testIp = '203.0.113.10'

    // 用户最多允许 5 次，第 6 次超限
    for (let i = 0; i < 5; i++) {
      assert.equal(isCommentRateLimited(testUserId, `203.0.113.${100 + i}`), false)
    }
    assert.equal(isCommentRateLimited(testUserId, '203.0.113.200'), true)

    // IP 最多允许 10 次，第 11 次超限
    resetCommentRateLimit()
    for (let i = 0; i < 10; i++) {
      assert.equal(isCommentRateLimited(`user-ip-test-${i}`, testIp), false)
    }
    assert.equal(isCommentRateLimited('user-ip-test-11', testIp), true)
  })
})
