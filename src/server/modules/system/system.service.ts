import { sql } from 'drizzle-orm'
import { db } from '@/server/infra/db/client'
import { checkPresenceHealth } from '@/server/modules/presence/presence.service'

export interface DatabaseCheckResult {
  status: 'connected' | 'error'
  operationalStatus: 'operational' | 'degraded'
  latencyMs: number
  provider: 'turso' | 'local-sqlite'
  message: string
  result?: unknown
}

export interface EmailCheckResult {
  status: 'ready' | 'mock'
  label: string
}

export interface SystemProcessHealth {
  status: 'ok'
  uptime: number
  platform: string
  arch: string
  nodeVersion: string
  memory: {
    heapUsedMb: number
    rssMb: number
  }
}

export interface StatusPageData {
  db: {
    status: 'operational' | 'degraded'
    latency: number
    message: string
  }
  presence: {
    status: 'online' | 'standby'
    label: string
  }
  email: EmailCheckResult
  process: SystemProcessHealth
}

/**
 * 探测数据库连通性与响应时间（供 API 与状态页共用）。
 */
export async function checkDatabase(options?: { customDb?: typeof db }): Promise<DatabaseCheckResult> {
  const targetDb = options?.customDb ?? db
  const start = performance.now()
  const provider = process.env.TURSO_DATABASE_URL ? 'turso' : 'local-sqlite'

  try {
    const result = await targetDb.run(sql`SELECT 1 as ping`)
    const latencyMs = Math.round(performance.now() - start)
    return {
      status: 'connected',
      operationalStatus: 'operational',
      latencyMs,
      provider,
      message: '连接畅通',
      result,
    }
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start)
    const message = error instanceof Error ? error.message : 'Unknown database error'
    return {
      status: 'error',
      operationalStatus: 'degraded',
      latencyMs,
      provider,
      message: `连接异常: ${message}`,
    }
  }
}

/**
 * 获取 Node 进程与系统资源健康指标。
 */
export function getSystemProcessHealth(): SystemProcessHealth {
  const mem = process.memoryUsage()
  return {
    status: 'ok',
    uptime: process.uptime(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    memory: {
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024),
    },
  }
}

/**
 * 检查邮件服务接入状态。
 */
export function checkEmailStatus(): EmailCheckResult {
  const hasKey = Boolean(process.env.RESEND_API_KEY?.trim())
  return {
    status: hasKey ? 'ready' : 'mock',
    label: hasKey ? '已接入 (生产通道)' : '开发模拟 (控制台记录)',
  }
}

/**
 * 聚合状态页所需的全部基础设施状态。
 */
export async function getStatusPageData(): Promise<StatusPageData> {
  const [dbResult, presenceResult] = await Promise.all([checkDatabase(), checkPresenceHealth()])

  const emailResult = checkEmailStatus()
  const processHealth = getSystemProcessHealth()

  return {
    db: {
      status: dbResult.operationalStatus,
      latency: dbResult.latencyMs,
      message: dbResult.message,
    },
    presence: presenceResult,
    email: emailResult,
    process: processHealth,
  }
}
