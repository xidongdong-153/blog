/* eslint-disable test/no-import-node-test */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { GET as getRss } from '@/app/rss.xml/route'
import sitemap from '@/app/sitemap'
import { createBlogPostFixture } from '@/test/fixtures/content'
import { getAllBlogPosts, getAllBlogTags, getBlogListData, getBlogPost } from './content'

test('真实 frontmatter 仅布尔 true 标记 AI，主题标签和摘要开关保持独立', (t) => {
  const cleanups: Array<() => void> = []
  t.after(() => {
    for (const cleanup of cleanups.reverse()) cleanup()
  })
  const prefix = `test-source-${randomUUID()}`
  const tag = `${prefix}-topic`
  const cases = [
    { name: 'legacy', frontmatter: {}, expected: false },
    { name: 'human', frontmatter: { aiGenerated: false }, expected: false },
    { name: 'ai', frontmatter: { aiGenerated: true }, expected: true },
    { name: 'string', frontmatter: { aiGenerated: 'true' }, expected: false },
    { name: 'number', frontmatter: { aiGenerated: 1 }, expected: false },
  ]

  for (const item of cases) {
    const slug = `${prefix}-${item.name}`
    cleanups.push(
      createBlogPostFixture(slug, {
        frontmatter: { ...item.frontmatter, tags: [tag], disableAiSummary: true },
      }),
    )
    const post = getBlogPost(slug)
    assert.ok(post)
    assert.equal(post.aiGenerated, item.expected)
    assert.equal(post.disableAiSummary, true)
    assert.deepEqual(post.tags, [tag])
  }

  assert.deepEqual(
    getAllBlogTags().filter((item) => item.tag === tag),
    [{ tag, count: cases.length }],
  )
})

test('混合来源读取后先排除草稿和 AI，再分类、排序和按八篇分页', (t) => {
  const cleanups: Array<() => void> = []
  t.after(() => {
    for (const cleanup of cleanups.reverse()) cleanup()
  })
  const prefix = `test-source-page-${randomUUID()}`
  for (let day = 1; day <= 10; day++) {
    cleanups.push(
      createBlogPostFixture(`${prefix}-human-${day}`, {
        frontmatter: { date: `2026-10-${String(day).padStart(2, '0')}`, aiGenerated: false },
      }),
    )
  }
  cleanups.push(
    createBlogPostFixture(`${prefix}-thoughts`, {
      frontmatter: { category: 'thoughts', date: '2026-10-11' },
    }),
  )
  cleanups.push(
    createBlogPostFixture(`${prefix}-ai`, {
      frontmatter: { aiGenerated: true, date: '2026-10-12' },
    }),
  )
  cleanups.push(
    createBlogPostFixture(`${prefix}-draft`, {
      frontmatter: { draft: true, date: '2026-10-13' },
    }),
  )

  const allPosts = getAllBlogPosts().filter((post) => post.slug.startsWith(prefix))
  const firstPage = getBlogListData(allPosts, { source: 'human', category: 'tech', sort: 'newest', page: 1 })
  const secondPage = getBlogListData(allPosts, { source: 'human', category: 'tech', sort: 'newest', page: 2 })
  const allSources = getBlogListData(allPosts, { source: 'all', category: 'tech' })

  assert.equal(allPosts.length, 13)
  assert.equal(firstPage.sourcePosts.length, 11)
  assert.deepEqual(firstPage.categoryCounts, { tech: 10, tinkering: 0, thoughts: 1 })
  assert.equal(firstPage.posts.length, 8)
  assert.equal(secondPage.posts.length, 2)
  assert.deepEqual(
    secondPage.posts.map((post) => post.slug),
    [`${prefix}-human-2`, `${prefix}-human-1`],
  )
  assert.equal(firstPage.totalPages, 2)
  assert.deepEqual(allSources.categoryCounts, { tech: 11, tinkering: 0, thoughts: 1 })
  assert.equal(allSources.sourcePosts.length, 12)
  assert.equal(
    allSources.posts.some((post) => post.slug === `${prefix}-ai`),
    true,
  )
})

test('本地 drafts 不进入文章读取、标签、RSS 或 sitemap', async (t) => {
  const slug = `test-private-draft-${randomUUID()}`
  const tag = `${slug}-topic`
  t.after(
    createBlogPostFixture(slug, {
      directory: 'drafts',
      frontmatter: { aiGenerated: true, draft: true, tags: [tag] },
    }),
  )

  assert.equal(getBlogPost(slug), undefined)
  assert.equal(
    getAllBlogPosts().some((post) => post.slug === slug),
    false,
  )
  assert.equal(
    getAllBlogTags().some((item) => item.tag === tag),
    false,
  )
  assert.equal((await getRss().text()).includes(slug), false)
  assert.equal(
    sitemap().some((entry) => entry.url.includes(slug)),
    false,
  )
})

test('扩展后的 fixture 保留默认字段，已有正文不覆盖', (t) => {
  const slug = `test-fixture-source-${randomUUID()}`
  t.after(createBlogPostFixture(slug))
  const postPath = path.join(process.cwd(), 'content', 'blog', slug, 'post.mdx')
  const original = fs.readFileSync(postPath, 'utf8')

  assert.equal(getBlogPost(slug)?.title, '测试文章')
  assert.equal(getBlogPost(slug)?.aiGenerated, false)
  assert.throws(() => createBlogPostFixture(slug, { content: '不应覆盖的正文' }), /已存在，拒绝覆盖/)
  assert.equal(fs.readFileSync(postPath, 'utf8'), original)
})
