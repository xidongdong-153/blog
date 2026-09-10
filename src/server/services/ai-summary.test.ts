/* eslint-disable test/no-import-node-test */
import type { BlogPost } from '@/lib/content'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import test from 'node:test'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { computeArticleContentHash } from '@/lib/ai-summary'
import { encryptCredential } from '@/server/infra/ai/credential-crypto'
import { createDatabase } from '@/server/infra/db/client'
import { aiSummaryConfig } from '@/server/infra/db/schema/ai'
import {
  generateSummaryForPost,
  getArticleSummaryBySlug,
  getReadySummaryConfig,
  syncAllArticleSummaries,
  upsertArticleSummary,
  validateSummaryText,
} from './ai-summary'
import { AI_CONFIG_ID } from './ai-summary-config'

const MOCK_SUMMARY_TEXT =
  '本文深入探讨了现代化前端工程化与全栈架构的最佳实践。通过合理的模块化设计、严密的类型检查以及完善的跨层数据流管理，系统能够在高并发与复杂业务场景下维持卓越的性能表现与长期可维护性。同时结合实际业务案例，梳理了关键路径上的性能瓶颈与规避方案。'

test('AI 摘要服务综合测试', async (t) => {
  const masterKey = crypto.randomBytes(32).toString('base64')
  process.env.AI_CREDENTIAL_ENCRYPTION_KEY = masterKey

  const testDbFile = `file:test-ai-summary-${crypto.randomBytes(4).toString('hex')}.db`
  const { client, db: testDb } = createDatabase(testDbFile)

  // 应用当前迁移
  await migrate(testDb, { migrationsFolder: './src/server/infra/db/migrations' })

  // 本地 mock HTTP upstream 服务
  let mockHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void = () => {}
  const server = http.createServer((req, res) => mockHandler(req, res))

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })

  const port = (server.address() as { port: number }).port
  const mockBaseUrl = `http://127.0.0.1:${port}/v1`

  t.after(async () => {
    client.close()
    server.close()
    const filePath = testDbFile.replace('file:', '')
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
      } catch {}
    }
  })

  await t.test('1. validateSummaryText 文本边界与 Markdown 拦截', () => {
    // 空文本
    assert.equal(validateSummaryText('').valid, false)
    assert.equal(validateSummaryText('   \n  ').valid, false)

    // Markdown 标题
    assert.equal(validateSummaryText(`### 标题\n${MOCK_SUMMARY_TEXT}`).valid, false)

    // Markdown 列表
    assert.equal(validateSummaryText(`- 第一项\n${MOCK_SUMMARY_TEXT}`).valid, false)
    assert.equal(validateSummaryText(`1. 第一项\n${MOCK_SUMMARY_TEXT}`).valid, false)

    // Markdown 代码块
    assert.equal(validateSummaryText(`\`\`\`ts\nconst a = 1\n\`\`\`\n${MOCK_SUMMARY_TEXT}`).valid, false)

    // 字数过少
    assert.equal(validateSummaryText('太短的摘要。').valid, false)

    // 字数超限
    const tooLong = '这是一段非常长的测试文本。'.repeat(30)
    assert.equal(validateSummaryText(tooLong).valid, false)

    // 正常纯文本摘要通过
    const validRes = validateSummaryText(MOCK_SUMMARY_TEXT)
    assert.equal(validRes.valid, true)
  })

  await t.test('2. 摘要缓存查询与 upsert', async () => {
    const slug = 'test-post-1'
    const content = '这是文章正文内容'
    const hash = computeArticleContentHash(content)

    // 初始查空
    const initial = await getArticleSummaryBySlug(slug, testDb)
    assert.equal(initial, null)

    // 写入
    const inserted = await upsertArticleSummary(
      {
        slug,
        contentHash: hash,
        summary: MOCK_SUMMARY_TEXT,
        protocol: 'openai-completions',
        model: 'gpt-4o-mini',
      },
      testDb,
    )
    assert.equal(inserted.slug, slug)
    assert.equal(inserted.summary, MOCK_SUMMARY_TEXT)
    assert.equal(inserted.contentHash, hash)

    // 再次查询
    const queried = await getArticleSummaryBySlug(slug, testDb)
    assert.notEqual(queried, null)
    assert.equal(queried?.contentHash, hash)

    // 更新内容（upsert）
    const newHash = computeArticleContentHash(`${content}（修改后）`)
    const updatedSummary = `${MOCK_SUMMARY_TEXT}经过了二次修订。`
    await upsertArticleSummary(
      {
        slug,
        contentHash: newHash,
        summary: updatedSummary,
        protocol: 'openai-completions',
        model: 'gpt-4o-mini',
      },
      testDb,
    )

    const queriedUpdated = await getArticleSummaryBySlug(slug, testDb)
    assert.equal(queriedUpdated?.contentHash, newHash)
    assert.equal(queriedUpdated?.summary, updatedSummary)
  })

  await t.test('3. getReadySummaryConfig 仅在 ready 且有效解密时返回', async () => {
    // 未配置
    const none = await getReadySummaryConfig(testDb)
    assert.equal(none, null)

    // 配置为 needs_check
    const enc = encryptCredential('test-api-key', masterKey)
    await testDb.insert(aiSummaryConfig).values({
      id: AI_CONFIG_ID,
      protocol: 'openai-completions',
      baseUrl: mockBaseUrl,
      modelId: 'gpt-4o-mini',
      credentialCiphertext: enc.ciphertext,
      credentialIv: enc.iv,
      credentialAuthTag: enc.authTag,
      credentialMask: enc.mask,
      status: 'needs_check',
      revision: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const notReady = await getReadySummaryConfig(testDb)
    assert.equal(notReady, null)

    // 改为 ready
    await testDb.update(aiSummaryConfig).set({ status: 'ready' }).where(eq(aiSummaryConfig.id, AI_CONFIG_ID))

    const ready = await getReadySummaryConfig(testDb)
    assert.notEqual(ready, null)
    assert.equal(ready?.apiKey, 'test-api-key')
    assert.equal(ready?.protocol, 'openai-completions')
  })

  await t.test('4. 三种协议驱动同一生成流程', async () => {
    const post: BlogPost = {
      slug: 'protocol-post',
      title: '协议测试文章',
      description: '描述',
      category: 'tech',
      date: '2026-09-10',
      updatedDate: '',
      heroImage: '',
      tags: [],
      draft: false,
      disableAiSummary: false,
      content: '详细文章正文，用于验证不同协议能够被正确分发并生成符合要求的中文摘要。',
    }

    // 4.1 Chat Completions
    mockHandler = (req, res) => {
      assert.equal(req.method, 'POST')
      assert.equal(req.url, '/v1/chat/completions')
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          id: 'chatcmpl-test',
          created: 1788912000,
          model: 'test-chat',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: MOCK_SUMMARY_TEXT },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
        }),
      )
    }

    const res1 = await generateSummaryForPost(
      post,
      {
        protocol: 'openai-completions',
        baseUrl: mockBaseUrl,
        modelId: 'test-chat',
        apiKey: 'key-1',
      },
      { database: testDb },
    )
    assert.equal(res1.summary, MOCK_SUMMARY_TEXT)

    // 4.2 OpenAI Responses
    mockHandler = (req, res) => {
      assert.equal(req.url, '/v1/responses')
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          id: 'resp-test',
          object: 'response',
          created_at: 1788912000,
          status: 'completed',
          model: 'test-resp',
          output: [
            {
              type: 'message',
              id: 'msg-test',
              status: 'completed',
              role: 'assistant',
              content: [{ type: 'output_text', text: MOCK_SUMMARY_TEXT, annotations: [] }],
            },
          ],
          incomplete_details: null,
          usage: { input_tokens: 3, output_tokens: 4, total_tokens: 7 },
        }),
      )
    }

    const res2 = await generateSummaryForPost(
      post,
      {
        protocol: 'openai-responses',
        baseUrl: mockBaseUrl,
        modelId: 'test-resp',
        apiKey: 'key-2',
      },
      { database: testDb },
    )
    assert.equal(res2.summary, MOCK_SUMMARY_TEXT)

    // 4.3 Anthropic Messages
    mockHandler = (req, res) => {
      assert.equal(req.url, '/v1/messages')
      assert.equal(req.headers['x-api-key'], 'key-3')
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          type: 'message',
          id: 'msg-test',
          model: 'claude-3-haiku',
          role: 'assistant',
          content: [{ type: 'text', text: MOCK_SUMMARY_TEXT }],
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 3, output_tokens: 4 },
        }),
      )
    }

    const res3 = await generateSummaryForPost(
      post,
      {
        protocol: 'anthropic-messages',
        baseUrl: mockBaseUrl,
        modelId: 'claude-3-haiku',
        apiKey: 'key-3',
      },
      { database: testDb },
    )
    assert.equal(res3.summary, MOCK_SUMMARY_TEXT)
  })

  await t.test('5. 异常情况失败开放：空文本、截断、认证失败不覆盖旧摘要', async () => {
    const post: BlogPost = {
      slug: 'error-safe-post',
      title: '异常安全文章',
      description: '',
      category: 'tech',
      date: '2026-09-10',
      updatedDate: '',
      heroImage: '',
      tags: [],
      draft: false,
      disableAiSummary: false,
      content: '已有合法正文内容',
    }

    // 先存入一条合法的初始旧摘要
    const oldHash = computeArticleContentHash(post.content)
    const oldSummaryText = '这是一篇关于异常边界测试的合法旧摘要。保证在外部服务出错时原样保留，绝不被破坏。'
    await upsertArticleSummary(
      {
        slug: post.slug,
        contentHash: oldHash,
        summary: oldSummaryText,
        protocol: 'openai-completions',
        model: 'old-model',
      },
      testDb,
    )

    // 修改正文，使哈希不一致
    const modifiedPost: BlogPost = {
      ...post,
      content: '修改后的文章正文，触发重新生成',
    }

    // 模拟截断 (finish_reason: length)
    mockHandler = (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          choices: [
            {
              message: { role: 'assistant', content: '未完成的' },
              finish_reason: 'length',
            },
          ],
        }),
      )
    }

    await assert.rejects(async () => {
      await generateSummaryForPost(
        modifiedPost,
        {
          protocol: 'openai-completions',
          baseUrl: mockBaseUrl,
          modelId: 'test-chat',
          apiKey: 'key',
        },
        { database: testDb },
      )
    })

    // 确认旧摘要依然完好
    const kept = await getArticleSummaryBySlug(post.slug, testDb)
    assert.equal(kept?.summary, oldSummaryText)
    assert.equal(kept?.contentHash, oldHash)

    // 模拟 401 认证失败
    mockHandler = (_req, res) => {
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'Invalid API Key' } }))
    }

    await assert.rejects(async () => {
      await generateSummaryForPost(
        modifiedPost,
        {
          protocol: 'openai-completions',
          baseUrl: mockBaseUrl,
          modelId: 'test-chat',
          apiKey: 'key',
        },
        { database: testDb },
      )
    })

    // 再次确认旧摘要没有被清空或覆盖
    const keptAgain = await getArticleSummaryBySlug(post.slug, testDb)
    assert.equal(keptAgain?.summary, oldSummaryText)
  })

  await t.test('6. syncAllArticleSummaries 全站同步与统计汇总', async () => {
    // 准备 4 篇文章：
    // 1: disableAiSummary = true (跳过 -> disabled)
    // 2: 已有匹配缓存 (跳过 -> skipped)
    // 3: 成功生成 (-> generated)
    // 4: 生成报错 (失败开放 -> failed)
    const postDisabled: BlogPost = {
      slug: 'p-disabled',
      title: '禁用摘要文章',
      description: '',
      category: 'tech',
      date: '2026-09-10',
      updatedDate: '',
      heroImage: '',
      tags: [],
      draft: false,
      disableAiSummary: true,
      content: '正文',
    }

    const postCached: BlogPost = {
      slug: 'p-cached',
      title: '已缓存文章',
      description: '',
      category: 'tech',
      date: '2026-09-10',
      updatedDate: '',
      heroImage: '',
      tags: [],
      draft: false,
      disableAiSummary: false,
      content: '已缓存正文',
    }
    await upsertArticleSummary(
      {
        slug: postCached.slug,
        contentHash: computeArticleContentHash(postCached.content),
        summary: MOCK_SUMMARY_TEXT,
        protocol: 'openai-completions',
        model: 'm',
      },
      testDb,
    )

    const postToGen: BlogPost = {
      slug: 'p-to-gen',
      title: '需生成文章',
      description: '',
      category: 'tech',
      date: '2026-09-10',
      updatedDate: '',
      heroImage: '',
      tags: [],
      draft: false,
      disableAiSummary: false,
      content: '需要生成摘要的正文',
    }

    const postToFail: BlogPost = {
      slug: 'p-to-fail',
      title: '生成失败文章',
      description: '',
      category: 'tech',
      date: '2026-09-10',
      updatedDate: '',
      heroImage: '',
      tags: [],
      draft: false,
      disableAiSummary: false,
      content: '生成失败的正文',
    }

    let requestCount = 0
    mockHandler = (req, res) => {
      requestCount++
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        if (body.includes('生成失败的正文')) {
          res.writeHead(500, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: { message: 'Internal Server Error' } }))
        } else {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(
            JSON.stringify({
              id: 'chatcmpl-test',
              created: 1788912000,
              model: 'gpt-4o-mini',
              choices: [
                {
                  index: 0,
                  message: { role: 'assistant', content: MOCK_SUMMARY_TEXT },
                  finish_reason: 'stop',
                },
              ],
              usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
            }),
          )
        }
      })
    }

    const testPosts = [postDisabled, postCached, postToGen, postToFail]
    const logs: string[] = []
    const summaryResult = await syncAllArticleSummaries({
      database: testDb,
      posts: testPosts,
      logger: {
        info: (m) => logs.push(m),
        warn: (m) => logs.push(m),
        error: (m) => logs.push(m),
      },
    })

    assert.equal(summaryResult.total, 4)
    assert.equal(summaryResult.disabled, 1)
    assert.equal(summaryResult.skipped, 1)
    assert.equal(summaryResult.generated, 1)
    assert.equal(summaryResult.failed, 1)

    // 确认已为 p-to-gen 写入摘要
    const p3 = await getArticleSummaryBySlug('p-to-gen', testDb)
    assert.equal(p3?.summary, MOCK_SUMMARY_TEXT)
    assert.equal(requestCount > 0, true)

    // 确认日志不包含任何 prompt、正文或密钥
    for (const log of logs) {
      assert.equal(log.includes('需要生成摘要的正文'), false)
      assert.equal(log.includes('test-api-key'), false)
    }
  })
})
