/* eslint-disable test/no-import-node-test */

import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import { eq } from 'drizzle-orm'
import { db } from '@/server/infra/db/client'
import { aiSummaryConfig } from '@/server/infra/db/schema/ai'
import { session, user } from '@/server/infra/db/schema/auth'
import { app } from '../../app.ts'
import { auth } from '../auth/auth.config.ts'
import { AI_CONFIG_ID } from './summary-config.service.ts'

async function makeSignedSessionCookie(token: string, secret: string): Promise<string> {
  const secretBuf = new TextEncoder().encode(secret)
  const key = await crypto.subtle.importKey('raw', secretBuf, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token))
  const b64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
  return encodeURIComponent(`${token}.${b64}`)
}

test('AI 路由权限、参数校验与脱敏响应测试', async (t) => {
  const origAdminEmail = process.env.ADMIN_EMAIL
  const origMasterKey = process.env.AI_CREDENTIAL_ENCRYPTION_KEY

  const ADMIN_EMAIL = `ai-admin-${Date.now()}@example.com`
  const VISITOR_EMAIL = `ai-visitor-${Date.now()}@example.com`
  process.env.ADMIN_EMAIL = ADMIN_EMAIL
  process.env.AI_CREDENTIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')

  const adminUserId = `user-admin-ai-${Date.now()}`
  const visitorUserId = `user-visitor-ai-${Date.now()}`

  // 初始化测试用户
  await db.delete(aiSummaryConfig).where(eq(aiSummaryConfig.id, AI_CONFIG_ID))

  await db.insert(user).values([
    {
      id: adminUserId,
      name: '站长',
      email: ADMIN_EMAIL,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: visitorUserId,
      name: '普通访客',
      email: VISITOR_EMAIL,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ])

  interface BetterAuthContext {
    secret: string
    internalAdapter: {
      createSession: (userId: string, rememberMe: boolean) => Promise<{ token: string }>
    }
  }

  const ctx = await (auth as unknown as { $context: Promise<BetterAuthContext> }).$context
  const adminSession = await ctx.internalAdapter.createSession(adminUserId, true)
  const visitorSession = await ctx.internalAdapter.createSession(visitorUserId, true)

  const adminCookieVal = await makeSignedSessionCookie(adminSession.token, ctx.secret)
  const visitorCookieVal = await makeSignedSessionCookie(visitorSession.token, ctx.secret)

  const adminCookie = `better-auth.session_token=${adminCookieVal}`
  const visitorCookie = `better-auth.session_token=${visitorCookieVal}`

  t.after(async () => {
    process.env.ADMIN_EMAIL = origAdminEmail
    process.env.AI_CREDENTIAL_ENCRYPTION_KEY = origMasterKey
    await db.delete(aiSummaryConfig).where(eq(aiSummaryConfig.id, AI_CONFIG_ID))
    await db.delete(session).where(eq(session.userId, adminUserId))
    await db.delete(session).where(eq(session.userId, visitorUserId))
    await db.delete(user).where(eq(user.id, adminUserId))
    await db.delete(user).where(eq(user.id, visitorUserId))
  })

  await t.test('1. 未登录访问拦截 401', async () => {
    const endpoints = [
      { path: '/api/ai/summary-config', method: 'GET' },
      { path: '/api/ai/summary-config', method: 'PUT', body: {} },
      { path: '/api/ai/summary-config/check', method: 'POST' },
      { path: '/api/ai/summary-config/credential', method: 'DELETE' },
      { path: '/api/ai/summary-config/models', method: 'POST', body: {} },
    ]

    for (const ep of endpoints) {
      const res = await app.request(ep.path, {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : {},
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      })
      assert.equal(res.status, 401, `端点 ${ep.method} ${ep.path} 未登录应返回 401`)
      const json = (await res.json()) as { success: boolean; error: string }
      assert.equal(json.success, false)
      assert.ok(json.error.includes('登录'))
    }
  })

  await t.test('2. 普通登录用户访问拦截 403', async () => {
    const endpoints = [
      { path: '/api/ai/summary-config', method: 'GET' },
      { path: '/api/ai/summary-config', method: 'PUT', body: {} },
      { path: '/api/ai/summary-config/check', method: 'POST' },
      { path: '/api/ai/summary-config/credential', method: 'DELETE' },
      { path: '/api/ai/summary-config/models', method: 'POST', body: {} },
    ]

    for (const ep of endpoints) {
      const res = await app.request(ep.path, {
        method: ep.method,
        headers: {
          Cookie: visitorCookie,
          ...(ep.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      })
      assert.equal(res.status, 403, `端点 ${ep.method} ${ep.path} 非站长应返回 403`)
      const json = (await res.json()) as { success: boolean; error: string }
      assert.equal(json.success, false)
      assert.ok(json.error.includes('站长'))
    }
  })

  await t.test('3. 站长访问 PUT 参数校验 400', async () => {
    // 缺少协议
    const resNoProto = await app.request('/api/ai/summary-config', {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl: 'https://api.openai.com/v1', modelId: 'gpt-4o' }),
    })
    assert.equal(resNoProto.status, 400)

    // 不支持的协议
    const resBadProto = await app.request('/api/ai/summary-config', {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocol: 'unsupported-proto', baseUrl: 'https://api.openai.com/v1', modelId: 'gpt-4o' }),
    })
    assert.equal(resBadProto.status, 400)

    // 非法 Base URL (带 query)
    const resBadUrl = await app.request('/api/ai/summary-config', {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'openai-completions',
        baseUrl: 'https://api.openai.com/v1?test=1',
        modelId: 'gpt-4o',
      }),
    })
    assert.equal(resBadUrl.status, 400)
  })

  await t.test('4. 站长正常保存配置与脱敏响应验证', async () => {
    const rawKey = 'sk-admin-test-secret-key-1234567890'

    const res = await app.request('/api/ai/summary-config', {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'openai-completions',
        baseUrl: 'https://api.example.com/v1',
        modelId: 'gpt-4o',
        apiKey: rawKey,
      }),
    })

    assert.equal(res.status, 200)
    const json = (await res.json()) as { success: boolean; data: Record<string, unknown> }
    assert.equal(json.success, true)
    assert.equal(json.data.protocol, 'openai-completions')
    assert.equal(json.data.baseUrl, 'https://api.example.com/v1')
    assert.equal(json.data.modelId, 'gpt-4o')
    assert.equal(json.data.hasCredential, true)
    assert.equal(json.data.status, 'needs_check')
    assert.equal(json.data.revision, 1)

    // 严苛断言：响应中绝对不存在密文、IV、AuthTag 以及原始 key
    assert.equal(json.data.credentialCiphertext, undefined)
    assert.equal(json.data.credentialIv, undefined)
    assert.equal(json.data.credentialAuthTag, undefined)
    assert.equal(json.data.apiKey, undefined)
    assert.equal(JSON.stringify(json).includes(rawKey), false)

    // 读取接口 GET 也同样脱敏
    const getRes = await app.request('/api/ai/summary-config', {
      method: 'GET',
      headers: { Cookie: adminCookie },
    })
    assert.equal(getRes.status, 200)
    const getJson = (await getRes.json()) as { success: boolean; data: Record<string, unknown> }
    assert.equal(getJson.success, true)
    assert.equal(getJson.data.hasCredential, true)
    assert.equal(getJson.data.credentialMask, 'sk-****7890')
    assert.equal(getJson.data.credentialCiphertext, undefined)
    assert.equal(JSON.stringify(getJson).includes(rawKey), false)
  })

  await t.test('5. 站长清除凭据端点 DELETE', async () => {
    const res = await app.request('/api/ai/summary-config/credential', {
      method: 'DELETE',
      headers: { Cookie: adminCookie },
    })

    assert.equal(res.status, 200)
    const json = (await res.json()) as { success: boolean; data: Record<string, unknown> }
    assert.equal(json.success, true)
    assert.equal(json.data.hasCredential, false)
    assert.equal(json.data.credentialMask, null)
    assert.equal(json.data.status, 'needs_check')
    assert.equal(json.data.revision, 2)
  })
})
