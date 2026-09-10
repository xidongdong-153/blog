/* eslint-disable test/no-import-node-test */

import assert from 'node:assert/strict'
import test from 'node:test'
import { app } from '../../app.ts'
import { checkDatabase, getStatusPageData, getSystemProcessHealth } from './system.service.ts'

test('system 模块服务与路由测试', async (t) => {
  await t.test('GET /api/system/health 返回基础进程状态', async () => {
    const res = await app.request('/api/system/health')
    assert.equal(res.status, 200)

    const body = (await res.json()) as {
      success: boolean
      data: {
        status: string
        uptime: number
      }
    }

    assert.equal(body.success, true)
    assert.equal(body.data.status, 'ok')
    assert.equal(typeof body.data.uptime, 'number')
  })

  await t.test('getSystemProcessHealth 返回基础进程元数据', () => {
    const health = getSystemProcessHealth()
    assert.equal(health.status, 'ok')
    assert.equal(typeof health.uptime, 'number')
    assert.equal(typeof health.memory.heapUsedMb, 'number')
  })

  await t.test('checkDatabase 正常连接状态', async () => {
    const dbCheck = await checkDatabase()
    assert.equal(dbCheck.status, 'connected')
    assert.equal(dbCheck.operationalStatus, 'operational')
    assert.equal(typeof dbCheck.latencyMs, 'number')
  })

  await t.test('checkDatabase 模拟连接失败时的错误捕获', async () => {
    const mockFaultyDb = {
      run: async () => {
        throw new Error('Connection refused')
      },
    } as unknown as Parameters<typeof checkDatabase>[0] extends { customDb?: infer D } ? NonNullable<D> : never

    const dbCheck = await checkDatabase({ customDb: mockFaultyDb })
    assert.equal(dbCheck.status, 'error')
    assert.equal(dbCheck.operationalStatus, 'degraded')
    assert.ok(dbCheck.message.includes('Connection refused'))
  })

  await t.test('getStatusPageData 聚合完整监控数据', async () => {
    const statusData = await getStatusPageData()
    assert.ok(statusData.db)
    assert.ok(statusData.presence)
    assert.ok(statusData.email)
    assert.ok(statusData.process)
    assert.equal(typeof statusData.process.uptime, 'number')
  })
})
