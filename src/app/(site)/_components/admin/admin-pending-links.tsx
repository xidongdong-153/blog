import type { AdminPendingFriendLink } from '@/server/modules/admin/admin.types'
import { CheckCircle2, Clock, ExternalLink, Globe, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatRelativeTime } from '@/lib/content'

interface AdminPendingLinksProps {
  pendingLinks: AdminPendingFriendLink[]
}

/**
 * 管理后台待审核友链申请队列组件
 */
export function AdminPendingLinks({ pendingLinks }: AdminPendingLinksProps) {
  const hasPending = pendingLinks.length > 0

  return (
    <div
      className={`flex flex-col gap-3.5 rounded-lg border p-4.5 transition-all ${
        hasPending ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/[0.03]' : 'border-border/60 bg-card/40'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
          <span>// 02. 待审核友链申请队列</span>
          <span className="text-border">•</span>
          {hasPending ? (
            <span className="font-semibold text-amber-600 dark:text-amber-400">{pendingLinks.length} 项待处理</span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400">空闲</span>
          )}
        </div>

        <Link
          href="/links"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
        >
          查看全部友链 ↗
        </Link>
      </div>

      {!hasPending ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="text-sm font-medium text-foreground">暂无待审核申请</div>
          <p className="max-w-xs text-xs text-muted-foreground">
            当前所有友链申请均已处理完毕，全站关系链处于最新健康状态。
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/40">
          {pendingLinks.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 py-3 first:pt-1 last:pb-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-sm font-semibold text-foreground">{item.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">({item.ownerName})</span>
                  {item.hasAddedUs ? (
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      已添加本站
                    </span>
                  ) : (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      未标已添加
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  <time dateTime={item.createdAt} title={formatDate(item.createdAt)}>
                    {formatRelativeTime(item.createdAt)}
                  </time>
                </div>
              </div>

              {item.description && (
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              )}

              <div className="flex items-center justify-between pt-1">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-primary transition-colors hover:underline"
                >
                  <Globe className="size-3" />
                  <span className="max-w-[16rem] truncate sm:max-w-sm">{item.url}</span>
                  <ExternalLink className="size-2.5 opacity-60" />
                </a>

                <Link
                  href={item.reviewToken ? `/links/review?token=${encodeURIComponent(item.reviewToken)}` : '/links'}
                  className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/80 px-2.5 py-1 font-mono text-[11px] text-foreground transition-all hover:bg-muted"
                >
                  <ShieldAlert className="size-3 text-amber-500" />
                  <span>处理审核</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
