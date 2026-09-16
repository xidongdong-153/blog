/* eslint-disable test/no-import-node-test */

import type { db } from '@/server/infra/db/client'
import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDate, formatRelativeTime } from '@/lib/date'
import { getAdminDashboardData } from './admin.service'

test('admin 模块大盘数据聚合服务测试', async (t) => {
  await t.test('正常环境下能完整聚合各项大盘指标', async () => {
    const data = await getAdminDashboardData({
      name: '管理员',
      email: 'admin@example.com',
      image: 'https://example.com/avatar.png',
    })

    // 1. 用户信息
    assert.equal(data.adminUser.name, '管理员')
    assert.equal(data.adminUser.email, 'admin@example.com')
    assert.equal(data.adminUser.image, 'https://example.com/avatar.png')

    // 2. 系统环境
    assert.equal(typeof data.system.nodeVersion, 'string')
    assert.equal(typeof data.system.platform, 'string')
    assert.equal(typeof data.system.uptimeSeconds, 'number')
    assert.equal(typeof data.system.dbLatencyMs, 'number')
    assert.ok(data.system.dbStatus === 'connected' || data.system.dbStatus === 'error')

    // 3. 内容与资产
    assert.equal(typeof data.content.totalPosts, 'number')
    assert.equal(typeof data.content.publishedPosts, 'number')
    assert.equal(typeof data.content.draftPosts, 'number')
    assert.equal(typeof data.content.totalNotes, 'number')
    assert.equal(data.content.totalPosts, data.content.publishedPosts + data.content.draftPosts)
    assert.ok(typeof data.content.categoryDistribution === 'object')

    // 4. 互动与访客
    assert.equal(typeof data.engagement.totalComments, 'number')
    assert.equal(typeof data.engagement.activeComments, 'number')
    assert.equal(typeof data.engagement.deletedComments, 'number')
    assert.equal(typeof data.engagement.totalFriends, 'number')
    assert.equal(typeof data.engagement.pendingFriendsCount, 'number')
    assert.equal(typeof data.engagement.onlineVisitorsCount, 'number')

    // 5. AI 服务
    assert.equal(typeof data.aiService.masterKeyConfigured, 'boolean')
    assert.ok(['ready', 'needs_check', 'no_credential'].includes(data.aiService.status))
    assert.equal(typeof data.aiService.protocol, 'string')

    // 6. 待办队列与评论动态
    assert.ok(Array.isArray(data.pendingFriendLinks))
    assert.ok(Array.isArray(data.recentComments))
  })

  await t.test('未提供用户信息时使用默认兜底', async () => {
    const data = await getAdminDashboardData()
    assert.equal(data.adminUser.name, '站长')
    assert.equal(data.adminUser.email, '')
    assert.equal(data.adminUser.image, null)
  })

  await t.test('底层数据库发生异常时具备容灾降级能力', async () => {
    const mockFaultyDb = {
      run: async () => {
        throw new Error('Database connection refused')
      },
      select: () => {
        throw new Error('Table query failed')
      },
      query: {
        aiSummaryConfig: {
          findFirst: async () => {
            throw new Error('AI table query failed')
          },
        },
      },
    } as unknown as typeof db

    const data = await getAdminDashboardData({ name: '站长', email: 'admin@example.com' }, { customDb: mockFaultyDb })

    // 系统大盘依然成功生成，数据库状态被标记为 error，数组优雅退化为空列表
    assert.equal(data.system.dbStatus, 'error')
    assert.equal(data.pendingFriendLinks.length, 0)
    assert.equal(data.recentComments.length, 0)
    assert.equal(data.engagement.totalFriends, 0)
    assert.equal(data.engagement.totalComments, 0)
    // 静态内容统计不受影响
    assert.ok(data.content.totalPosts >= 0)
  })

  await t.test('formatRelativeTime 与 formatDate 相对时间转换与边界防护', () => {
    const now = Date.now()

    // 1. 刚刚 (< 1 分钟)
    const justNowIso = new Date(now - 10 * 1000).toISOString()
    assert.equal(formatRelativeTime(justNowIso), '刚刚')

    // 2. 分钟前 (1 ~ 59 分钟)
    const minutesAgoIso = new Date(now - 25 * 60 * 1000).toISOString()
    assert.equal(formatRelativeTime(minutesAgoIso), '25 分钟前')

    // 3. 小时前 (1 ~ 23 小时)
    const hoursAgoIso = new Date(now - 5 * 3600 * 1000).toISOString()
    assert.equal(formatRelativeTime(hoursAgoIso), '5 小时前')

    // 4. 天前 (1 ~ 6 天)
    const daysAgoIso = new Date(now - 3 * 24 * 3600 * 1000).toISOString()
    assert.equal(formatRelativeTime(daysAgoIso), '3 天前')

    // 5. 超过 7 天回退标准日期
    const oldIso = '2025-01-15T00:00:00.000Z'
    assert.equal(formatRelativeTime(oldIso), formatDate(oldIso))

    // 6. 未来的时间回退标准日期
    const futureIso = new Date(now + 3600 * 1000).toISOString()
    assert.equal(formatRelativeTime(futureIso), formatDate(futureIso))

    // 7. 无效日期字符串容错（不抛出 RangeError 异常）
    const invalidIso = 'not-a-valid-date'
    assert.equal(formatRelativeTime(invalidIso), invalidIso)
    assert.equal(formatDate(invalidIso), invalidIso)
  })
})
