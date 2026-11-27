export type DatabaseProvider = 'sqlite' | 'turso' | 'libsql'

export interface ResolvedDatabaseConfig {
  url: string
  authToken?: string
  provider: DatabaseProvider
  isLocalFile: boolean
  localFilePath?: string
}

export interface ResolveDatabaseConfigOptions {
  url?: string
  authToken?: string
  env?: NodeJS.ProcessEnv
  context?: string
}

const DEFAULT_DEV_DATABASE_URL = 'file:local.db'
const REMOTE_PROTOCOL_RE = /^(?:libsql|https?|wss?):\/\//i
const SCHEME_PREFIX_RE = /^[a-z][a-z\d+\-.]*:/i
const WINDOWS_DRIVE_RE = /^[a-z]:[\\/]/i
const DISABLED_FLAG_VALUES = new Set(['false', '0', 'no', 'off'])

function extractLocalFilePath(fileUrl: string): string {
  const withoutQuery = fileUrl.split(/[?#]/, 1)[0] ?? ''

  if (/^file:\/\/localhost\//i.test(withoutQuery)) {
    return decodeURIComponent(withoutQuery.slice('file://localhost'.length))
  }
  if (/^file:\/\//i.test(withoutQuery)) {
    return decodeURIComponent(withoutQuery.slice('file://'.length))
  }
  return withoutQuery.slice('file:'.length)
}

function isTursoHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return normalized === 'turso.io' || normalized.endsWith('.turso.io')
}

export function resolveDatabaseConfig(options: ResolveDatabaseConfigOptions = {}): ResolvedDatabaseConfig {
  const env = options.env ?? process.env
  const context = options.context ?? 'Database'
  const isProduction = env.NODE_ENV === 'production'
  const isCi = Boolean(env.CI)

  const rawUrl = (options.url ?? env.DATABASE_URL ?? '').trim()
  const rawToken = (options.authToken ?? env.DATABASE_AUTH_TOKEN ?? '').trim()

  if (!rawUrl) {
    if (isProduction) {
      throw new Error(
        `[${context}] 生产环境缺少有效的 DATABASE_URL 配置，请设置本地 SQLite 路径（如 file:./data/blog.db）或远程连接串（如 libsql://...）`,
      )
    }

    return {
      url: DEFAULT_DEV_DATABASE_URL,
      provider: 'sqlite',
      isLocalFile: true,
      localFilePath: 'local.db',
    }
  }

  if (rawUrl === ':memory:' || /^file::memory:(?:[?#].*)?$/i.test(rawUrl)) {
    return {
      url: rawUrl,
      provider: 'sqlite',
      isLocalFile: false,
    }
  }

  if (/^file:/i.test(rawUrl)) {
    const localFilePath = extractLocalFilePath(rawUrl).trim()
    if (!localFilePath) {
      throw new Error(`[${context}] 无效的本地 SQLite DATABASE_URL 配置: ${rawUrl}`)
    }

    return {
      url: rawUrl,
      provider: 'sqlite',
      isLocalFile: true,
      localFilePath,
    }
  }

  if (REMOTE_PROTOCOL_RE.test(rawUrl)) {
    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch {
      throw new Error(`[${context}] 无法解析远程 DATABASE_URL 配置`)
    }

    const provider: DatabaseProvider = isTursoHostname(parsed.hostname) ? 'turso' : 'libsql'
    const requiresTokenInProd = provider === 'turso' || parsed.protocol.toLowerCase() === 'libsql:'

    if (isProduction && !isCi && requiresTokenInProd && !rawToken) {
      throw new Error(`[${context}] 生产环境连接远程 Turso/libSQL 数据库时缺少有效的 DATABASE_AUTH_TOKEN 配置`)
    }

    return {
      url: rawUrl,
      authToken: rawToken || undefined,
      provider,
      isLocalFile: false,
    }
  }

  if (SCHEME_PREFIX_RE.test(rawUrl) && !WINDOWS_DRIVE_RE.test(rawUrl)) {
    throw new Error(
      `[${context}] 不支持的 DATABASE_URL 协议，请使用本地 SQLite 路径（file:... 或文件路径）或 Turso/libSQL 连接串`,
    )
  }

  const localFilePath = (rawUrl.split(/[?#]/, 1)[0] ?? '').trim()
  if (!localFilePath) {
    throw new Error(`[${context}] 无效的本地 SQLite DATABASE_URL 配置`)
  }

  return {
    url: `file:${rawUrl}`,
    provider: 'sqlite',
    isLocalFile: true,
    localFilePath,
  }
}

export function isDatabaseAutoMigrateEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = (env.DATABASE_AUTO_MIGRATE ?? '').trim().toLowerCase()
  if (!value) return true
  return !DISABLED_FLAG_VALUES.has(value)
}

export function formatDatabaseProviderLabel(provider: DatabaseProvider): string {
  switch (provider) {
    case 'sqlite':
      return 'SQLite'
    case 'turso':
      return 'Turso'
    case 'libsql':
      return 'libSQL'
  }
}

export function maskDatabaseUrl(url: string): string {
  if (url === ':memory:' || /^file:/i.test(url)) {
    return url
  }

  try {
    const parsed = new URL(url)
    parsed.username = ''
    parsed.password = ''
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return '<invalid-database-url>'
  }
}
