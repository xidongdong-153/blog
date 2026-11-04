/* eslint-disable test/no-import-node-test */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { GET as getRss } from '@/app/rss.xml/route'
import sitemap from '@/app/sitemap'
import { app } from '@/server/app'
import { getCommentsBySlug } from '@/server/modules/comments/comments.service'
import { getManagedPost, withdrawPost } from '@/server/modules/posts/posts.service'
import { visitorsService } from '@/server/modules/visitors/visitors.service'
import { createBlogPostFixture } from '@/test/fixtures/content'
import { getAllBlogPosts, getAllBlogTags, getBlogListData, getBlogPost } from './content'

test('公开数据库文章的来源、标签与摘要开关独立', async (t) => {
  const prefix = `test-source-${randomUUID()}`
  const tag = `${prefix}-topic`
  for (const aiGenerated of [false, true]) {
    const slug = `${prefix}-${aiGenerated ? 'ai' : 'human'}`
    t.after(await createBlogPostFixture(slug, { frontmatter: { aiGenerated, tags: [tag], disableAiSummary: true } }))
    const post = await getBlogPost(slug)
    assert.ok(post)
    assert.equal(post.aiGenerated, aiGenerated)
    assert.equal(post.disableAiSummary, true)
    assert.deepEqual(post.tags, [tag])
  }
  assert.deepEqual(
    (await getAllBlogTags()).filter((item) => item.tag === tag),
    [{ tag, count: 2 }],
  )
})

test('公开读取排除草稿，来源过滤发生在分类、排序和八篇分页之前', async (t) => {
  const prefix = `test-source-page-${randomUUID()}`
  for (let day = 1; day <= 10; day++) {
    t.after(
      await createBlogPostFixture(`${prefix}-human-${day}`, {
        frontmatter: { date: `2026-10-${String(day).padStart(2, '0')}` },
      }),
    )
  }
  t.after(
    await createBlogPostFixture(`${prefix}-thoughts`, { frontmatter: { category: 'thoughts', date: '2026-10-11' } }),
  )
  t.after(await createBlogPostFixture(`${prefix}-ai`, { frontmatter: { aiGenerated: true, date: '2026-10-12' } }))
  t.after(await createBlogPostFixture(`${prefix}-draft`, { frontmatter: { draft: true, date: '2026-10-13' } }))
  const allPosts = (await getAllBlogPosts()).filter((post) => post.slug.startsWith(prefix))
  const firstPage = getBlogListData(allPosts, { source: 'human', category: 'tech', page: 1 })
  const secondPage = getBlogListData(allPosts, { source: 'human', category: 'tech', page: 2 })
  const allSources = getBlogListData(allPosts, { source: 'all', category: 'tech' })
  assert.equal(allPosts.length, 12)
  assert.equal(firstPage.sourcePosts.length, 11)
  assert.deepEqual(firstPage.categoryCounts, { tech: 10, tinkering: 0, thoughts: 1 })
  assert.equal(firstPage.posts.length, 8)
  assert.deepEqual(
    secondPage.posts.map((post) => post.slug),
    [`${prefix}-human-2`, `${prefix}-human-1`],
  )
  assert.equal(firstPage.totalPages, 2)
  assert.deepEqual(allSources.categoryCounts, { tech: 11, tinkering: 0, thoughts: 1 })
})

test('数据库草稿不进入详情、标签、RSS 或 sitemap', async (t) => {
  const slug = `test-private-draft-${randomUUID()}`
  const tag = `private-${randomUUID()}`
  t.after(await createBlogPostFixture(slug, { frontmatter: { draft: true, tags: [tag] } }))
  assert.equal(await getBlogPost(slug), undefined)
  assert.equal(
    (await getAllBlogPosts()).some((post) => post.slug === slug),
    false,
  )
  assert.equal(
    (await getAllBlogTags()).some((item) => item.tag === tag),
    false,
  )
  assert.equal((await (await getRss()).text()).includes(slug), false)
  assert.equal(
    (await sitemap()).some((entry) => entry.url.includes(slug)),
    false,
  )
})

test('数据库 fixture 不覆盖已有文章', async (t) => {
  const slug = `test-fixture-${randomUUID()}`
  t.after(await createBlogPostFixture(slug, { content: '保留正文' }))
  await assert.rejects(createBlogPostFixture(slug, { content: '不应覆盖' }))
  assert.equal((await getBlogPost(slug))?.content, '保留正文')
})

test('撤回文章后评论和访客接口均不再暴露文章', async (t) => {
  const slug = `withdraw-${randomUUID()}`
  t.after(await createBlogPostFixture(slug))
  const post = await getManagedPost(slug)
  const sessionId = `withdraw-session-${randomUUID()}`
  visitorsService.registerSession({ sessionId, connectionId: sessionId, visitorId: randomUUID(), articleSlug: slug })
  t.after(() => visitorsService.removeSession(sessionId, sessionId))
  await withdrawPost(post.id, post.revision)
  await assert.rejects(
    getCommentsBySlug(slug),
    (error: unknown) => error instanceof Error && error.message.includes('文章不存在'),
  )
  assert.equal((await app.request(`/api/visitors/stats?slug=${slug}`)).status, 400)
  const stats = await (await app.request('/api/visitors/stats')).json()
  assert.equal(Object.hasOwn(stats.articleViewerCounts, slug), false)
  assert.equal((await (await getRss()).text()).includes(slug), false)
})
