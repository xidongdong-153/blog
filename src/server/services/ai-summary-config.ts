import type { SummaryModelFactoryConfig, SummaryProtocol, UpstreamModelItem } from '@/server/infra/ai/summary-model'
import { and, eq } from 'drizzle-orm'
import { db as defaultDb } from '@/server/infra/db/client'
import { aiSummaryConfig } from '@/server/infra/db/schema/ai'
import {
  CredentialCryptoError,
  decryptCredential,
  encryptCredential,
  isMasterKeyConfigured,
} from '../infra/ai/credential-crypto'
import {
  fetchUpstreamModels,
  isSupportedProtocol,
  testSummaryModelConnection,
  validateAiBaseUrlAsync,
} from '../infra/ai/summary-model'

export const AI_CONFIG_ID = 'default'

export type AiSummaryConfigStatus = 'needs_check' | 'ready'

export interface AiSummaryConfigDto {
  id: string
  protocol: SummaryProtocol
  baseUrl: string
  modelId: string
  hasCredential: boolean
  credentialMask: string | null
  status: AiSummaryConfigStatus
  revision: number
  checkedAt: number | null
  updatedAt: number
  masterKeyAvailable: boolean
}

export interface SaveAiSummaryConfigInput {
  protocol: SummaryProtocol
  baseUrl: string
  modelId: string
  apiKey?: string
}

export type AiConfigErrorCode =
  'CONFIG_NOT_FOUND' | 'INVALID_INPUT' | 'NO_CREDENTIAL' | 'REVISION_CONFLICT' | 'CRYPTO_ERROR' | 'CHECK_FAILED'

export class AiSummaryConfigError extends Error {
  readonly code: AiConfigErrorCode
  readonly statusCode: number

  constructor(code: AiConfigErrorCode, message: string, statusCode = 400) {
    super(message)
    this.name = 'AiSummaryConfigError'
    this.code = code
    this.statusCode = statusCode
  }
}

/**
 * 将数据库实体转为脱敏的安全 DTO，绝不泄露密文、IV、AuthTag 或明文 Key。
 */
function toDto(
  record: typeof aiSummaryConfig.$inferSelect,
  masterKeyAvailable = isMasterKeyConfigured(),
): AiSummaryConfigDto {
  return {
    id: record.id,
    protocol: record.protocol as SummaryProtocol,
    baseUrl: record.baseUrl,
    modelId: record.modelId,
    hasCredential: Boolean(record.credentialCiphertext && record.credentialIv && record.credentialAuthTag),
    credentialMask: record.credentialMask ?? null,
    status: record.status as AiSummaryConfigStatus,
    revision: record.revision,
    checkedAt: record.checkedAt ? record.checkedAt.getTime() : null,
    updatedAt: record.updatedAt.getTime(),
    masterKeyAvailable,
  }
}

/**
 * 读取当前单条 AI 摘要模型配置及脱敏 DTO。若不存在返回 null。
 */
export async function getAiSummaryConfig(database = defaultDb): Promise<AiSummaryConfigDto | null> {
  const records = await database.select().from(aiSummaryConfig).where(eq(aiSummaryConfig.id, AI_CONFIG_ID)).limit(1)

  if (records.length === 0) {
    return null
  }

  return toDto(records[0])
}

/**
 * 保存 AI 摘要模型配置。
 * - 若提供非空 apiKey，则加密并更新凭据。
 * - 若 apiKey 为空或未传，则保留现有凭据。
 * - 每次保存强制将状态重置为 needs_check，递增 revision，清空 checkedAt。
 */
export async function saveAiSummaryConfig(
  input: SaveAiSummaryConfigInput,
  options?: { database?: typeof defaultDb; masterKeyOverride?: string },
): Promise<AiSummaryConfigDto> {
  const database = options?.database ?? defaultDb

  if (!input.protocol || !isSupportedProtocol(input.protocol)) {
    throw new AiSummaryConfigError('INVALID_INPUT', `不支持的协议: ${String(input.protocol)}`, 400)
  }

  const validatedBaseUrl = await validateAiBaseUrlAsync(input.baseUrl)

  const trimmedModelId = input.modelId?.trim()
  if (!trimmedModelId) {
    throw new AiSummaryConfigError('INVALID_INPUT', '模型 ID 不能为空', 400)
  }

  // 查询现有记录
  const existingRecords = await database
    .select()
    .from(aiSummaryConfig)
    .where(eq(aiSummaryConfig.id, AI_CONFIG_ID))
    .limit(1)
  const existing = existingRecords[0]

  let ciphertext = existing?.credentialCiphertext ?? null
  let iv = existing?.credentialIv ?? null
  let authTag = existing?.credentialAuthTag ?? null
  let mask = existing?.credentialMask ?? null

  const trimmedKey = input.apiKey?.trim()
  if (trimmedKey) {
    try {
      const encrypted = encryptCredential(trimmedKey, options?.masterKeyOverride)
      ciphertext = encrypted.ciphertext
      iv = encrypted.iv
      authTag = encrypted.authTag
      mask = encrypted.mask
    } catch (err) {
      if (err instanceof CredentialCryptoError) {
        throw new AiSummaryConfigError('CRYPTO_ERROR', err.message, 500)
      }
      throw err
    }
  }

  const now = new Date()
  const nextRevision = existing ? existing.revision + 1 : 1

  if (existing) {
    await database
      .update(aiSummaryConfig)
      .set({
        protocol: input.protocol,
        baseUrl: validatedBaseUrl,
        modelId: trimmedModelId,
        credentialCiphertext: ciphertext,
        credentialIv: iv,
        credentialAuthTag: authTag,
        credentialMask: mask,
        status: 'needs_check',
        revision: nextRevision,
        checkedAt: null,
        updatedAt: now,
      })
      .where(eq(aiSummaryConfig.id, AI_CONFIG_ID))
  } else {
    await database.insert(aiSummaryConfig).values({
      id: AI_CONFIG_ID,
      protocol: input.protocol,
      baseUrl: validatedBaseUrl,
      modelId: trimmedModelId,
      credentialCiphertext: ciphertext,
      credentialIv: iv,
      credentialAuthTag: authTag,
      credentialMask: mask,
      status: 'needs_check',
      revision: 1,
      checkedAt: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  const updatedRecords = await database
    .select()
    .from(aiSummaryConfig)
    .where(eq(aiSummaryConfig.id, AI_CONFIG_ID))
    .limit(1)
  return toDto(updatedRecords[0])
}

/**
 * 显式清除当前配置的 API Key 凭据。
 * 清除后凭据密文与掩码为 null，状态重置为 needs_check，递增 revision。
 */
export async function clearAiSummaryCredential(options?: { database?: typeof defaultDb }): Promise<AiSummaryConfigDto> {
  const database = options?.database ?? defaultDb

  const existingRecords = await database
    .select()
    .from(aiSummaryConfig)
    .where(eq(aiSummaryConfig.id, AI_CONFIG_ID))
    .limit(1)
  const existing = existingRecords[0]

  if (!existing) {
    throw new AiSummaryConfigError('CONFIG_NOT_FOUND', '尚未创建 AI 摘要模型配置', 404)
  }

  const now = new Date()
  const nextRevision = existing.revision + 1

  await database
    .update(aiSummaryConfig)
    .set({
      credentialCiphertext: null,
      credentialIv: null,
      credentialAuthTag: null,
      credentialMask: null,
      status: 'needs_check',
      revision: nextRevision,
      checkedAt: null,
      updatedAt: now,
    })
    .where(eq(aiSummaryConfig.id, AI_CONFIG_ID))

  const updatedRecords = await database
    .select()
    .from(aiSummaryConfig)
    .where(eq(aiSummaryConfig.id, AI_CONFIG_ID))
    .limit(1)
  return toDto(updatedRecords[0])
}

/**
 * 对当前保存的配置发起连接测试。
 * 测试成功后，若版本未发生变化，则原子化更新为 ready 状态；
 * 若测试期间配置已被修改，更新条件不匹配，拒绝标记为 ready。
 */
export async function checkAndEnableAiSummaryConfig(options?: {
  database?: typeof defaultDb
  masterKeyOverride?: string
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
}): Promise<AiSummaryConfigDto> {
  const database = options?.database ?? defaultDb

  const existingRecords = await database
    .select()
    .from(aiSummaryConfig)
    .where(eq(aiSummaryConfig.id, AI_CONFIG_ID))
    .limit(1)
  const existing = existingRecords[0]

  if (!existing) {
    throw new AiSummaryConfigError('CONFIG_NOT_FOUND', '尚未创建 AI 摘要模型配置', 404)
  }

  if (!existing.credentialCiphertext || !existing.credentialIv || !existing.credentialAuthTag) {
    throw new AiSummaryConfigError('NO_CREDENTIAL', '未配置 API Key，无法执行连接测试', 400)
  }

  const targetRevision = existing.revision

  // 解密凭据
  let apiKey: string
  try {
    apiKey = decryptCredential(
      {
        ciphertext: existing.credentialCiphertext,
        iv: existing.credentialIv,
        authTag: existing.credentialAuthTag,
      },
      options?.masterKeyOverride,
    )
  } catch (err) {
    if (err instanceof CredentialCryptoError) {
      throw new AiSummaryConfigError('CRYPTO_ERROR', err.message, 500)
    }
    throw err
  }

  // 执行模型短请求连接测试
  const factoryConfig: SummaryModelFactoryConfig = {
    protocol: existing.protocol as SummaryProtocol,
    baseURL: existing.baseUrl,
    modelId: existing.modelId,
    apiKey,
    fetch: options?.fetch,
  }

  await testSummaryModelConnection(factoryConfig, {
    timeoutMs: options?.timeoutMs ?? 20_000,
  })

  // 测试成功，带 revision 条件更新为 ready
  const now = new Date()
  const result = await database
    .update(aiSummaryConfig)
    .set({
      status: 'ready',
      checkedAt: now,
      updatedAt: now,
    })
    .where(and(eq(aiSummaryConfig.id, AI_CONFIG_ID), eq(aiSummaryConfig.revision, targetRevision)))

  // 检查并发 revision 是否匹配
  if (result.rowsAffected === 0) {
    throw new AiSummaryConfigError(
      'REVISION_CONFLICT',
      '配置在测试期间已被重新修改，当前测试结果作废，请重新测试最新配置',
      409,
    )
  }

  const updatedRecords = await database
    .select()
    .from(aiSummaryConfig)
    .where(eq(aiSummaryConfig.id, AI_CONFIG_ID))
    .limit(1)
  return toDto(updatedRecords[0])
}

export interface GetAvailableSummaryModelsInput {
  baseUrl?: string
  apiKey?: string
}

/**
 * 获取可用的模型列表。
 * - 优先使用入参中的 baseUrl 与 apiKey。
 * - 若未提供，回退读取数据库中已保存的 baseUrl 与解密已有凭据。
 */
export async function getAvailableSummaryModels(
  input?: GetAvailableSummaryModelsInput,
  options?: {
    database?: typeof defaultDb
    masterKeyOverride?: string
    fetch?: typeof globalThis.fetch
    timeoutMs?: number
  },
): Promise<UpstreamModelItem[]> {
  const database = options?.database ?? defaultDb

  const existingRecords = await database
    .select()
    .from(aiSummaryConfig)
    .where(eq(aiSummaryConfig.id, AI_CONFIG_ID))
    .limit(1)
  const existing = existingRecords[0]

  const effectiveBaseUrl = input?.baseUrl?.trim() || existing?.baseUrl
  if (!effectiveBaseUrl) {
    throw new AiSummaryConfigError('INVALID_INPUT', 'Base URL 不能为空', 400)
  }

  let effectiveApiKey = input?.apiKey?.trim()
  if (!effectiveApiKey) {
    if (!existing?.credentialCiphertext || !existing?.credentialIv || !existing?.credentialAuthTag) {
      throw new AiSummaryConfigError('NO_CREDENTIAL', '未配置 API Key，无法获取模型列表', 400)
    }

    try {
      effectiveApiKey = decryptCredential(
        {
          ciphertext: existing.credentialCiphertext,
          iv: existing.credentialIv,
          authTag: existing.credentialAuthTag,
        },
        options?.masterKeyOverride,
      )
    } catch (err) {
      if (err instanceof CredentialCryptoError) {
        throw new AiSummaryConfigError('CRYPTO_ERROR', err.message, 500)
      }
      throw err
    }
  }

  return fetchUpstreamModels({
    baseUrl: effectiveBaseUrl,
    apiKey: effectiveApiKey,
    fetch: options?.fetch,
    timeoutMs: options?.timeoutMs,
  })
}
