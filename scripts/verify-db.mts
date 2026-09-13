import { createClient } from '@libsql/client'

async function main() {
  const isProduction = process.env.NODE_ENV === 'production'
  const isCi = Boolean(process.env.CI)
  const url = (process.env.TURSO_DATABASE_URL || '').trim()
  const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim()

  if (isProduction) {
    if (!url) {
      console.error('[Turso DB Check] 生产环境缺少有效的 TURSO_DATABASE_URL 配置，禁止回退本地 SQLite')
      process.exit(1)
    }
    if (!isCi && url.startsWith('file:')) {
      console.error('[Turso DB Check] 生产环境禁止使用本地 SQLite 文件数据库 (file:)，请配置线上 Turso 实例')
      process.exit(1)
    }
    if (!isCi && !authToken) {
      console.error('[Turso DB Check] 生产环境缺少有效的 TURSO_AUTH_TOKEN 配置')
      process.exit(1)
    }
  }

  const effectiveUrl = url || 'file:local.db'
  const effectiveAuthToken = authToken || undefined

  const isLocal = effectiveUrl.startsWith('file:')
  const displayUrl = isLocal ? effectiveUrl : effectiveUrl.replace(/(libsql:\/\/)([^@]+@)?/, '$1')
  console.log(`[Turso DB Check] 正在连接数据库: ${displayUrl}`)

  const client = createClient({ url: effectiveUrl, authToken: effectiveAuthToken })
  const start = performance.now()

  try {
    const result = await client.execute('SELECT 1 as ping')
    const latency = (performance.now() - start).toFixed(2)
    console.log(`[Turso DB Check] 连接成功`)
    console.log(`[Turso DB Check] 往返耗时: ${latency}ms`)
    console.log('[Turso DB Check] 查询结果:', result.rows)
  } catch (error) {
    const latency = (performance.now() - start).toFixed(2)
    console.error(`[Turso DB Check] 连接失败 (耗时: ${latency}ms):`, error)
    process.exit(1)
  } finally {
    client.close()
  }
}

main()
