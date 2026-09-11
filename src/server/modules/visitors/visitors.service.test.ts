/* eslint-disable test/no-import-node-test */

import assert from 'node:assert/strict'
import test from 'node:test'
import { eq } from 'drizzle-orm'
import { db } from '@/server/infra/db/client'
import { visitorRecords } from '@/server/infra/db/schema/visitors'
import { VisitorsService } from './visitors.service'

class MockClock {
  currentTime = 1_000_000

  now(): number {
    return this.currentTime
  }

  advance(ms: number): void {
    this.currentTime += ms
  }
}

test('VisitorsService 业务逻辑与去重测试', async (t) => {
  const clock = new MockClock()
  let uuidCounter = Date.now()
  const mockUuidGenerator = () => `00000000-0000-4000-8000-${String(uuidCounter++).slice(-12).padStart(12, '0')}`

  const service = new VisitorsService({
    db,
    clock,
    uuidGenerator: mockUuidGenerator,
  })

  // 清理测试数据库脏数据
  const testVisitor1 = '00000000-0000-4000-8000-000000000001'
  const testVisitor2 = '00000000-0000-4000-8000-000000000002'
  await db.delete(visitorRecords).where(eq(visitorRecords.visitorId, testVisitor1))
  await db.delete(visitorRecords).where(eq(visitorRecords.visitorId, testVisitor2))
  service.reset()

  await t.test('1. 首次匿名登记生成新 UUID，重复访问保持幂等', async () => {
    // 首次无 cookie 访问
    const res1 = await service.bootstrapVisitor(null)
    assert.equal(res1.isNew, true)
    assert.match(res1.visitorId, /^00000000-0000-4000-8000-/)
    assert.equal(res1.response.status, 'ready')
    const countAfterFirst = res1.response.uniqueVisitorCount
    assert.ok(countAfterFirst >= 1)

    // 携带已有有效 cookie 再次访问：不应生成新 UUID，累计数不增加
    const res2 = await service.bootstrapVisitor(res1.visitorId)
    assert.equal(res2.isNew, false)
    assert.equal(res2.visitorId, res1.visitorId)
    assert.equal(res2.response.uniqueVisitorCount, countAfterFirst)

    // 携带带双引号的标准 cookie：自动清洗并保持幂等
    const resQuoted = await service.bootstrapVisitor(`"${res1.visitorId}"`)
    assert.equal(resQuoted.isNew, false)
    assert.equal(resQuoted.visitorId, res1.visitorId)
    assert.equal(resQuoted.response.uniqueVisitorCount, countAfterFirst)

    // 携带非法格式 cookie：替换为新 UUID
    const res3 = await service.bootstrapVisitor('invalid-uuid-string')
    assert.equal(res3.isNew, true)
    assert.notEqual(res3.visitorId, 'invalid-uuid-string')
    assert.ok(res3.response.uniqueVisitorCount >= countAfterFirst + 1)
  })

  await t.test('2. 同一访客多标签页（不同 sessionId）站点在线人数去重', async () => {
    service.reset()
    const visitorA = '00000000-0000-4000-8000-000000000001'

    // Tab 1
    service.registerSession({
      sessionId: 'session-tab-1',
      connectionId: 'conn-1',
      visitorId: visitorA,
      articleSlug: null,
    })

    // Tab 2
    service.registerSession({
      sessionId: 'session-tab-2',
      connectionId: 'conn-2',
      visitorId: visitorA,
      articleSlug: null,
    })

    const snapshot = await service.getPublicSnapshot()
    assert.equal(service.getActiveSessionCount(), 2)
    // 站点在线人数必须去重为 1
    assert.equal(snapshot.onlineVisitorCount, 1)
  })

  await t.test('3. 同一访客多标签页查看同一篇文章，文章在线人数去重为 1', async () => {
    service.reset()
    const visitorA = '00000000-0000-4000-8000-000000000001'

    service.registerSession({
      sessionId: 'session-tab-1',
      connectionId: 'conn-1',
      visitorId: visitorA,
      articleSlug: 'post-alpha',
    })

    service.registerSession({
      sessionId: 'session-tab-2',
      connectionId: 'conn-2',
      visitorId: visitorA,
      articleSlug: 'post-alpha',
    })

    const snapshot = await service.getPublicSnapshot()
    assert.equal(snapshot.onlineVisitorCount, 1)
    assert.equal(snapshot.articleViewerCounts['post-alpha'], 1)
  })

  await t.test('4. 同一访客查看不同文章，全站计 1，两篇文章各计 1', async () => {
    service.reset()
    const visitorA = '00000000-0000-4000-8000-000000000001'

    service.registerSession({
      sessionId: 'session-tab-1',
      connectionId: 'conn-1',
      visitorId: visitorA,
      articleSlug: 'post-alpha',
    })

    service.registerSession({
      sessionId: 'session-tab-2',
      connectionId: 'conn-2',
      visitorId: visitorA,
      articleSlug: 'post-beta',
    })

    const snapshot = await service.getPublicSnapshot()
    assert.equal(snapshot.onlineVisitorCount, 1)
    assert.equal(snapshot.articleViewerCounts['post-alpha'], 1)
    assert.equal(snapshot.articleViewerCounts['post-beta'], 1)
  })

  await t.test('5. 多个独立访客查看同一篇文章，文章人数正确累加', async () => {
    service.reset()
    const visitorA = '00000000-0000-4000-8000-000000000001'
    const visitorB = '00000000-0000-4000-8000-000000000002'

    service.registerSession({
      sessionId: 'session-a',
      connectionId: 'conn-a',
      visitorId: visitorA,
      articleSlug: 'post-alpha',
    })

    service.registerSession({
      sessionId: 'session-b',
      connectionId: 'conn-b',
      visitorId: visitorB,
      articleSlug: 'post-alpha',
    })

    const snapshot = await service.getPublicSnapshot()
    assert.equal(snapshot.onlineVisitorCount, 2)
    assert.equal(snapshot.articleViewerCounts['post-alpha'], 2)
  })

  await t.test('6. 会话 TTL 超时自动清理与心跳续期', async () => {
    service.reset()
    const visitorA = '00000000-0000-4000-8000-000000000001'

    service.registerSession({
      sessionId: 'session-tab-1',
      connectionId: 'conn-1',
      visitorId: visitorA,
      articleSlug: 'post-alpha',
    })

    // 前进 20 秒，发送心跳续期
    clock.advance(20_000)
    const heartbeatResult = service.heartbeatSession('session-tab-1', 'conn-1')
    assert.equal(heartbeatResult, true)

    // 再前进 30 秒（距注册已 50 秒，但距上次心跳仅 30 秒，未达 45 秒 TTL）
    clock.advance(30_000)
    let snapshot = await service.getPublicSnapshot()
    assert.equal(snapshot.onlineVisitorCount, 1)

    // 再前进 20 秒（距上次心跳 50 秒，已超 45 秒）
    clock.advance(20_000)
    snapshot = await service.getPublicSnapshot()
    assert.equal(snapshot.onlineVisitorCount, 0)
    assert.equal(snapshot.articleViewerCounts['post-alpha'], undefined)
  })

  await t.test('7. 相同 sessionId 新连接建立后，旧连接 close 不得删除新连接', async () => {
    service.reset()
    const visitorA = '00000000-0000-4000-8000-000000000001'

    // 旧连接建立
    service.registerSession({
      sessionId: 'tab-1',
      connectionId: 'conn-old',
      visitorId: visitorA,
      articleSlug: 'post-alpha',
    })

    // 重连建立新连接
    service.registerSession({
      sessionId: 'tab-1',
      connectionId: 'conn-new',
      visitorId: visitorA,
      articleSlug: 'post-alpha',
    })

    // 旧连接触发 close 回调：携带 old connectionId，不得误删新会话
    const deleted = service.removeSession('tab-1', 'conn-old')
    assert.equal(deleted, false)

    let snapshot = await service.getPublicSnapshot()
    assert.equal(snapshot.onlineVisitorCount, 1)

    // 新连接触发 close 回调：成功删除
    const deletedNew = service.removeSession('tab-1', 'conn-new')
    assert.equal(deletedNew, true)
    snapshot = await service.getPublicSnapshot()
    assert.equal(snapshot.onlineVisitorCount, 0)
  })

  await t.test('8. removeSessionsByConnectionId 批量清理该连接下的会话', async () => {
    service.reset()
    const visitorA = '00000000-0000-4000-8000-000000000001'

    service.registerSession({
      sessionId: 'tab-x',
      connectionId: 'conn-x',
      visitorId: visitorA,
      articleSlug: null,
    })

    const removed = service.removeSessionsByConnectionId('conn-x')
    assert.equal(removed, 1)
    const snapshot = await service.getPublicSnapshot()
    assert.equal(snapshot.onlineVisitorCount, 0)
  })
})
