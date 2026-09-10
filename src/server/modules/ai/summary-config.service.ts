import type { AiSummaryConfigDto, GetAvailableSummaryModelsInput, SaveAiSummaryConfigInput } from './ai.types'
import type { SummaryModelFactoryConfig } from '@/server/infra/ai/summary-model'
import type { SummaryProtocol, UpstreamModelItem } from '@/server/infra/ai/types'
import type { AppDatabase } from '@/server/infra/db/client'
import { and, eq } from 'drizzle-orm'
import {
  CredentialCryptoError,
  decryptCredential,
  encryptCredential,
  isMasterKeyConfigured,
} from '@/server/infra/ai/credential-crypto'
import {
  fetchUpstreamModels,
  SummaryModelError,
  testSummaryModelConnection,
  validateAiBaseUrlAsync,
} from '@/server/infra/ai/summary-model'
import { isSupportedProtocol } from '@/server/infra/ai/types'
import { db as defaultDb } from '@/server/infra/db/client'
import { aiSummaryConfig } from '@/server/infra/db/schema/ai'

export const AI_CONFIG_ID = 'default'

export type AiConfigErrorCode =
  | 'CONFIG_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'NO_CREDENTIAL'
  | 'REVISION_CONFLICT'
  | 'CRYPTO_ERROR'
  | 'CHECK_FAILED'
  | 'UPSTREAM_ERROR'

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

export interface ReadySummaryConfig {
  protocol: SummaryProtocol
  baseUrl: string
  modelId: string
  apiKey: string
}

/**
 * 检查当前环境变量中主密钥是否已配置
 */
export function isAiMasterKeyAvailable(): boolean {
  return isMasterKeyConfigured()
}

/**
 * 将数据库实体转为脱敏的安全 DTO，绝不泄露密文、IV、AuthTag 或明文 Key。
 */
function toDto(
  record?: typeof aiSummaryConfig.$inferSelect,
  options?: { masterKeyOverride?: string },
): AiSummaryConfigDto {
  const masterKeyAvailable = options?.masterKeyOverride
    ? options.masterKeyOverride.length === 64
    : isMasterKeyConfigured()

  if (!record) {
    return {
      id: AI_CONFIG_ID,
      protocol: 'openai-completions',
      baseUrl: '',
      modelId: '',
      hasCredential: false,
      credentialMask: null,
      status: 'needs_check',
      revision: 0,
      checkedAt: null,
      updatedAt: 0,
      masterKeyAvailable,
    }
  }

  return {
    id: record.id,
    protocol: record.protocol as SummaryProtocol,
    baseUrl: record.baseUrl,
    modelId: record.modelId,
    hasCredential: Boolean(record.credentialCiphertext && record.credentialIv && record.credentialAuthTag),
    credentialMask: record.credentialMask,
    status: record.status as 'needs_check' | 'ready',
    revision: record.revision,
    checkedAt: record.checkedAt ? record.checkedAt.getTime() : null,
    updatedAt: record.updatedAt.getTime(),
    masterKeyAvailable,
  }
}

/**
 * 获取当前 AI 摘要模型配置及脱敏后的状态。
 */
export async function getAiSummaryConfig(options?: {
  database?: typeof defaultDb
  masterKeyOverride?: string
}): Promise<AiSummaryConfigDto | null> {
  const database = options?.database ?? defaultDb
  const records = await database.select().from(aiSummaryConfig).where(eq(aiSummaryConfig.id, AI_CONFIG_ID)).limit(1)

  if (records.length === 0) {
    return null
  }

  return toDto(records[0], options)
}

/**
 * 保存或更新 AI 摘要配置。
 */
export async function saveAiSummaryConfig(
  input: SaveAiSummaryConfigInput,
  options?: {
    database?: typeof defaultDb
    masterKeyOverride?: string
  },
): Promise<AiSummaryConfigDto> {
  const database = options?.database ?? defaultDb

  if (!input.protocol || !isSupportedProtocol(input.protocol)) {
    throw new AiSummaryConfigError('INVALID_INPUT', `不支持的协议类型: ${input.protocol}`, 400)
  }

  let validatedBaseUrl: string
  try {
    validatedBaseUrl = await validateAiBaseUrlAsync(input.baseUrl)
  } catch (err) {
    if (err instanceof SummaryModelError) {
      throw new AiSummaryConfigError('INVALID_INPUT', err.message, err.statusCode)
    }
    throw err
  }

  const trimmedModelId = input.modelId.trim()
  if (!trimmedModelId) {
    throw new AiSummaryConfigError('INVALID_INPUT', '模型 ID 不能为空', 400)
  }

  const existingRecords = await database
    .select()
    .from(aiSummaryConfig)
    .where(eq(aiSummaryConfig.id, AI_CONFIG_ID))
    .limit(1)
  const existing = existingRecords[0]

  let ciphertext: string | null = null
  let iv: string | null = null
  let authTag: string | null = null
  let mask: string | null = null

  if (input.apiKey && input.apiKey.trim().length > 0) {
    try {
      const encrypted = encryptCredential(input.apiKey.trim(), options?.masterKeyOverride)
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
  } else if (existing) {
    ciphertext = existing.credentialCiphertext
    iv = existing.credentialIv
    authTag = existing.credentialAuthTag
    mask = existing.credentialMask
  }

  const now = new Date()

  if (existing) {
    const nextRevision = existing.revision + 1
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
  return toDto(updatedRecords[0], options)
}

/**
 * 显式清除当前配置的 API Key 凭据。
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

  try {
    await testSummaryModelConnection(factoryConfig, {
      timeoutMs: options?.timeoutMs ?? 20_000,
    })
  } catch (err) {
    if (err instanceof SummaryModelError) {
      throw new AiSummaryConfigError('CHECK_FAILED', err.message, err.statusCode)
    }
    throw err
  }

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
  return toDto(updatedRecords[0], options)
}

/**
 * 获取可用的模型列表。
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

  try {
    return await fetchUpstreamModels({
      baseUrl: effectiveBaseUrl,
      apiKey: effectiveApiKey,
      fetch: options?.fetch,
      timeoutMs: options?.timeoutMs,
    })
  } catch (err) {
    if (err instanceof SummaryModelError) {
      throw new AiSummaryConfigError('UPSTREAM_ERROR', err.message, err.statusCode)
    }
    throw err
  }
}

/**
 * 读取当前 ready 且有效解密的模型摘要配置。
 * 若配置不存在、未准备就绪、凭据缺失或主密钥无法解密，则安全返回 null。
 */
export async function getReadySummaryConfig(
  database: AppDatabase = defaultDb,
  options?: { masterKeyOverride?: string },
): Promise<ReadySummaryConfig | null> {
  const records = await database.select().from(aiSummaryConfig).where(eq(aiSummaryConfig.id, AI_CONFIG_ID)).limit(1)
  const config = records[0]

  if (!config || config.status !== 'ready') {
    return null
  }

  if (!config.credentialCiphertext || !config.credentialIv || !config.credentialAuthTag) {
    return null
  }

  try {
    const apiKey = decryptCredential(
      {
        ciphertext: config.credentialCiphertext,
        iv: config.credentialIv,
        authTag: config.credentialAuthTag,
      },
      options?.masterKeyOverride,
    )

    return {
      protocol: config.protocol as SummaryProtocol,
      baseUrl: config.baseUrl,
      modelId: config.modelId,
      apiKey,
    }
  } catch {
    return null
  }
}
