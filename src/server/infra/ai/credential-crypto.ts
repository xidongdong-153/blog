import crypto from 'node:crypto'

export type CredentialCryptoErrorCode = 'KEY_MISSING' | 'KEY_INVALID' | 'ENCRYPTION_FAILED' | 'DECRYPTION_FAILED'

export class CredentialCryptoError extends Error {
  readonly code: CredentialCryptoErrorCode

  constructor(code: CredentialCryptoErrorCode, message: string) {
    super(message)
    this.name = 'CredentialCryptoError'
    this.code = code
  }
}

export interface EncryptedCredential {
  ciphertext: string
  iv: string
  authTag: string
  mask: string
}

/**
 * 校验并获取 32 字节的 AES-256-GCM 主密钥 Buffer。
 * 主密钥由环境变量 AI_CREDENTIAL_ENCRYPTION_KEY 提供，格式为 32 字节的 base64 编码。
 */
export function getMasterKey(overrideKey?: string): Buffer {
  const rawKey = overrideKey !== undefined ? overrideKey : process.env.AI_CREDENTIAL_ENCRYPTION_KEY?.trim()

  if (!rawKey) {
    throw new CredentialCryptoError('KEY_MISSING', '未配置 AI 凭据加密主密钥 (AI_CREDENTIAL_ENCRYPTION_KEY)')
  }

  // 严格检查 base64 格式
  const base64Regex = /^[a-z0-9+/]+={0,2}$/i
  if (!base64Regex.test(rawKey)) {
    throw new CredentialCryptoError('KEY_INVALID', 'AI 凭据加密主密钥格式非法，需为合法的 32 字节 base64 编码')
  }

  const keyBuffer = Buffer.from(rawKey, 'base64')
  if (keyBuffer.length !== 32) {
    throw new CredentialCryptoError('KEY_INVALID', 'AI 凭据加密主密钥长度非法，需恰好为 32 字节 (256 位)')
  }

  return keyBuffer
}

/**
 * 检查当前主密钥是否可用（配置存在且格式合法），不抛出异常。
 */
export function isMasterKeyConfigured(): boolean {
  try {
    getMasterKey()
    return true
  } catch {
    return false
  }
}

/**
 * 生成 API key 的安全掩码，只保留前后极少字符，中间以星号遮蔽。
 */
export function maskCredential(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (!trimmed) {
    return ''
  }

  if (trimmed.length <= 8) {
    return '********'
  }

  const prefix = trimmed.slice(0, 3)
  const suffix = trimmed.slice(-4)
  return `${prefix}****${suffix}`
}

/**
 * 使用 AES-256-GCM 加密明文 API Key，使用随机 12 字节 IV。
 */
export function encryptCredential(plainText: string, masterKeyOverride?: string): EncryptedCredential {
  if (!plainText) {
    throw new CredentialCryptoError('ENCRYPTION_FAILED', '待加密凭据不能为空')
  }

  const keyBuffer = getMasterKey(masterKeyOverride)
  const iv = crypto.randomBytes(12)

  try {
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)
    let ciphertext = cipher.update(plainText, 'utf8', 'base64')
    ciphertext += cipher.final('base64')
    const authTag = cipher.getAuthTag().toString('base64')

    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag,
      mask: maskCredential(plainText),
    }
  } catch (err) {
    if (err instanceof CredentialCryptoError) {
      throw err
    }
    throw new CredentialCryptoError('ENCRYPTION_FAILED', '凭据加密过程发生异常')
  }
}

/**
 * 使用 AES-256-GCM 解密凭据。
 */
export function decryptCredential(
  encrypted: { ciphertext: string; iv: string; authTag: string },
  masterKeyOverride?: string,
): string {
  if (!encrypted.ciphertext || !encrypted.iv || !encrypted.authTag) {
    throw new CredentialCryptoError('DECRYPTION_FAILED', '解密参数不完整')
  }

  const keyBuffer = getMasterKey(masterKeyOverride)

  try {
    const ivBuffer = Buffer.from(encrypted.iv, 'base64')
    const authTagBuffer = Buffer.from(encrypted.authTag, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, ivBuffer)
    decipher.setAuthTag(authTagBuffer)

    let decrypted = decipher.update(encrypted.ciphertext, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    if (err instanceof CredentialCryptoError) {
      throw err
    }
    throw new CredentialCryptoError('DECRYPTION_FAILED', '凭据解密失败，密文已被篡改或主密钥不匹配')
  }
}
