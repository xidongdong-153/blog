/* eslint-disable test/no-import-node-test */

import assert from 'node:assert/strict'
import test from 'node:test'
import { VISITOR_COOKIE_NAME } from '@/lib/visitor'
import { app } from '../../app.ts'

const TEST_SLUG = '20260615-hello-blog'

test('访客 Hono 路由测试', async (t) => {
  await t.test('POST /api/visitors/bootstrap 首次访问颁发 Cookie 并返回公开计数', async () => {
    const res = await app.request('/api/visitors/bootstrap', {
      method: 'POST',
    })

    assert.equal(res.status, 200)
    assert.equal(res.headers.get('cache-control'), 'no-store, max-age=0')

    const setCookieHeader = res.headers.get('set-cookie')
    assert.ok(setCookieHeader, '必须返回 Set-Cookie 头')
    assert.ok(setCookieHeader.includes(VISITOR_COOKIE_NAME), 'Cookie 名必须为 site_visitor_id')
    assert.ok(setCookieHeader.includes('HttpOnly'), 'Cookie 必须包含 HttpOnly')
    assert.ok(setCookieHeader.includes('SameSite=Lax'), 'Cookie 必须包含 SameSite=Lax')
    assert.ok(setCookieHeader.includes('Max-Age=31536000'), 'Cookie 必须为 1 年有效期')

    const body = (await res.json()) as { status: string; uniqueVisitorCount: number; visitorId?: string }
    assert.equal(body.status, 'ready')
    assert.equal(typeof body.uniqueVisitorCount, 'number')
    assert.equal(body.visitorId, undefined, '响应 JSON 不得向前端泄露 visitorId')
  })

  await t.test('POST /api/visitors/bootstrap 携带合法 Cookie 不重复下发 Cookie', async () => {
    const existingVisitorId = '00000000-0000-4000-8000-999999999999'
    const res = await app.request('/api/visitors/bootstrap', {
      method: 'POST',
      headers: {
        Cookie: `${VISITOR_COOKIE_NAME}=${existingVisitorId}`,
      },
    })

    assert.equal(res.status, 200)
    const body = (await res.json()) as { status: string; uniqueVisitorCount: number }
    assert.equal(body.status, 'ready')
    assert.equal(typeof body.uniqueVisitorCount, 'number')
  })

  await t.test('GET /api/visitors/stats 返回全站统计并支持 slug 校验', async () => {
    // 全站统计
    const res = await app.request('/api/visitors/stats')
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('cache-control'), 'no-store, max-age=0')
    const json = (await res.json()) as {
      status: string
      uniqueVisitorCount: number
      onlineVisitorCount: number
      articleViewerCounts: Record<string, number>
    }
    assert.equal(json.status, 'ready')
    assert.equal(typeof json.uniqueVisitorCount, 'number')
    assert.equal(typeof json.onlineVisitorCount, 'number')
    assert.ok(typeof json.articleViewerCounts === 'object')

    // 携带合法文章 slug
    const resValidSlug = await app.request(`/api/visitors/stats?slug=${TEST_SLUG}`)
    assert.equal(resValidSlug.status, 200)

    // 携带非法文章 slug 返回 400
    const resInvalidSlug = await app.request('/api/visitors/stats?slug=not-found-article-123')
    assert.equal(resInvalidSlug.status, 400)
    const errJson = (await resInvalidSlug.json()) as { error: string }
    assert.ok(errJson.error.includes('不存在'))
  })

  await t.test('GET /api/visitors/socket 普通 HTTP 访问拦截 426 Upgrade Required', async () => {
    const res = await app.request('/api/visitors/socket')
    assert.equal(res.status, 426)
    assert.equal(res.headers.get('upgrade'), 'websocket')
  })
})
