/* eslint-disable test/no-import-node-test */
import type { TestContext } from 'node:test'
import assert from 'node:assert/strict'
import test from 'node:test'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { createEmptyPost } from '@/lib/posts'
import { createDatabase } from '@/server/infra/db/client'
import { exportPosts, importPosts, preflightImport } from './posts-transfer'
import { createPost, listManagedPosts, listPublishedPosts, publishPost, savePost } from './posts.service'

async function database(t: TestContext) {
  const bundle = createDatabase('file::memory:')
  t.after(() => bundle.client.close())
  await migrate(bundle.db, { migrationsFolder: './src/server/infra/db/migrations' })
  return bundle.db
}

function input(slug = 'first-post') {
  const data = createEmptyPost()
  data.slug = slug
  data.document.title = '含中文的标题'
  data.document.description = '保留元数据'
  data.document.content = '\n## 小节\n\n**中文**与公式 $x^2$。\n\n<Callout title="提示">内容</Callout>\n'
  data.document.tags = ['React', '中文']
  data.document.aiGenerated = true
  data.document.disableAiSummary = true
  data.document.series = { id: 'pi-agent-desktop', order: 2, group: '核心架构' }
  return data
}

test('MDX 导出再导入保留正文及元数据，始终导入为草稿', async (t) => {
  const source = await database(t)
  const target = await database(t)
  const original = input()
  const created = await createPost(original, source)
  const exported = await exportPosts('draft', created.id, source)
  assert.equal(exported.filename, 'first-post.mdx')
  const candidates = await preflightImport(exported.filename, exported.data, target)
  assert.deepEqual(candidates[0].errors, [])
  assert.deepEqual(candidates[0].input, original)
  await importPosts(
    candidates.map((candidate) => candidate.input),
    target,
  )
  assert.deepEqual(await listPublishedPosts(target), [])
  assert.deepEqual((await listManagedPosts(target))[0].document, original.document)
})

test('工作稿与公开版本导出分别取正确快照，批量 ZIP 带版本信息', async (t) => {
  const db = await database(t)
  let post = await createPost(input(), db)
  post = await publishPost(post.id, post.revision, db)
  await savePost(post.id, post.revision, { slug: post.slug, document: { ...post.document, title: '未公开标题' } }, db)
  const draft = await exportPosts('draft', post.id, db)
  const published = await exportPosts('published', post.id, db)
  assert.ok(strFromU8(draft.data).includes('未公开标题'))
  assert.equal(strFromU8(published.data).includes('未公开标题'), false)
  const batch = await exportPosts('published', undefined, db)
  const files = unzipSync(batch.data)
  assert.equal(JSON.parse(strFromU8(files['manifest.json'])).version, 1)
  assert.ok(files['first-post/post.mdx'])
  const target = await database(t)
  assert.deepEqual((await preflightImport(batch.filename, batch.data, target))[0].errors, [])
})

test('批量重名失败不留下部分文章，预检后出现重名也拒绝执行', async (t) => {
  const db = await database(t)
  await createPost(input('existing'), db)
  await assert.rejects(importPosts([input('new-post'), input('existing')], db))
  assert.deepEqual(
    (await listManagedPosts(db)).map((post) => post.slug),
    ['existing'],
  )
  await assert.rejects(importPosts([input('duplicate'), input('duplicate')], db))
  assert.equal((await listManagedPosts(db)).length, 1)
  const exported = await exportPosts('draft', undefined, db)
  const candidates = await preflightImport(exported.filename, exported.data, db)
  assert.ok(candidates[0].errors.some((error) => error.includes('重复')))
})

test('导入拒绝脚本、非法 frontmatter 和错误编码，不执行正文', async (t) => {
  const db = await database(t)
  for (const source of [
    '---\ntitle: 标题\ndate: 2026-11-04\n---\n{globalThis.process.exit()}',
    '---\ntitle: 标题\ndate: 2026-02-30\n---\n正文',
    '---\ntitle: 标题\ndate: 2026-11-04\nunknown: true\n---\n正文',
    '---js\n({ title: process.exit() })\n---\n正文',
  ]) {
    const candidates = await preflightImport('test-post.mdx', strToU8(source), db)
    assert.ok(candidates[0].errors.length > 0)
  }
  const invalidUtf8 = await preflightImport('test-post.mdx', new Uint8Array([255, 254]), db)
  assert.ok(invalidUtf8[0].errors.length > 0)
  assert.equal((await listManagedPosts(db)).length, 0)
})

test('ZIP 拒绝越界路径、媒体附件、不受支持版本与超限条目', async (t) => {
  const db = await database(t)
  for (const files of [
    { '../outside/post.mdx': strToU8('x') },
    { '/absolute/post.mdx': strToU8('x') },
    { 'image.png': new Uint8Array([1]) },
    { 'manifest.json': strToU8('{"version":99}'), 'post.mdx': strToU8('x') },
    Object.fromEntries(Array.from({ length: 102 }, (_, index) => [`post-${index}.mdx`, strToU8('x')])),
  ])
    await assert.rejects(preflightImport('posts.zip', zipSync(files), db))
  const overLimit = zipSync({ 'huge.mdx': new Uint8Array(21 * 1024 * 1024) })
  await assert.rejects(preflightImport('posts.zip', overLimit, db))
})
