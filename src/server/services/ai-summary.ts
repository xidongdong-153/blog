import type { BlogPost } from '@/lib/content'
import type { SummaryProtocol } from '@/server/infra/ai/summary-model'
import type { AppDatabase } from '@/server/infra/db/client'
import type { ArticleSummaryRecord } from '@/server/infra/db/schema/ai'
import { generateText } from 'ai'
import { eq } from 'drizzle-orm'
import { computeArticleContentHash } from '@/lib/ai-summary'
import { getAllBlogPosts } from '@/lib/content'
import { decryptCredential, isMasterKeyConfigured } from '@/server/infra/ai/credential-crypto'
import {
  classifyAiError,
  createSummaryModel,
  isSupportedProtocol,
  SummaryModelError,
} from '@/server/infra/ai/summary-model'
import { db as defaultDb } from '@/server/infra/db/client'
import { aiSummaryConfig, articleSummaries } from '@/server/infra/db/schema/ai'
import { AI_CONFIG_ID } from './ai-summary-config'

export const SUMMARY_SYSTEM_PROMPT =
  '根据提供的中文技术文章生成准确摘要，只输出中文纯文本 2 至 3 句、约 120 至 180 字，不使用 Markdown、不添加“本文介绍”等空话，不编造正文没有的信息。'

export const MIN_SUMMARY_CHAR_LENGTH = 80
export const MAX_SUMMARY_CHAR_LENGTH = 260

export interface ReadySummaryConfig {
  protocol: SummaryProtocol
  baseUrl: string
  modelId: string
  apiKey: string
}

export interface SummaryValidationResult {
  valid: boolean
  reason?: string
}

/**
 * 校验生成的摘要纯文本：
 * 1. 非空；
 * 2. 不包含任何 Markdown 格式（标题、列表、代码围栏）；
 * 3. 长度在合理边界内（约 120 至 180 字，允许标点小幅浮动 80~260 字）。
 */
export function validateSummaryText(text: string): SummaryValidationResult {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return { valid: false, reason: '摘要文本为空' }
  }

  if (trimmed.includes('```')) {
    return { valid: false, reason: '摘要包含了代码块格式' }
  }

  if (/(?:^|\n)#{1,6}\s+/m.test(trimmed)) {
    return { valid: false, reason: '摘要包含了 Markdown 标题格式' }
  }

  if (/(?:^|\n)\s*[-*+]\s+/m.test(trimmed)) {
    return { valid: false, reason: '摘要包含了无序列表格式' }
  }

  if (/(?:^|\n)\s*\d+\.\s+/m.test(trimmed)) {
    return { valid: false, reason: '摘要包含了有序列表格式' }
  }

  const charCount = trimmed.length
  if (charCount < MIN_SUMMARY_CHAR_LENGTH || charCount > MAX_SUMMARY_CHAR_LENGTH) {
    return {
      valid: false,
      reason: `摘要字数偏离目标 (当前: ${charCount} 字，预期: 120~180 字，允许边界: ${MIN_SUMMARY_CHAR_LENGTH}~${MAX_SUMMARY_CHAR_LENGTH})`,
    }
  }

  return { valid: true }
}

/**
 * 查询文章详情页缓存的摘要记录，未查到返回 null。
 * 查询异常时不抛出错误，降级返回 null 保证正文正常渲染。
 */
export async function getArticleSummaryBySlug(
  slug: string,
  database: AppDatabase = defaultDb,
): Promise<ArticleSummaryRecord | null> {
  try {
    const records = await database.select().from(articleSummaries).where(eq(articleSummaries.slug, slug)).limit(1)

    return records[0] ?? null
  } catch {
    return null
  }
}

export interface UpsertArticleSummaryInput {
  slug: string
  contentHash: string
  summary: string
  protocol: SummaryProtocol
  model: string
}

/**
 * 插入或更新文章摘要缓存记录。
 */
export async function upsertArticleSummary(
  input: UpsertArticleSummaryInput,
  database: AppDatabase = defaultDb,
): Promise<ArticleSummaryRecord> {
  const now = new Date()

  await database
    .insert(articleSummaries)
    .values({
      slug: input.slug,
      contentHash: input.contentHash,
      summary: input.summary,
      protocol: input.protocol,
      model: input.model,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: articleSummaries.slug,
      set: {
        contentHash: input.contentHash,
        summary: input.summary,
        protocol: input.protocol,
        model: input.model,
        updatedAt: now,
      },
    })

  const records = await database.select().from(articleSummaries).where(eq(articleSummaries.slug, input.slug)).limit(1)

  return records[0]
}

/**
 * 读取当前数据库中已启用的 AI 摘要模型配置并解密凭据。
 * 若不存在、未处于 ready 状态、凭据损坏或密钥未就绪，返回 null。
 */
export async function getReadySummaryConfig(database: AppDatabase = defaultDb): Promise<ReadySummaryConfig | null> {
  try {
    if (!isMasterKeyConfigured()) {
      return null
    }

    const records = await database.select().from(aiSummaryConfig).where(eq(aiSummaryConfig.id, AI_CONFIG_ID)).limit(1)

    const config = records[0]
    if (!config || config.status !== 'ready') {
      return null
    }

    if (
      !config.credentialCiphertext ||
      !config.credentialIv ||
      !config.credentialAuthTag ||
      !config.protocol ||
      !isSupportedProtocol(config.protocol)
    ) {
      return null
    }

    const apiKey = decryptCredential({
      ciphertext: config.credentialCiphertext,
      iv: config.credentialIv,
      authTag: config.credentialAuthTag,
    })

    if (!apiKey || !apiKey.trim()) {
      return null
    }

    return {
      protocol: config.protocol as SummaryProtocol,
      baseUrl: config.baseUrl,
      modelId: config.modelId,
      apiKey: apiKey.trim(),
    }
  } catch {
    return null
  }
}

export interface GenerateSummaryOptions {
  database?: AppDatabase
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
}

/**
 * 为单篇文章调用 AI 模型生成摘要并写入缓存。
 */
export async function generateSummaryForPost(
  post: BlogPost,
  config: ReadySummaryConfig,
  options?: GenerateSummaryOptions,
): Promise<ArticleSummaryRecord> {
  const database = options?.database ?? defaultDb
  const timeoutMs = options?.timeoutMs ?? 60_000

  const model = createSummaryModel({
    protocol: config.protocol,
    baseURL: config.baseUrl,
    modelId: config.modelId,
    apiKey: config.apiKey,
    fetch: options?.fetch,
  })

  let result
  try {
    result = await generateText({
      model,
      system: SUMMARY_SYSTEM_PROMPT,
      prompt: post.content,
      maxOutputTokens: 300,
      maxRetries: 2,
      timeout: { totalMs: timeoutMs },
      telemetry: { isEnabled: false },
    })
  } catch (err) {
    throw classifyAiError(err)
  }

  if (result.finishReason !== 'stop') {
    throw new SummaryModelError(
      'UPSTREAM_TRUNCATED',
      `模型未正常完成摘要生成 (finishReason: ${result.finishReason})`,
      502,
    )
  }

  const trimmedText = result.text.trim()
  const validation = validateSummaryText(trimmedText)
  if (!validation.valid) {
    throw new SummaryModelError('UPSTREAM_INVALID_RESPONSE', `模型生成摘要不符合规范: ${validation.reason}`, 502)
  }

  const contentHash = computeArticleContentHash(post.content)

  return await upsertArticleSummary(
    {
      slug: post.slug,
      contentHash,
      summary: trimmedText,
      protocol: config.protocol,
      model: config.modelId,
    },
    database,
  )
}

export interface SyncSummariesResult {
  total: number
  generated: number
  skipped: number
  disabled: number
  failed: number
}

export interface SyncSummariesOptions {
  database?: AppDatabase
  fetch?: typeof globalThis.fetch
  posts?: BlogPost[]
  logger?: {
    info: (msg: string) => void
    warn: (msg: string) => void
    error: (msg: string) => void
  }
}

/**
 * 全站博客文章 AI 摘要同步流程：
 * 1. 遍历所有文章；
 * 2. 检查 disableAiSummary 开关；
 * 3. 对比现有摘要 contentHash，未变化则零调用跳过；
 * 4. 逐篇执行生成，单篇失败保持开放，不阻止整体流程；
 * 5. 汇总返回 generated / skipped / disabled / failed 计数。
 */
export async function syncAllArticleSummaries(options?: SyncSummariesOptions): Promise<SyncSummariesResult> {
  const database = options?.database ?? defaultDb
  const posts = options?.posts ?? getAllBlogPosts()
  const log = options?.logger ?? {
    info: (msg: string) => console.log(msg),
    warn: (msg: string) => console.warn(msg),
    error: (msg: string) => console.error(msg),
  }

  const result: SyncSummariesResult = {
    total: posts.length,
    generated: 0,
    skipped: 0,
    disabled: 0,
    failed: 0,
  }

  const config = await getReadySummaryConfig(database)
  if (!config) {
    log.info('[AI Summary Sync] 当前未配置或未启用 AI 摘要模型，跳过模型调用')
    for (const post of posts) {
      if (post.disableAiSummary) {
        result.disabled++
      } else {
        result.skipped++
      }
    }
    return result
  }

  log.info(`[AI Summary Sync] 开始同步文章摘要 (共 ${posts.length} 篇)...`)

  for (const post of posts) {
    if (post.disableAiSummary) {
      result.disabled++
      continue
    }

    const currentHash = computeArticleContentHash(post.content)
    const cached = await getArticleSummaryBySlug(post.slug, database)

    if (cached && cached.contentHash === currentHash) {
      result.skipped++
      continue
    }

    try {
      await generateSummaryForPost(post, config, {
        database,
        fetch: options?.fetch,
      })
      result.generated++
      log.info(`[AI Summary Sync] 已更新摘要: ${post.slug}`)
    } catch (err) {
      result.failed++
      const safeError = classifyAiError(err)
      log.warn(`[AI Summary Sync] 摘要生成跳过 (${post.slug}): [${safeError.code}] ${safeError.message}`)
    }
  }

  log.info(
    `[AI Summary Sync] 同步完成: 总计 ${result.total} 篇 | 生成 ${result.generated} | 跳过 ${result.skipped} | 禁用 ${result.disabled} | 失败 ${result.failed}`,
  )

  return result
}
