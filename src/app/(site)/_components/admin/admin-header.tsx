/* eslint-disable next/no-img-element */
import type { AdminSystemStatus, AdminUserSummary } from '@/server/modules/admin/admin.types'
import { Activity, Database, Server, ShieldCheck } from 'lucide-react'

interface AdminHeaderProps {
  user: AdminUserSummary
  system: AdminSystemStatus
}

/**
 * 将秒数格式化为人类可读的运行时长
 */
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}天 ${h}小时 ${m}分`
  if (h > 0) return `${h}小时 ${m}分`
  return `${m}分`
}

/**
 * 管理后台顶部信息与系统状态条
 */
export function AdminHeader({ user, system }: AdminHeaderProps) {
  const fallbackLetter = (user.name || user.email || 'A').charAt(0).toUpperCase()
  const isDbOk = system.dbStatus === 'connected'

  return (
    <header className="flex flex-col gap-5 border-b border-border/50 pb-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
          <span>// ADMIN</span>
          <span className="text-border">•</span>
          <span className="text-primary font-medium">控制台</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">管理面板</h1>
            <p className="mt-1 text-sm text-muted-foreground">查看内容数据、待办审批与系统状态。</p>
          </div>

          {/* 站长资料卡片 */}
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3.5 py-2 backdrop-blur-xs">
            <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted text-xs font-medium text-foreground">
              {user.image ? (
                <img src={user.image} alt={user.name} className="size-full object-cover" />
              ) : (
                <span>{fallbackLetter}</span>
              )}
              <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-1 ring-background" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">{user.name}</span>
                <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1 py-0.5 font-mono text-[9px] font-medium text-primary">
                  <ShieldCheck className="size-2.5" />
                  站长
                </span>
              </div>
              {user.email && <span className="truncate font-mono text-[10px] text-muted-foreground">{user.email}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 实时环境状态指示条 */}
      <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
        {/* 数据库连接状态 */}
        <div
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${
            isDbOk
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300'
          }`}
        >
          <Database className="size-3.5" />
          <span>{system.dbProvider === 'turso' ? 'Turso' : 'Local SQLite'}</span>
          <span className="opacity-40">/</span>
          <span>{isDbOk ? `${system.dbLatencyMs}ms` : '连接异常'}</span>
        </div>

        {/* 运行时长 */}
        <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-2.5 py-1 text-muted-foreground">
          <Activity className="size-3.5 text-primary" />
          <span>运行时间</span>
          <span className="text-foreground">{formatUptime(system.uptimeSeconds)}</span>
        </div>

        {/* Node 环境与平台 */}
        <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-2.5 py-1 text-muted-foreground">
          <Server className="size-3.5" />
          <span>Node {system.nodeVersion}</span>
          <span className="opacity-40">·</span>
          <span>{system.platform}</span>
        </div>
      </div>
    </header>
  )
}
