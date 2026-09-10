/* eslint-disable test/no-import-node-test */

import assert from 'node:assert/strict'
import test from 'node:test'
import { app } from '../../app.ts'
import { resetRateLimitMap } from './links.rate-limit.ts'

test('友链 Hono 路由与频控测试', async (t) => {
  resetRateLimitMap()

  t.after(() => {
    resetRateLimitMap()
  })

  await t.test('POST /api/links/apply 字段校验与 400 拦截', async () => {
    const res = await app.request('/api/links/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.100',
      },
      body: JSON.stringify({}),
    })

    assert.equal(res.status, 400)
    const json = (await res.json()) as { success: boolean; error: string }
    assert.equal(json.success, false)
    assert.ok(json.error.includes('称呼'))
  })

  await t.test('POST /api/links/apply 频控限流测试 (第 4 次 429)', async () => {
    const testIp = '10.0.0.88'
    const validBody = {
      nickname: '频控测试',
      siteName: '频控站点',
      siteUrl: 'https://rate-limit-test.org',
      email: 'rate@example.com',
      description: '频控测试简介',
    }

    // 前 3 次请求（即使成功或处理业务）
    for (let i = 0; i < 3; i++) {
      const res = await app.request('/api/links/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': testIp,
        },
        body: JSON.stringify(validBody),
      })
      assert.notEqual(res.status, 429)
    }

    // 第 4 次请求必须被限流 429
    const resFourth = await app.request('/api/links/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testIp,
      },
      body: JSON.stringify(validBody),
    })

    assert.equal(resFourth.status, 429)
    const jsonFourth = (await resFourth.json()) as { success: boolean; error: string }
    assert.equal(jsonFourth.success, false)
    assert.ok(jsonFourth.error.includes('频繁'))
  })

  await t.test('GET /api/links/review 缺少 token 返回 400', async () => {
    const res = await app.request('/api/links/review')
    assert.equal(res.status, 400)
  })

  await t.test('POST /api/links/review 缺少必填项返回 400', async () => {
    const res = await app.request('/api/links/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 400)
  })
})
