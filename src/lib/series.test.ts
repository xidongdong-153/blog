/* eslint-disable test/no-import-node-test */
import assert from 'node:assert/strict'
import test from 'node:test'
import { getAllSeries, getBlogPost, getSeriesDetail, getSeriesNav } from './content'
import { REGISTERED_SERIES } from './series'

test('REGISTERED_SERIES 包含 pi-agent-desktop 且字段完整', () => {
  const series = REGISTERED_SERIES['pi-agent-desktop']
  assert.ok(series, '应该存在 pi-agent-desktop 专栏')
  assert.equal(series.id, 'pi-agent-desktop')
  assert.equal(series.title, '从零使用 Pi SDK 构建个人 Agent Desktop')
  assert.equal(series.status, 'in-progress')
  assert.ok(Array.isArray(series.tags) && series.tags.length > 0)
})

test('getAllSeries 返回所有注册专栏概要，正确统计文章数与更新日期', () => {
  const allSeries = getAllSeries()
  assert.ok(Array.isArray(allSeries))
  const target = allSeries.find((s) => s.id === 'pi-agent-desktop')
  assert.ok(target)
  assert.ok(target.postsCount >= 2, `应该至少包含 2 篇专栏文章，当前为 ${target.postsCount}`)
  assert.ok(target.lastUpdated.length > 0)
})

test('getSeriesDetail 对未注册专栏返回 null，对有效专栏按 order 升序返回文章', () => {
  const invalid = getSeriesDetail('non-existent-series')
  assert.equal(invalid, null)

  const detail = getSeriesDetail('pi-agent-desktop')
  assert.ok(detail)
  assert.equal(detail.series.id, 'pi-agent-desktop')
  assert.ok(detail.posts.length >= 2)

  // 验证 order 升序
  for (let i = 0; i < detail.posts.length - 1; i++) {
    const currentOrder = detail.posts[i].series?.order ?? 0
    const nextOrder = detail.posts[i + 1].series?.order ?? 0
    assert.ok(currentOrder <= nextOrder, '专栏文章应该按 order 升序排列')
  }
})

test('getSeriesNav 正确计算第一篇与第二篇的上下文导轨', () => {
  const post1 = getBlogPost('20260901-pi-agent-desktop-architecture')
  assert.ok(post1, '应该存在第 1 篇专栏文章')

  const nav1 = getSeriesNav(post1)
  assert.ok(nav1)
  assert.equal(nav1.currentIndex, 1)
  assert.equal(nav1.prev, undefined, '第 1 篇不应有上一篇')
  assert.ok(nav1.next, '第 1 篇应该有下一篇')
  assert.equal(nav1.next.slug, '20260910-pi-agent-desktop-runtime')

  const post2 = getBlogPost('20260910-pi-agent-desktop-runtime')
  assert.ok(post2, '应该存在第 2 篇专栏文章')

  const nav2 = getSeriesNav(post2)
  assert.ok(nav2)
  assert.equal(nav2.currentIndex, 2)
  assert.ok(nav2.prev, '第 2 篇应该有上一篇')
  assert.equal(nav2.prev.slug, '20260901-pi-agent-desktop-architecture')
})
