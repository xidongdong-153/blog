/* eslint-disable test/no-import-node-test */
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import { eq } from 'drizzle-orm'
import { db } from '@/server/infra/db/client'
import { aiSummaryConfig } from '@/server/infra/db/schema/ai'
import {
  AI_CONFIG_ID,
  AiSummaryConfigError,
  checkAndEnableAiSummaryConfig,
  clearAiSummaryCredential,
  getAiSummaryConfig,
  saveAiSummaryConfig,
} from './summary-config.service.ts'

test('AI 摘要模型配置 Service 综合测试', async (t) => {
  const masterKey = crypto.randomBytes(32).toString('base64')
  process.env.AI_CREDENTIAL_ENCRYPTION_KEY = masterKey

  // 清理测试数据
  await db.delete(aiSummaryConfig).where(eq(aiSummaryConfig.id, AI_CONFIG_ID))

  await t.test('1. 初始状态读取为 null', async () => {
    const config = await getAiSummaryConfig()
    assert.equal(config, null)
  })

  await t.test('2. 保存新配置并加密凭据，校验 DTO 脱敏', async () => {
    const rawApiKey = 'sk-test-secret-key-123456789'
    const saved = await saveAiSummaryConfig({
      protocol: 'openai-completions',
      baseUrl: 'http://127.0.0.1:4400/v1',
      modelId: 'gpt-4o-mini',
      apiKey: rawApiKey,
    })

    // 校验 DTO 字段
    assert.equal(saved.protocol, 'openai-completions')
    assert.equal(saved.baseUrl, 'http://127.0.0.1:4400/v1')
    assert.equal(saved.modelId, 'gpt-4o-mini')
    assert.equal(saved.hasCredential, true)
    assert.equal(saved.status, 'needs_check')
    assert.equal(saved.revision, 1)
    assert.equal(saved.checkedAt, null)

    // 验证 DTO 中绝对不存在密文相关字段
    const savedObj = saved as unknown as Record<string, unknown>
    assert.equal(savedObj.credentialCiphertext, undefined)
    assert.equal(savedObj.credentialIv, undefined)
    assert.equal(savedObj.credentialAuthTag, undefined)
    assert.equal(savedObj.apiKey, undefined)

    // 验证底层数据库
    const [rawRecord] = await db.select().from(aiSummaryConfig).where(eq(aiSummaryConfig.id, AI_CONFIG_ID)).limit(1)
    assert(rawRecord)
    assert.notEqual(rawRecord.credentialCiphertext, rawApiKey)
    assert.equal(rawRecord.credentialCiphertext?.includes(rawApiKey), false)
    assert(rawRecord.credentialIv)
    assert(rawRecord.credentialAuthTag)
  })

  await t.test('3. 更新配置但不传 apiKey，必须保留旧凭据', async () => {
    const updated = await saveAiSummaryConfig({
      protocol: 'openai-responses',
      baseUrl: 'http://127.0.0.1:4400/v1',
      modelId: 'gpt-4.1',
      // apiKey 为空，保留旧凭据
    })

    assert.equal(updated.protocol, 'openai-responses')
    assert.equal(updated.modelId, 'gpt-4.1')
    assert.equal(updated.hasCredential, true)
    assert.equal(updated.revision, 2)
    assert.equal(updated.status, 'needs_check')

    // 数据库中密文和 IV 依然保留
    const [rawRecord] = await db.select().from(aiSummaryConfig).where(eq(aiSummaryConfig.id, AI_CONFIG_ID)).limit(1)
    assert(rawRecord.credentialCiphertext)
    assert(rawRecord.credentialIv)
  })

  await t.test('4. 显式清除凭据', async () => {
    const cleared = await clearAiSummaryCredential()

    assert.equal(cleared.hasCredential, false)
    assert.equal(cleared.credentialMask, null)
    assert.equal(cleared.status, 'needs_check')
    assert.equal(cleared.revision, 3)

    const [rawRecord] = await db.select().from(aiSummaryConfig).where(eq(aiSummaryConfig.id, AI_CONFIG_ID)).limit(1)
    assert.equal(rawRecord.credentialCiphertext, null)
    assert.equal(rawRecord.credentialIv, null)
    assert.equal(rawRecord.credentialAuthTag, null)
  })

  await t.test('5. 未配置凭据时测试连接失败', async () => {
    await assert.rejects(
      () => checkAndEnableAiSummaryConfig(),
      (err) => err instanceof AiSummaryConfigError && err.code === 'NO_CREDENTIAL',
    )
  })

  await t.test('6. 重新配置凭据并模拟连接测试成功，自动更新为 ready', async () => {
    await saveAiSummaryConfig({
      protocol: 'openai-completions',
      baseUrl: 'http://127.0.0.1:4400/v1',
      modelId: 'gpt-4o-mini',
      apiKey: 'sk-new-valid-key',
    })

    // Mock fetch 模拟上游正确响应
    const mockFetch: typeof globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          id: 'chatcmpl-test',
          created: 1788912000,
          model: 'gpt-4o-mini',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: '摘要测试成功' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const enabled = await checkAndEnableAiSummaryConfig({ fetch: mockFetch })
    assert.equal(enabled.status, 'ready')
    assert(enabled.checkedAt !== null)

    const [rawRecord] = await db.select().from(aiSummaryConfig).where(eq(aiSummaryConfig.id, AI_CONFIG_ID)).limit(1)
    assert.equal(rawRecord.status, 'ready')
    assert(rawRecord.checkedAt !== null)
  })

  await t.test('7. 并发测试冲突：测试期间配置被修改，旧测试不能标记为 ready', async () => {
    // 先保存一次使 revision 变为 5，状态为 needs_check
    await saveAiSummaryConfig({
      protocol: 'openai-completions',
      baseUrl: 'http://127.0.0.1:4400/v1',
      modelId: 'gpt-4o-mini',
      apiKey: 'sk-concurrency-key',
    })

    // Mock fetch 在返回前，故意在后台保存新的配置以增加 revision
    const concurrentMockFetch: typeof globalThis.fetch = async () => {
      // 在模拟上游响应延迟期间，发生了一次新保存
      await saveAiSummaryConfig({
        protocol: 'openai-completions',
        baseUrl: 'http://127.0.0.1:4400/v1',
        modelId: 'gpt-4o-mini',
        apiKey: 'sk-new-mod-key',
      })

      return new Response(
        JSON.stringify({
          id: 'chatcmpl-test',
          created: 1788912000,
          model: 'gpt-4o-mini',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: '摘要测试成功' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    await assert.rejects(
      () => checkAndEnableAiSummaryConfig({ fetch: concurrentMockFetch }),
      (err) => err instanceof AiSummaryConfigError && err.code === 'REVISION_CONFLICT',
    )

    // 确认配置状态仍然是 needs_check
    const config = await getAiSummaryConfig()
    assert.equal(config?.status, 'needs_check')
  })

  // 清理测试数据
  await db.delete(aiSummaryConfig).where(eq(aiSummaryConfig.id, AI_CONFIG_ID))
})
