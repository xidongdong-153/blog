import type { LookupAddress } from 'node:dns'
import dns from 'node:dns/promises'
import net from 'node:net'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { APICallError, generateText } from 'ai'

export type SummaryProtocol = 'openai-completions' | 'openai-responses' | 'anthropic-messages'

export const SUPPORTED_SUMMARY_PROTOCOLS: readonly SummaryProtocol[] = [
  'openai-completions',
  'openai-responses',
  'anthropic-messages',
] as const

export function isSupportedProtocol(protocol: string): protocol is SummaryProtocol {
  return (SUPPORTED_SUMMARY_PROTOCOLS as readonly string[]).includes(protocol)
}

export type SummaryModelErrorCode =
  | 'INVALID_BASE_URL'
  | 'AUTH_FAILED'
  | 'UPSTREAM_TIMEOUT'
  | 'REQUEST_ABORTED'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_INVALID_RESPONSE'
  | 'UPSTREAM_EMPTY_RESPONSE'
  | 'UPSTREAM_TRUNCATED'
  | 'UPSTREAM_RESPONSE_TOO_LARGE'
  | 'CONFIG_INVALID'

export class SummaryModelError extends Error {
  readonly code: SummaryModelErrorCode
  readonly statusCode: number

  constructor(code: SummaryModelErrorCode, message: string, statusCode = 500) {
    super(message)
    this.name = 'SummaryModelError'
    this.code = code
    this.statusCode = statusCode
  }
}

export const MAX_SUMMARY_RESPONSE_BYTES = 1024 * 1024 // 1 MiB

/**
 * 提取 IPv4-mapped IPv6 地址中的 IPv4 部分（支持点分十进制与十六进制形式）
 */
export function extractIpv4FromMappedIpv6(ip: string): string | null {
  let clean = ip.toLowerCase().trim()
  if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.slice(1, -1)
  }
  if (clean.startsWith('::ffff:')) {
    const rest = clean.slice(7)
    if (net.isIPv4(rest)) {
      return rest
    }
    const parts = rest.split(':')
    if (parts.length === 2) {
      const high = Number.parseInt(parts[0], 16)
      const low = Number.parseInt(parts[1], 16)
      if (!Number.isNaN(high) && !Number.isNaN(low) && high >= 0 && high <= 0xffff && low >= 0 && low <= 0xffff) {
        return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`
      }
    }
  }
  return null
}

/**
 * 判断 IPv4 地址是否属于私网、环回或链路本地保留网段
 */
function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return false
  }
  const [a, b] = parts
  // 0.0.0.0/8 (当前网络)
  if (a === 0) return true
  // 10.0.0.0/8 (私网)
  if (a === 10) return true
  // 100.64.0.0/10 (运营商级 NAT)
  if (a === 100 && b >= 64 && b <= 127) return true
  // 127.0.0.0/8 (环回)
  if (a === 127) return true
  // 169.254.0.0/16 (链路本地 / 云 metadata)
  if (a === 169 && b === 254) return true
  // 172.16.0.0/12 (私网)
  if (a === 172 && b >= 16 && b <= 31) return true
  // 192.0.0.0/24 (IETF 协议分配)
  if (a === 192 && b === 0) return true
  // 192.168.0.0/16 (私网)
  if (a === 192 && b === 168) return true
  // 198.18.0.0/15 (基准测试)
  if (a === 198 && (b === 18 || b === 19)) return true
  // 224.0.0.0/4 (多播及保留)
  if (a >= 224) return true
  return false
}

/**
 * 判断 IP 地址（IPv4、IPv6 及 IPv4-mapped IPv6）是否属于私网、环回或链路本地保留网段
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  let clean = ip.toLowerCase().trim()
  if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.slice(1, -1)
  }

  const mappedIpv4 = extractIpv4FromMappedIpv6(clean)
  if (mappedIpv4) {
    return isPrivateOrReservedIpv4(mappedIpv4)
  }

  if (net.isIPv4(clean)) {
    return isPrivateOrReservedIpv4(clean)
  }

  // IPv6 匹配
  if (clean === '::1' || clean === '0:0:0:0:0:0:0:1' || clean === '::') return true
  // fc00::/7 (唯一本地地址)
  if (clean.startsWith('fc') || clean.startsWith('fd')) return true
  // fe80::/10 (链路本地)
  if (clean.startsWith('fe8') || clean.startsWith('fe9') || clean.startsWith('fea') || clean.startsWith('feb')) {
    return true
  }
  // 2001:db8::/32 (文档保留)
  if (clean.startsWith('2001:db8') || clean.startsWith('2001:0db8')) return true
  // ff00::/8 (多播)
  if (clean.startsWith('ff')) return true

  return false
}

/**
 * 生产环境 DNS 解析与 IP 安全校验。
 * 拦截 loopback、私网、链路本地、云 metadata 及保留地址。
 * 对 DNS 解析失败返回安全的上游不可用错误。
 */
export async function validateHostResolution(hostname: string): Promise<void> {
  let cleanHost = hostname.toLowerCase().trim()
  if (cleanHost.startsWith('[') && cleanHost.endsWith(']')) {
    cleanHost = cleanHost.slice(1, -1)
  }

  // 如果本身就是 IP 地址（包括 IPv4-mapped IPv6）
  if (net.isIP(cleanHost) || extractIpv4FromMappedIpv6(cleanHost)) {
    if (isPrivateOrReservedIp(cleanHost)) {
      throw new SummaryModelError('INVALID_BASE_URL', '生产环境禁止使用私网、环回或云 metadata IP 地址', 400)
    }
    return
  }

  let addresses: LookupAddress[]
  try {
    addresses = await dns.lookup(cleanHost, { all: true })
  } catch {
    throw new SummaryModelError('UPSTREAM_UNAVAILABLE', '无法解析上游服务域名，请检查 Base URL', 503)
  }

  if (!addresses || addresses.length === 0) {
    throw new SummaryModelError('UPSTREAM_UNAVAILABLE', '无法解析上游服务域名，请检查 Base URL', 503)
  }

  for (const item of addresses) {
    if (isPrivateOrReservedIp(item.address)) {
      throw new SummaryModelError(
        'INVALID_BASE_URL',
        '生产环境下 Base URL 域名解析结果指向私网、环回或保留地址，已被安全策略拦截',
        400,
      )
    }
  }
}

/**
 * 校验 Base URL 合法性及安全规则。
 * 生产环境下严格拒绝 loopback、私网、链路本地及云 metadata 地址。
 */
export function validateAiBaseUrl(rawUrl: string, options?: { isProduction?: boolean }): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new SummaryModelError('INVALID_BASE_URL', 'Base URL 不能为空', 400)
  }

  const trimmed = rawUrl.trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new SummaryModelError('INVALID_BASE_URL', 'Base URL 格式无效，必须为合法的 HTTP(S) 地址', 400)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SummaryModelError('INVALID_BASE_URL', 'Base URL 仅允许 http 或 https 协议', 400)
  }

  if (parsed.username || parsed.password) {
    throw new SummaryModelError('INVALID_BASE_URL', 'Base URL 不得包含用户名或密码', 400)
  }

  if (parsed.search) {
    throw new SummaryModelError('INVALID_BASE_URL', 'Base URL 不得包含 query 查询参数', 400)
  }

  if (parsed.hash) {
    throw new SummaryModelError('INVALID_BASE_URL', 'Base URL 不得包含 hash 片段', 400)
  }

  if (!parsed.hostname) {
    throw new SummaryModelError('INVALID_BASE_URL', 'Base URL 主机名不能为空', 400)
  }

  const isProd = options?.isProduction ?? process.env.NODE_ENV === 'production'
  if (isProd) {
    let host = parsed.hostname.toLowerCase()
    if (host.startsWith('[') && host.endsWith(']')) {
      host = host.slice(1, -1)
    }

    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === 'metadata.google.internal' ||
      host === 'instance-data'
    ) {
      throw new SummaryModelError('INVALID_BASE_URL', '生产环境禁止使用本地或内部网络 Base URL', 400)
    }

    if (isPrivateOrReservedIp(host)) {
      throw new SummaryModelError('INVALID_BASE_URL', '生产环境禁止使用私网、环回或云 metadata IP 地址', 400)
    }
  }

  return trimmed
}

export async function validateAiBaseUrlAsync(rawUrl: string, options?: { isProduction?: boolean }): Promise<string> {
  const validated = validateAiBaseUrl(rawUrl, options)
  const isProd = options?.isProduction ?? process.env.NODE_ENV === 'production'
  if (isProd) {
    const parsed = new URL(validated)
    await validateHostResolution(parsed.hostname)
  }
  return validated
}

export interface RestrictedFetchOptions {
  isProduction?: boolean
  timeoutMs?: number
}

function createSizeLimitedStream(stream: ReadableStream<Uint8Array>, maxBytes: number): ReadableStream<Uint8Array> {
  let totalBytes = 0
  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        totalBytes += chunk.byteLength
        if (totalBytes > maxBytes) {
          controller.error(
            new SummaryModelError('UPSTREAM_RESPONSE_TOO_LARGE', '上游模型服务响应内容超出安全大小限制 (1 MiB)', 502),
          )
          return
        }
        controller.enqueue(chunk)
      },
    }),
  )
}

/**
 * 构造受限安全 fetch，支持生产环境地址拦截、禁止跟随重定向、限制读取大小与超时。
 */
export function createRestrictedFetch(options?: RestrictedFetchOptions): typeof globalThis.fetch {
  const isProd = options?.isProduction ?? process.env.NODE_ENV === 'production'
  const timeoutMs = options?.timeoutMs ?? 20_000

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    validateAiBaseUrl(urlString, { isProduction: isProd })

    if (isProd) {
      const parsed = new URL(urlString)
      await validateHostResolution(parsed.hostname)
    }

    // 严禁跟随任何重定向，结合 timeoutMs 与外部 signal
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    const effectiveSignal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal

    const modifiedInit: RequestInit = {
      ...init,
      signal: effectiveSignal,
      redirect: 'manual',
    }

    let response: Response
    try {
      response = await globalThis.fetch(input, modifiedInit)
    } catch (err) {
      throw classifyAiError(err)
    }

    // 拦截 3xx 重定向
    if (response.status >= 300 && response.status < 400) {
      throw new SummaryModelError('UPSTREAM_ERROR', '上游服务发生重定向，出于安全考虑已拦截', 502)
    }

    // 检查 Content-Length 响应头
    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      const parsedLength = Number.parseInt(contentLength, 10)
      if (!Number.isNaN(parsedLength) && parsedLength > MAX_SUMMARY_RESPONSE_BYTES) {
        try {
          await response.body?.cancel()
        } catch {
          // ignore
        }
        throw new SummaryModelError('UPSTREAM_RESPONSE_TOO_LARGE', '上游模型服务响应内容超出安全大小限制 (1 MiB)', 502)
      }
    }

    if (!response.body) {
      return response
    }

    const limitedStream = createSizeLimitedStream(response.body, MAX_SUMMARY_RESPONSE_BYTES)
    const limitedResponse = new Response(limitedStream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })

    try {
      Object.defineProperty(limitedResponse, 'url', { value: response.url })
    } catch {
      // ignore
    }

    return limitedResponse
  }
}

export interface SummaryModelFactoryConfig {
  protocol: SummaryProtocol
  baseURL: string
  modelId: string
  apiKey: string
  fetch?: typeof globalThis.fetch
}

/**
 * 创建统一模型实例（三协议分发）
 */
export function createSummaryModel(config: SummaryModelFactoryConfig) {
  if (!config.protocol || !isSupportedProtocol(config.protocol)) {
    throw new SummaryModelError('CONFIG_INVALID', `不支持的模型协议: ${String(config.protocol)}`, 400)
  }

  if (!config.apiKey || typeof config.apiKey !== 'string' || !config.apiKey.trim()) {
    throw new SummaryModelError('CONFIG_INVALID', '模型 API Key 不能为空', 400)
  }

  const effectiveFetch = config.fetch || createRestrictedFetch()

  if (config.protocol === 'anthropic-messages') {
    const provider = createAnthropic({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      fetch: effectiveFetch,
    })
    return provider.messages(config.modelId)
  }

  const provider = createOpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    fetch: effectiveFetch,
  })

  return config.protocol === 'openai-completions' ? provider.chat(config.modelId) : provider.responses(config.modelId)
}

/**
 * 将 AI SDK 或网络调用错误分类为安全友好的统一异常，不泄露上游 body、key 或 prompt。
 */
export function classifyAiError(error: unknown): SummaryModelError {
  if (error instanceof SummaryModelError) {
    return error
  }

  if (error && typeof error === 'object' && 'cause' in error) {
    let current: unknown = (error as { cause?: unknown }).cause
    while (current) {
      if (current instanceof SummaryModelError) {
        return current
      }
      if (current && typeof current === 'object' && 'cause' in current) {
        current = (current as { cause?: unknown }).cause
      } else {
        break
      }
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('超出安全大小限制')) {
      return new SummaryModelError('UPSTREAM_RESPONSE_TOO_LARGE', '上游模型服务响应内容超出安全大小限制 (1 MiB)', 502)
    }
    const name = error.name
    if (name === 'TimeoutError' || error.message.toLowerCase().includes('timeout')) {
      return new SummaryModelError('UPSTREAM_TIMEOUT', '请求上游模型服务超时', 504)
    }
    if (name === 'AbortError') {
      return new SummaryModelError('REQUEST_ABORTED', '模型请求已取消', 499)
    }
  }

  if (APICallError.isInstance(error)) {
    const status = error.statusCode
    if (status === 401 || status === 403) {
      return new SummaryModelError('AUTH_FAILED', '上游模型认证失败，请检查 API Key 是否正确或具有权限', 401)
    }
    if (!status) {
      return new SummaryModelError('UPSTREAM_UNAVAILABLE', '无法连接至上游模型服务，请检查网络或 Base URL', 503)
    }
    if (status >= 400 && status < 500) {
      return new SummaryModelError('UPSTREAM_ERROR', `上游模型服务请求错误 (HTTP ${status})`, status)
    }
    return new SummaryModelError('UPSTREAM_ERROR', `上游模型服务内部故障 (HTTP ${status})`, 502)
  }

  // JSON 解析或 schema 不匹配
  if (error instanceof SyntaxError || (error instanceof Error && error.message.includes('JSON'))) {
    return new SummaryModelError('UPSTREAM_INVALID_RESPONSE', '上游模型服务返回了非法的响应格式', 502)
  }

  return new SummaryModelError('UPSTREAM_ERROR', '调用模型服务时发生未知错误', 500)
}

export const TEST_CONNECTION_PROMPT = '只回复：摘要测试成功'

export interface TestSummaryConnectionResult {
  text: string
  finishReason: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
}

/**
 * 使用当前配置发起短文本测试，验证服务可用性、返回文本及 finishReason。
 */
export async function testSummaryModelConnection(
  config: SummaryModelFactoryConfig,
  options?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<TestSummaryConnectionResult> {
  const timeoutMs = options?.timeoutMs ?? 20_000
  const model = createSummaryModel({
    ...config,
    fetch: config.fetch || createRestrictedFetch({ timeoutMs }),
  })

  let result
  try {
    result = await generateText({
      model,
      prompt: TEST_CONNECTION_PROMPT,
      maxOutputTokens: 64,
      maxRetries: 0,
      timeout: { totalMs: timeoutMs },
      telemetry: { isEnabled: false },
      abortSignal: options?.signal,
    })
  } catch (err) {
    throw classifyAiError(err)
  }

  const text = result.text.trim()
  if (text.length === 0) {
    throw new SummaryModelError('UPSTREAM_EMPTY_RESPONSE', '模型返回了空文本', 502)
  }

  if (result.finishReason !== 'stop') {
    throw new SummaryModelError(
      'UPSTREAM_TRUNCATED',
      `模型未正常完成文本生成 (finishReason: ${result.finishReason})`,
      502,
    )
  }

  return {
    text,
    finishReason: result.finishReason,
    usage: {
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    },
  }
}
