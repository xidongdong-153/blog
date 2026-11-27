/* eslint-disable next/no-img-element */
import type { AdminSystemStatus, AdminUserSummary } from '@/server/modules/admin/admin.types'
import { Activity, Database, Server, ShieldCheck } from 'lucide-react'
import { formatDatabaseProviderLabel } from '@/server/infra/db/config'
import { PaperSurface } from '../site/paper-surface'

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
    <header className="flex flex-col gap-5 border-b border-hair pb-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-mono text-xs tracking-[0.22em] text-muted-foreground uppercase">
          <span>// ADMIN</span>
          <span aria-hidden="true">·</span>
          <span className="font-medium text-primary">控制台</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">管理面板</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">查看内容数据、待办审批与系统状态。</p>
          </div>

          {/* 站长资料纸卡 */}
          <div className="relative isolate flex items-center gap-3 overflow-hidden rounded-xl px-4 py-2.5">
            <PaperSurface />
            <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hair bg-muted text-xs font-medium text-foreground">
              {user.image ? (
                <img src={user.image} alt={user.name} className="size-full object-cover" />
              ) : (
                <span>{fallbackLetter}</span>
              )}
              <span className="absolute right-0 bottom-0 size-2 rounded-full bg-emerald-600 ring-1 ring-background dark:bg-emerald-400" />
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">{user.name}</span>
                <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-medium text-primary">
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  站长
                </span>
              </div>
              {user.email && <span className="truncate font-mono text-xs text-muted-foreground">{user.email}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 实时环境状态指示条 */}
      <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs tabular-nums">
        <div
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${
            isDbOk
              ? 'border-emerald-700/25 bg-emerald-700/5 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/5 dark:text-emerald-400'
              : 'border-rose-600/30 bg-rose-600/5 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/5 dark:text-rose-400'
          }`}
        >
          <Database className="size-3.5" aria-hidden="true" />
          <span>{formatDatabaseProviderLabel(system.dbProvider)}</span>
          <span className="opacity-40">/</span>
          <span>{isDbOk ? `${system.dbLatencyMs}ms` : '连接异常'}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-md border border-hair bg-card/75 px-2.5 py-1 text-muted-foreground">
          <Activity className="size-3.5 text-primary" aria-hidden="true" />
          <span>运行时间</span>
          <span className="text-foreground">{formatUptime(system.uptimeSeconds)}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-md border border-hair bg-card/75 px-2.5 py-1 text-muted-foreground">
          <Server className="size-3.5" aria-hidden="true" />
          <span>Node {system.nodeVersion}</span>
          <span className="opacity-40">·</span>
          <span>{system.platform}</span>
        </div>
      </div>
    </header>
  )
}
