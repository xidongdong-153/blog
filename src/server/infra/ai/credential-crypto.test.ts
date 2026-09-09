/* eslint-disable test/no-import-node-test */
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import {
  CredentialCryptoError,
  decryptCredential,
  encryptCredential,
  getMasterKey,
  isMasterKeyConfigured,
  maskCredential,
} from './credential-crypto'

test('凭据加密模块 - 主密钥校验', () => {
  // 1. 未配置主密钥
  assert.throws(
    () => getMasterKey(''),
    (err) => err instanceof CredentialCryptoError && err.code === 'KEY_MISSING',
  )

  // 2. 非法 base64 字符
  assert.throws(
    () => getMasterKey('invalid_base64!@#$'),
    (err) => err instanceof CredentialCryptoError && err.code === 'KEY_INVALID',
  )

  // 3. base64 解码后长度不足 32 字节 (如 16 字节)
  const shortKey = crypto.randomBytes(16).toString('base64')
  assert.throws(
    () => getMasterKey(shortKey),
    (err) => err instanceof CredentialCryptoError && err.code === 'KEY_INVALID',
  )

  // 4. 合法 32 字节 key
  const validKey = crypto.randomBytes(32).toString('base64')
  const buffer = getMasterKey(validKey)
  assert.equal(buffer.length, 32)
})

test('凭据加密模块 - 掩码算法', () => {
  assert.equal(maskCredential(''), '')
  assert.equal(maskCredential('   '), '')
  assert.equal(maskCredential('12345678'), '********')
  assert.equal(maskCredential('sk-test-1234567890'), 'sk-****7890')
  assert.equal(maskCredential('anthropic-secret-key-xyz'), 'ant****-xyz')
})

test('凭据加密模块 - AES-256-GCM 加密与解密完整流程', () => {
  const masterKey = crypto.randomBytes(32).toString('base64')
  const secretKey = 'sk-proj-super-secret-model-api-key-99999'

  const encrypted1 = encryptCredential(secretKey, masterKey)
  const encrypted2 = encryptCredential(secretKey, masterKey)

  // 1. 验证密文与明文完全不同，且密文不包含原字符串
  assert.notEqual(encrypted1.ciphertext, secretKey)
  assert.equal(encrypted1.ciphertext.includes(secretKey), false)

  // 2. 验证随机 IV：同一明文两次加密生成的 IV 必须不同，密文也不同
  assert.notEqual(encrypted1.iv, encrypted2.iv)
  assert.notEqual(encrypted1.ciphertext, encrypted2.ciphertext)

  // 3. 验证掩码正确包含
  assert.equal(encrypted1.mask, maskCredential(secretKey))

  // 4. 正确解密
  const decrypted1 = decryptCredential(encrypted1, masterKey)
  const decrypted2 = decryptCredential(encrypted2, masterKey)
  assert.equal(decrypted1, secretKey)
  assert.equal(decrypted2, secretKey)

  // 5. 篡改密文导致解密失败
  assert.throws(
    () =>
      decryptCredential(
        {
          ciphertext: Buffer.from('corrupted').toString('base64'),
          iv: encrypted1.iv,
          authTag: encrypted1.authTag,
        },
        masterKey,
      ),
    (err) => err instanceof CredentialCryptoError && err.code === 'DECRYPTION_FAILED',
  )

  // 6. 篡改 authTag 导致解密失败
  const fakeTag = crypto.randomBytes(16).toString('base64')
  assert.throws(
    () =>
      decryptCredential(
        {
          ciphertext: encrypted1.ciphertext,
          iv: encrypted1.iv,
          authTag: fakeTag,
        },
        masterKey,
      ),
    (err) => err instanceof CredentialCryptoError && err.code === 'DECRYPTION_FAILED',
  )

  // 7. 使用不同主密钥解密失败
  const wrongMasterKey = crypto.randomBytes(32).toString('base64')
  assert.throws(
    () => decryptCredential(encrypted1, wrongMasterKey),
    (err) => err instanceof CredentialCryptoError && err.code === 'DECRYPTION_FAILED',
  )
})

test('凭据加密模块 - isMasterKeyConfigured 环境变量探测', () => {
  const origKey = process.env.AI_CREDENTIAL_ENCRYPTION_KEY

  try {
    delete process.env.AI_CREDENTIAL_ENCRYPTION_KEY
    assert.equal(isMasterKeyConfigured(), false)

    process.env.AI_CREDENTIAL_ENCRYPTION_KEY = 'invalid'
    assert.equal(isMasterKeyConfigured(), false)

    process.env.AI_CREDENTIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    assert.equal(isMasterKeyConfigured(), true)
  } finally {
    if (origKey !== undefined) {
      process.env.AI_CREDENTIAL_ENCRYPTION_KEY = origKey
    } else {
      delete process.env.AI_CREDENTIAL_ENCRYPTION_KEY
    }
  }
})
