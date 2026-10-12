/* eslint-disable test/no-import-node-test */
import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlogListUrl, filterBlogPostsBySource } from './blog-meta'

test('来源筛选保留文章顺序和附带字段，不修改输入', () => {
  const posts = [
    { slug: 'human-older', aiGenerated: false, title: '人工文章一' },
    { slug: 'ai', aiGenerated: true, title: 'AI 文章' },
    { slug: 'human-newer', aiGenerated: false, title: '人工文章二' },
  ]
  const original = structuredClone(posts)

  assert.deepEqual(filterBlogPostsBySource(posts, 'human'), [posts[0], posts[2]])
  assert.deepEqual(filterBlogPostsBySource(posts), original)
  assert.deepEqual(posts, original)
  assert.deepEqual(filterBlogPostsBySource([posts[1]], 'human'), [])
})

test('列表默认 URL 省略全部来源、最新排序和第一页', () => {
  assert.equal(buildBlogListUrl(), '/blog')
  assert.equal(buildBlogListUrl({ source: 'all', sort: 'newest', page: 1 }), '/blog')
})

test('分类、排序与分页链接保留非 AI 来源，切换链接省略页码', () => {
  const paginated = new URL(
    buildBlogListUrl({ source: 'human', category: 'tech', sort: 'updated', page: 2 }),
    'http://localhost',
  )
  assert.equal(paginated.pathname, '/blog')
  assert.equal(paginated.searchParams.get('source'), 'human')
  assert.equal(paginated.searchParams.get('category'), 'tech')
  assert.equal(paginated.searchParams.get('sort'), 'updated')
  assert.equal(paginated.searchParams.get('page'), '2')

  const switched = new URL(
    buildBlogListUrl({ source: 'human', category: 'thoughts', sort: 'oldest' }),
    'http://localhost',
  )
  assert.equal(switched.searchParams.get('source'), 'human')
  assert.equal(switched.searchParams.get('category'), 'thoughts')
  assert.equal(switched.searchParams.get('sort'), 'oldest')
  assert.equal(switched.searchParams.has('page'), false)

  const all = new URL(buildBlogListUrl({ source: 'all', category: 'tech', sort: 'updated' }), 'http://localhost')
  assert.equal(all.searchParams.has('source'), false)
  assert.equal(all.searchParams.get('category'), 'tech')
  assert.equal(all.searchParams.get('sort'), 'updated')
  assert.equal(all.searchParams.has('page'), false)
})
