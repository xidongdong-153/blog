import type { Metadata } from 'next'
import { formatDate } from '@/lib/content'
import { getStatusPageData } from '@/server/modules/system/system.service'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '状态',
  description: '站点、数据库与外部服务实时运行状态。',
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (d > 0) return `${d}天 ${h}小时 ${m}分`
  if (h > 0) return `${h}小时 ${m}分 ${s}秒`
  if (m > 0) return `${m}分 ${s}秒`
  return `${s}秒`
}

export default async function StatusPage() {
  const statusData = await getStatusPageData()
  const { db: dbResult, presence: presenceResult, email: emailResult, process: processData } = statusData

  const isAllOperational = dbResult.status === 'operational'
  const now = new Date()
  const nowISO = now.toISOString()
  const formattedDate = formatDate(nowISO)
  const formattedTime = now.toTimeString().slice(0, 8)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      {/* 头部标题区域 */}
      <header className="flex flex-col gap-2 border-b border-hair pb-6">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">状态</h1>
      </header>

      {/* 总体状态横幅（无卡片、无循环脉冲） */}
      <div className="flex flex-col gap-3 border-y border-hair py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-full ${isAllOperational ? 'bg-emerald-500' : 'bg-amber-500'}`}
          />
          <div>
            <div className="font-serif text-base font-medium tracking-tight text-foreground sm:text-lg">
              {isAllOperational ? '全部服务正常' : '部分服务响应异常'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground sm:text-right">
          <span>检查时间</span>
          <span className="font-medium tabular-nums text-foreground">
            {formattedDate} {formattedTime}
          </span>
        </div>
      </div>

      {/* 细分服务状态列表（发丝线台账） */}
      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs tracking-wider text-muted-foreground">服务</h2>

        <div className="flex flex-col divide-y divide-hair border-t border-hair">
          {/* 服务 1：站点前端与渲染引擎 */}
          <div className="flex flex-col gap-3 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">站点服务</span>
                <span className="font-mono text-xs text-muted-foreground">
                  Next.js 16 · Node.js {processData.nodeVersion}
                </span>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                正常
              </span>
            </div>
          </div>

          {/* 服务 2：Turso 云数据库 */}
          <div className="flex flex-col gap-3 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">数据库 (Turso)</span>
                <span className="font-mono text-xs text-muted-foreground">libSQL · {dbResult.message}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3 font-mono text-xs">
                <span className="tabular-nums text-muted-foreground">{dbResult.latency}ms</span>
                <span
                  className={`inline-flex items-center gap-1.5 font-medium ${
                    dbResult.status === 'operational'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      dbResult.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  {dbResult.status === 'operational' ? '正常' : '异常'}
                </span>
              </div>
            </div>
          </div>

          {/* 服务 3：Mac 实时活动采集服务 */}
          <div className="flex flex-col gap-2 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">工位状态</span>
                <span className="font-mono text-xs text-muted-foreground">本地设备活动同步</span>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 font-mono text-xs font-medium ${
                  presenceResult.status === 'online'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    presenceResult.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground/60'
                  }`}
                />
                {presenceResult.label}
              </span>
            </div>
          </div>

          {/* 服务 4：邮件通知服务 */}
          <div className="flex flex-col gap-2 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">邮件通知 (Resend)</span>
                <span className="font-mono text-xs text-muted-foreground">友链审核与站点通知</span>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 font-mono text-xs font-medium ${
                  emailResult.status === 'ready' ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    emailResult.status === 'ready' ? 'bg-emerald-500' : 'bg-muted-foreground/60'
                  }`}
                />
                {emailResult.label}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 运行指标 */}
      <section className="flex flex-col gap-5 border-t border-hair pt-8">
        <h2 className="font-mono text-xs tracking-wider text-muted-foreground">运行指标</h2>

        <div className="grid grid-cols-3 gap-6">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[11px] text-muted-foreground">运行时长</span>
            <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
              {formatUptime(processData.uptime)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[11px] text-muted-foreground">平台</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {processData.platform} ({processData.arch})
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[11px] text-muted-foreground">内存</span>
            <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
              {processData.memory.heapUsedMb} MB / {processData.memory.rssMb} MB
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
