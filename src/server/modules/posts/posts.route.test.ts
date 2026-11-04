/* eslint-disable test/no-import-node-test */
import type { AuthSession } from '@/server/modules/auth/auth.service'
import assert from 'node:assert/strict'
import test from 'node:test'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createEmptyPost } from '@/lib/posts'
import { createDatabase } from '@/server/infra/db/client'
import { createPostsRoute } from './posts.route'

function session(email: string, verified = true): AuthSession {
  const now = new Date()
  return {
    user: { id: 'post-admin', name: '站长', email, emailVerified: verified, createdAt: now, updatedAt: now },
    session: {
      id: 'post-session',
      userId: 'post-admin',
      token: 'test-token',
      expiresAt: new Date(Date.now() + 60000),
      createdAt: now,
      updatedAt: now,
    },
  }
}

test('文章管理 API 强制站长鉴权、同源校验和请求限制', async (t) => {
  const originalAdmin = process.env.ADMIN_EMAIL
  const originalUrl = process.env.BETTER_AUTH_URL
  process.env.ADMIN_EMAIL = 'post-admin@example.com'
  process.env.BETTER_AUTH_URL = 'http://localhost'
  t.after(() => {
    if (originalAdmin === undefined) delete process.env.ADMIN_EMAIL
    else process.env.ADMIN_EMAIL = originalAdmin
    if (originalUrl === undefined) delete process.env.BETTER_AUTH_URL
    else process.env.BETTER_AUTH_URL = originalUrl
  })
  let currentSession: AuthSession | null = null
  const bundle = createDatabase('file::memory:')
  t.after(() => bundle.client.close())
  await migrate(bundle.db, { migrationsFolder: './src/server/infra/db/migrations' })
  const route = createPostsRoute({ database: bundle.db, session: async () => currentSession })
  for (const [path, method] of [
    ['/', 'GET'],
    ['/', 'POST'],
    ['/export?version=draft', 'GET'],
    ['/import', 'POST'],
    ['/private-id', 'DELETE'],
  ]) {
    const response = await route.request(path, { method })
    assert.equal(response.status, 401)
    assert.ok(response.headers.get('cache-control')?.includes('no-store'))
  }
  currentSession = session('visitor@example.com')
  assert.equal((await route.request('/')).status, 403)
  currentSession = session('post-admin@example.com', false)
  assert.equal((await route.request('/')).status, 403)
  currentSession = session('post-admin@example.com')
  assert.equal(
    (await route.request('/', { method: 'POST', headers: { Origin: 'https://evil.example' }, body: '{}' })).status,
    403,
  )
  assert.equal(
    (await route.request('/', { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site' }, body: '{}' })).status,
    403,
  )
  assert.equal(
    (await route.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status,
    400,
  )
  assert.equal(
    (await route.request('/', { method: 'POST', headers: { 'Content-Length': String(23 * 1024 * 1024) }, body: '{}' }))
      .status,
    413,
  )
  assert.equal((await route.request('/export?version=invalid')).status, 400)

  const input = createEmptyPost()
  input.slug = 'api-post'
  input.document.title = '接口文章'
  input.document.content = '正文。'
  const createdResponse = await route.request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
    body: JSON.stringify(input),
  })
  assert.equal(createdResponse.status, 201)
  let post = (await createdResponse.json()).data
  assert.equal(post.published, null)
  assert.equal((await route.request('/', { method: 'POST', body: JSON.stringify(input) })).status, 409)
  const publishResponse = await route.request(`/${post.id}/publish`, {
    method: 'POST',
    body: JSON.stringify({ revision: post.revision }),
  })
  assert.equal(publishResponse.status, 200)
  post = (await publishResponse.json()).data
  const exported = await route.request(`/${post.id}/export?version=published`)
  assert.equal(exported.status, 200)
  assert.ok(exported.headers.get('content-disposition')?.includes('api-post.mdx'))
  assert.ok(exported.headers.get('cache-control')?.includes('no-store'))
  assert.ok((await exported.text()).includes('接口文章'))
  assert.equal(
    (await route.request(`/${post.id}/withdraw`, { method: 'POST', body: JSON.stringify({ revision: 1 }) })).status,
    409,
  )
  const withdrawn = await route.request(`/${post.id}/withdraw`, {
    method: 'POST',
    body: JSON.stringify({ revision: post.revision }),
  })
  assert.equal(withdrawn.status, 200)
  post = (await withdrawn.json()).data
  assert.equal(post.published, null)
  assert.equal(
    (await route.request(`/${post.id}`, { method: 'DELETE', body: JSON.stringify({ revision: post.revision }) }))
      .status,
    200,
  )
  assert.equal((await route.request(`/${post.id}`)).status, 404)
})
