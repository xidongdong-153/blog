import { createClient } from '@libsql/client'

async function main() {
  const url = process.env.TURSO_DATABASE_URL || 'file:local.db'
  const authToken = process.env.TURSO_AUTH_TOKEN

  const isLocal = url.startsWith('file:')
  const displayUrl = isLocal ? url : url.replace(/(libsql:\/\/)([^@]+@)?/, '$1')
  console.log(`[Turso DB Check] 正在连接数据库: ${displayUrl}`)

  const client = createClient({ url, authToken })
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
