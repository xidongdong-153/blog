import type { AdminPendingFriendLink } from '@/server/modules/admin/admin.types'
import { CheckCircle2, Clock, ExternalLink, Globe, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatRelativeTime } from '@/lib/content'
import { PaperSurface } from '../site/paper-surface'

interface AdminPendingLinksProps {
  pendingLinks: AdminPendingFriendLink[]
}

/**
 * 管理后台待审核友链列表组件
 */
export function AdminPendingLinks({ pendingLinks }: AdminPendingLinksProps) {
  const hasPending = pendingLinks.length > 0

  return (
    <div className="relative isolate flex flex-col gap-3.5 overflow-hidden rounded-xl p-5">
      <PaperSurface className={hasPending ? 'border-amber-700/35 dark:border-amber-400/30' : ''} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
          <span>// 02. 待审友链</span>
          <span aria-hidden="true">·</span>
          {hasPending ? (
            <span className="font-medium tabular-nums text-amber-700 dark:text-amber-400">
              {pendingLinks.length} 项待处理
            </span>
          ) : (
            <span className="text-emerald-700 dark:text-emerald-400">空闲</span>
          )}
        </div>

        <Link
          href="/links"
          className="font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          全部友链 ↗
        </Link>
      </div>

      {!hasPending ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <div className="flex size-9 items-center justify-center rounded-full bg-emerald-700/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
            <CheckCircle2 className="size-4.5" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">暂无待审核的友链申请。</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-hair">
          {pendingLinks.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 py-3.5 first:pt-1 last:pb-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-serif text-base font-medium text-foreground">{item.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">({item.ownerName})</span>
                  {item.hasAddedUs ? (
                    <span className="rounded-md bg-emerald-700/10 px-1.5 py-0.5 font-mono text-xs text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
                      已添加本站
                    </span>
                  ) : (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      未添加本站
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                  <Clock className="size-3" aria-hidden="true" />
                  <time dateTime={item.createdAt} title={formatDate(item.createdAt)}>
                    {formatRelativeTime(item.createdAt)}
                  </time>
                </div>
              </div>

              {item.description && (
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-0 items-center gap-1 font-mono text-xs text-primary underline-offset-4 transition-colors hover:underline"
                >
                  <Globe className="size-3 shrink-0" aria-hidden="true" />
                  <span className="max-w-[14rem] truncate sm:max-w-xs">{item.url}</span>
                  <ExternalLink className="size-2.5 shrink-0 opacity-60" aria-hidden="true" />
                </a>

                <Link
                  href={item.reviewToken ? `/links/review?token=${encodeURIComponent(item.reviewToken)}` : '/links'}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-hair bg-background/85 px-3 py-1 font-mono text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <ShieldAlert className="size-3 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                  <span>审核</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
