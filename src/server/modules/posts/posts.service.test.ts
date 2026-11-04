/* eslint-disable test/no-import-node-test */
import type { TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createEmptyPost } from '@/lib/posts'
import { createDatabase } from '@/server/infra/db/client'
import { articleSummaries, comments, user } from '@/server/infra/db/schema'
import { validatePostMdx } from './posts-mdx'
import {
  createPost,
  deletePost,
  findPublishedPost,
  getManagedPost,
  listPublishedPosts,
  PostServiceError,
  publishPost,
  savePost,
  withdrawPost,
} from './posts.service'

async function database(t: TestContext) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'blog-post-service-'))
  const bundle = createDatabase(`file:${path.join(directory, 'test.db')}`)
  t.after(() => {
    bundle.client.close()
    rmSync(directory, { recursive: true, force: true })
  })
  await migrate(bundle.db, { migrationsFolder: './src/server/infra/db/migrations' })
  return bundle.db
}

function input(slug = 'first-post') {
  const data = createEmptyPost()
  data.slug = slug
  data.document.title = '第一篇文章'
  data.document.content = '# 正文\n\n文章内容。'
  return data
}

function hasStatus(status: number) {
  return (error: unknown) => error instanceof PostServiceError && error.statusCode === status
}

test('工作稿、公开版本与撤回相互隔离，文章身份和地址保持稳定', async (t) => {
  const db = await database(t)
  let post = await createPost(input(), db)
  assert.equal(await findPublishedPost(post.slug, db), undefined)
  assert.deepEqual(await listPublishedPosts(db), [])
  post = await publishPost(post.id, post.revision, db)
  const published = await findPublishedPost(post.slug, db)
  assert.equal(published?.title, '第一篇文章')
  assert.equal(published?.commentKey, post.id)
  assert.equal(post.hasUnpublishedChanges, false)
  post = await savePost(
    post.id,
    post.revision,
    { slug: post.slug, document: { ...post.document, title: '待发布标题', tags: ['私密标签'], content: '修改正文' } },
    db,
  )
  assert.equal(post.hasUnpublishedChanges, true)
  assert.equal((await findPublishedPost(post.slug, db))?.title, '第一篇文章')
  assert.deepEqual((await findPublishedPost(post.slug, db))?.tags, [])
  await assert.rejects(
    savePost(post.id, post.revision, { slug: 'renamed-post', document: post.document }, db),
    hasStatus(400),
  )
  post = await publishPost(post.id, post.revision, db)
  assert.equal((await findPublishedPost(post.slug, db))?.title, '待发布标题')
  post = await withdrawPost(post.id, post.revision, db)
  assert.equal(await findPublishedPost(post.slug, db), undefined)
  assert.equal((await getManagedPost(post.id, db)).document.content, '修改正文')
  assert.equal(post.slugLocked, true)
  post = await publishPost(post.id, post.revision, db)
  assert.equal((await findPublishedPost(post.slug, db))?.commentKey, post.id)
})

test('并发修改和重名返回冲突，校验失败保留线上内容', async (t) => {
  const db = await database(t)
  let post = await createPost(input(), db)
  await assert.rejects(createPost(input(), db), hasStatus(409))
  post = await publishPost(post.id, post.revision, db)
  const oldRevision = post.revision
  post = await savePost(
    post.id,
    oldRevision,
    { slug: post.slug, document: { ...post.document, content: '<Broken' } },
    db,
  )
  await assert.rejects(savePost(post.id, oldRevision, input(), db), hasStatus(409))
  await assert.rejects(publishPost(post.id, oldRevision, db), hasStatus(409))
  await assert.rejects(publishPost(post.id, post.revision, db), hasStatus(400))
  assert.equal((await findPublishedPost(post.slug, db))?.content, input().document.content)
  await assert.rejects(deletePost(post.id, oldRevision, db), hasStatus(409))
  assert.equal((await getManagedPost(post.id, db)).revision, post.revision)
})

test('发布校验期间的并发保存不能被旧版本覆盖', async (t) => {
  const db = await database(t)
  const post = await createPost(input(), db)
  const publishing = publishPost(post.id, post.revision, db)
  const changed = await savePost(
    post.id,
    post.revision,
    { slug: post.slug, document: { ...post.document, content: '并发修改' } },
    db,
  )
  await assert.rejects(publishing, hasStatus(409))
  assert.equal(await findPublishedPost(post.slug, db), undefined)
  assert.equal((await getManagedPost(post.id, db)).revision, changed.revision)
})

test('永久删除在事务内清理评论、摘要和文章', async (t) => {
  const db = await database(t)
  const post = await createPost(input(), db)
  await db.insert(user).values({ id: 'post-test-user', name: '访客', email: 'post-test@example.com' })
  await db.insert(comments).values({
    targetKey: post.id,
    userId: 'post-test-user',
    content: '评论',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  await db.insert(articleSummaries).values({
    slug: post.slug,
    contentHash: 'hash',
    summary: '摘要',
    protocol: 'openai-completions',
    model: 'test',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  await deletePost(post.id, post.revision, db)
  await assert.rejects(getManagedPost(post.id, db), hasStatus(404))
  assert.deepEqual(await db.select().from(comments).where(eq(comments.targetKey, post.id)), [])
  assert.deepEqual(await db.select().from(articleSummaries).where(eq(articleSummaries.slug, post.slug)), [])
})

test('MDX 保留技术文章语法，拒绝脚本、未知组件和危险链接', async () => {
  await validatePostMdx(
    '## 标题\n\n**中文**与 $x^2$\n\n<Callout type="tip" title="提示">\n\n内容\n\n</Callout>\n\n```js\nconst x = 1\n```',
  )
  for (const content of [
    '{globalThis.process.exit()}',
    'import X from "x"',
    '<script>alert(1)</script>',
    '<Unknown />',
    '<Callout {...props} />',
    '<img src="javascript:alert(1)" />',
    '<a onClick="alert(1)">x</a>',
    '[点击](javascript:alert%281%29)',
    '<Collapse defaultOpen={true}>内容</Collapse>',
  ]) {
    await assert.rejects(validatePostMdx(content), (error) => error instanceof Error, content)
  }
})

test('正文、日期、元数据和地址在服务端校验', async (t) => {
  const db = await database(t)
  const value = input()
  for (const invalid of [
    { ...value, slug: '../escape' },
    { ...value, document: { ...value.document, date: '2026-02-30' } },
    { ...value, document: { ...value.document, heroColor: 'red; } body {' } },
    { ...value, document: { ...value.document, content: '中'.repeat(400000) } },
    { ...value, document: { ...value.document, unknown: true } },
  ])
    await assert.rejects(createPost(invalid, db), hasStatus(400))
})
