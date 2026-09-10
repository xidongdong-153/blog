/* eslint-disable test/no-import-node-test */

import assert from 'node:assert/strict'
import test from 'node:test'
import { app } from '../../app.ts'
import { checkPresenceHealth, getPublicPresenceData } from './presence.service.ts'

test('presence 模块服务与路由测试', async (t) => {
  await t.test('合法活动数据解析', async () => {
    const mockFetch: typeof globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          status: 'active',
          desktopApp: {
            id: 'vscode',
            kind: 'desktop',
            label: 'VS Code',
            icon: '/images/presence/vscode.png',
          },
          foregroundTool: null,
          backgroundTools: [],
          terminalDetection: 'unknown',
          receivedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const data = await getPublicPresenceData({ fetch: mockFetch })
    assert.equal(data.status, 'active')
    assert.equal(data.desktopApp?.id, 'vscode')
    assert.equal(data.desktopApp?.label, 'VS Code')
  })

  await t.test('网络故障或非法数据降级返回离线对象', async () => {
    const errorFetch: typeof globalThis.fetch = async () => {
      throw new Error('Network failure')
    }

    const data = await getPublicPresenceData({ fetch: errorFetch })
    assert.equal(data.status, 'offline')
    assert.equal(data.desktopApp, null)
  })

  await t.test('健康探测与活动数据解析分别断言', async () => {
    // 上游返回 200 但数据非标准活动协议，checkPresenceHealth 仍返回 online
    const nonStandardFetch: typeof globalThis.fetch = async () => {
      return new Response(JSON.stringify({ status: 'healthy' }), { status: 200 })
    }

    const health = await checkPresenceHealth({ fetch: nonStandardFetch })
    assert.equal(health.status, 'online')
    assert.equal(health.label, '活跃运行中')

    // 失败情况返回 standby
    const failFetch: typeof globalThis.fetch = async () => {
      return new Response('Not Found', { status: 404 })
    }

    const healthFailed = await checkPresenceHealth({ fetch: failFetch })
    assert.equal(healthFailed.status, 'standby')
    assert.equal(healthFailed.label, '待机离线')
  })

  await t.test('GET /api/presence 响应头包含 no-store', async () => {
    const res = await app.request('/api/presence')
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('cache-control'), 'no-store, max-age=0')
  })
})
