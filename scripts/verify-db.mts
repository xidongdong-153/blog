import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@libsql/client'
import { formatDatabaseProviderLabel, maskDatabaseUrl, resolveDatabaseConfig } from '../src/server/infra/db/config.ts'

async function main() {
  let config
  try {
    config = resolveDatabaseConfig({ context: 'DB Check' })
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }

  if (config.isLocalFile && config.localFilePath) {
    mkdirSync(path.dirname(path.resolve(config.localFilePath)), { recursive: true })
  }

  const label = formatDatabaseProviderLabel(config.provider)
  const displayUrl = maskDatabaseUrl(config.url)
  console.log(`[DB Check] 正在连接 ${label} 数据库: ${displayUrl}`)

  const client = createClient({ url: config.url, authToken: config.authToken })
  const start = performance.now()

  try {
    const result = await client.execute('SELECT 1 as ping')
    const latency = (performance.now() - start).toFixed(2)
    console.log('[DB Check] 连接成功')
    console.log(`[DB Check] 往返耗时: ${latency}ms`)
    console.log('[DB Check] 查询结果:', result.rows)
  } catch (error) {
    const latency = (performance.now() - start).toFixed(2)
    console.error(`[DB Check] 连接失败 (耗时: ${latency}ms):`, error)
    process.exit(1)
  } finally {
    client.close()
  }
}

main()
