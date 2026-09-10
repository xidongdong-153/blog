/* eslint-disable test/no-import-node-test */

import assert from 'node:assert/strict'
import test from 'node:test'
import { app } from '../../app.ts'
import { auth, getAuthSecret } from './auth.config.ts'
import { isSiteAdmin } from './auth.service.ts'

test('getAuthSecret 密钥校验规则', () => {
  // 1. 生产环境缺失 secret 时抛错
  assert.throws(
    () => getAuthSecret({ secret: '', nodeEnv: 'production' }),
    (err: Error) => err.message.includes('生产环境缺少 BETTER_AUTH_SECRET'),
  )

  // 2. 生产环境 secret 长度小于 32 字符时抛错
  assert.throws(
    () => getAuthSecret({ secret: 'short-secret', nodeEnv: 'production' }),
    (err: Error) => err.message.includes('长度不足'),
  )

  // 3. 生产环境 secret 长度充足时正常返回已配置 secret
  const validSecret = 'valid-production-secret-must-be-at-least-32-chars'
  assert.equal(getAuthSecret({ secret: validSecret, nodeEnv: 'production' }), validSecret)

  // 4. 开发环境未配置时允许安全 fallback
  const devFallback = getAuthSecret({ secret: '', nodeEnv: 'development' })
  assert.ok(devFallback.length >= 32)

  // 5. 开发环境已配置时不覆盖用户配置
  assert.equal(getAuthSecret({ secret: 'custom-dev-secret', nodeEnv: 'development' }), 'custom-dev-secret')
})

test('isSiteAdmin 校验逻辑', () => {
  const originalAdmin = process.env.ADMIN_EMAIL
  const originalSiteOwner = process.env.SITE_OWNER_EMAIL

  try {
    // 1. 未配置时均返回 false
    delete process.env.ADMIN_EMAIL
    delete process.env.SITE_OWNER_EMAIL
    assert.equal(isSiteAdmin('admin@example.com'), false)
    assert.equal(isSiteAdmin(''), false)
    assert.equal(isSiteAdmin(null), false)

    // 2. 配置 ADMIN_EMAIL 时大小写与首尾空白归一化
    process.env.ADMIN_EMAIL = 'admin@example.com'
    assert.equal(isSiteAdmin('admin@example.com'), true)
    assert.equal(isSiteAdmin('  admin@example.com  '), true)
    assert.equal(isSiteAdmin('Admin@EXAMPLE.com'), true)
    assert.equal(isSiteAdmin('  ADMIN@example.com  '), true)
    assert.equal(isSiteAdmin('user@example.com'), false)
    assert.equal(isSiteAdmin('attacker@example.com'), false)

    // 3. 旧的 SITE_OWNER_EMAIL 不参与站长判断
    delete process.env.ADMIN_EMAIL
    process.env.SITE_OWNER_EMAIL = 'owner@example.com'
    assert.equal(isSiteAdmin('owner@example.com'), false)
    assert.equal(isSiteAdmin(' OWNER@example.com '), false)
  } finally {
    process.env.ADMIN_EMAIL = originalAdmin
    process.env.SITE_OWNER_EMAIL = originalSiteOwner
  }
})

test('Better Auth 实例基础结构具备', () => {
  assert.ok(auth)
  assert.equal(typeof auth.handler, 'function')
  assert.ok(auth.api)
  assert.equal(typeof auth.api.getSession, 'function')
})

test('GET /api/config/auth 返回 provider 状态', async () => {
  const res = await app.request('/api/config/auth')
  assert.equal(res.status, 200)

  const body = (await res.json()) as {
    success: boolean
    data: {
      providers: {
        github: boolean
        google: boolean
      }
      isOwner: boolean
    }
  }

  assert.equal(body.success, true)
  assert.equal(typeof body.data.providers.github, 'boolean')
  assert.equal(typeof body.data.providers.google, 'boolean')
  assert.equal(typeof body.data.isOwner, 'boolean')
})
