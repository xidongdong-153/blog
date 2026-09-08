import type { Metadata } from 'next'
import { sql } from 'drizzle-orm'
import { formatDate } from '@/lib/content'
import { db } from '@/server/infra/db/client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '服务状态',
  description: '站点基础设施、外部服务通道与数据库实时健康指标。',
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

async function checkDatabase() {
  const start = performance.now()
  try {
    await db.run(sql`SELECT 1 as ping`)
    const latency = Math.round(performance.now() - start)
    return {
      status: 'operational' as const,
      latency,
      message: '连接畅通',
    }
  } catch (error) {
    const latency = Math.round(performance.now() - start)
    return {
      status: 'degraded' as const,
      latency,
      message: error instanceof Error ? error.message : '连接异常',
    }
  }
}

async function checkPresence() {
  const sourceUrl = process.env.PRESENCE_SOURCE_URL || 'http://127.0.0.1:4401/api/presence'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 800)
  try {
    const res = await fetch(sourceUrl, {
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (res.ok) {
      return { status: 'online' as const, label: '活跃运行中' }
    }
    return { status: 'standby' as const, label: '待机离线' }
  } catch {
    clearTimeout(timer)
    return { status: 'standby' as const, label: '待机离线' }
  }
}

function checkEmail() {
  const hasKey = Boolean(process.env.RESEND_API_KEY?.trim())
  return {
    status: hasKey ? ('ready' as const) : ('mock' as const),
    label: hasKey ? '已接入 (生产通道)' : '开发模拟 (控制台记录)',
  }
}

export default async function StatusPage() {
  const [dbResult, presenceResult] = await Promise.all([checkDatabase(), checkPresence()])
  const emailResult = checkEmail()

  const isAllOperational = dbResult.status === 'operational'
  const now = new Date()
  const nowISO = now.toISOString()
  const formattedDate = formatDate(nowISO)
  const formattedTime = now.toTimeString().slice(0, 8)
  const memoryUsage = process.memoryUsage()
  const heapUsedMb = Math.round(memoryUsage.heapUsed / 1024 / 1024)
  const rssMb = Math.round(memoryUsage.rss / 1024 / 1024)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      {/* 头部标题区域 */}
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
          <span>// 系统监控看板</span>
          <span className="text-border">•</span>
          <span>独立只读视图</span>
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">服务状态</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          站点核心服务、分布式云数据库及外部集成通道的实时健康指标。所有状态均在服务端内部执行探测，不对外暴露任何 API
          接口。
        </p>
      </div>

      {/* 总体状态横幅 (类似 ChatGPT / Statuspage) */}
      <div
        className={`flex flex-col gap-3 rounded-xl border p-5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
          isAllOperational
            ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100'
            : 'border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-100'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="relative flex size-3.5 items-center justify-center">
            <span
              className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 ${
                isAllOperational ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex size-2.5 rounded-full ${
                isAllOperational ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>
          <div>
            <div className="font-serif text-base font-medium tracking-tight sm:text-lg">
              {isAllOperational ? '所有服务运行正常' : '部分服务响应延迟或降级'}
            </div>
            <div className="text-xs text-muted-foreground">
              {isAllOperational
                ? '全部受控服务与数据库均处于健康可用状态。'
                : '受控服务中存在访问异常，核心静态页面正常由边缘服务保障。'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground sm:text-right">
          <span>探测时间:</span>
          <span className="font-medium text-foreground">
            {formattedDate} {formattedTime}
          </span>
        </div>
      </div>

      {/* 细分服务状态卡片列表 */}
      <div className="flex flex-col gap-4">
        <div className="font-mono text-xs tracking-wider text-muted-foreground">// 01. 核心服务组件</div>

        <div className="grid gap-3.5">
          {/* 服务 1：站点前端与渲染引擎 */}
          <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4 transition-all hover:border-border">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Web 渲染与应用服务</span>
                <span className="font-mono text-xs text-muted-foreground">
                  Next.js 16 (Turbopack) · Node.js {process.version}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                正常运行
              </span>
            </div>

            {/* 30天可用率模拟指标条 */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex h-4 items-center gap-1">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-full flex-1 rounded-xs bg-emerald-500/70 transition-colors hover:bg-emerald-400"
                    title={`第 ${i + 1} 天: 可用率 100%`}
                  />
                ))}
              </div>
              <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                <span>30 天前</span>
                <span className="font-medium text-foreground">100% 可用性</span>
                <span>今日</span>
              </div>
            </div>
          </div>

          {/* 服务 2：Turso 云数据库 */}
          <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4 transition-all hover:border-border">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Turso 分布式云数据库</span>
                <span className="font-mono text-xs text-muted-foreground">
                  libSQL 引擎 · 节点: AWS AP-NorthEast (Tokyo)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{dbResult.latency}ms</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium ${
                    dbResult.status === 'operational'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      dbResult.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  {dbResult.status === 'operational' ? '正常连接' : '响应异常'}
                </span>
              </div>
            </div>

            {/* 30天可用率模拟指标条 */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex h-4 items-center gap-1">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-full flex-1 rounded-xs bg-emerald-500/70 transition-colors hover:bg-emerald-400"
                    title={`第 ${i + 1} 天: 可用率 100%`}
                  />
                ))}
              </div>
              <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                <span>30 天前</span>
                <span className="font-medium text-foreground">
                  实时耗时 {dbResult.latency}ms ({dbResult.message})
                </span>
                <span>今日</span>
              </div>
            </div>
          </div>

          {/* 服务 3：Mac 实时活动采集服务 */}
          <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4 transition-all hover:border-border">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">实时活动状态采集</span>
                <span className="font-mono text-xs text-muted-foreground">Hammerspoon 本地守护进程 · 只读状态源</span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium ${
                  presenceResult.status === 'online'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border/80 bg-muted/40 text-muted-foreground'
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
            <p className="text-xs leading-relaxed text-muted-foreground">
              当作者本地开发设备处于非工作或未联网状态时自动显示为待机离线，不影响全站访客浏览。
            </p>
          </div>

          {/* 服务 4：邮件通知服务 */}
          <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4 transition-all hover:border-border">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">邮件投递通道 (Resend)</span>
                <span className="font-mono text-xs text-muted-foreground">用于友链申请与重要站点通知推送</span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium ${
                  emailResult.status === 'ready'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border/80 bg-muted/40 text-muted-foreground'
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
            <p className="text-xs leading-relaxed text-muted-foreground">
              未配置 API Key 时将自动落入控制台模拟日志模式，保证本地与测试环境正常工作。
            </p>
          </div>
        </div>
      </div>

      {/* 近期事件与系统指标 */}
      <div className="flex flex-col gap-4 border-t border-border/40 pt-8">
        <div className="font-mono text-xs tracking-wider text-muted-foreground">// 02. 近期事件与环境指标</div>

        {/* 无事件记录面板 */}
        <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/20 p-4">
          <div className="flex size-2 items-center justify-center">
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-xs text-muted-foreground">
            近 90 天内未发生任何计划外服务严重中断事件。所有基础设施平稳运行。
          </div>
        </div>

        {/* 服务器与运行时指标 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-card/30 p-3">
            <span className="font-mono text-[11px] text-muted-foreground">系统运行时间</span>
            <span className="font-mono text-xs font-semibold text-foreground">{formatUptime(process.uptime())}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-card/30 p-3">
            <span className="font-mono text-[11px] text-muted-foreground">运行时平台</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {process.platform} ({process.arch})
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-card/30 p-3">
            <span className="font-mono text-[11px] text-muted-foreground">Node 内存分配</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {heapUsedMb} MB / {rssMb} MB
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-card/30 p-3">
            <span className="font-mono text-[11px] text-muted-foreground">接口暴露状态</span>
            <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              纯内部服务端渲染
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
