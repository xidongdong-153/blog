/* eslint-disable next/no-img-element */
import type { AdminRecentComment } from '@/server/modules/admin/admin.types'
import { ArrowUpRight, MessageSquare, Pin } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatRelativeTime } from '@/lib/content'
import { PaperSurface } from '../site/paper-surface'

interface AdminRecentCommentsProps {
  recentComments: AdminRecentComment[]
}

/**
 * 管理后台最新评论列表组件
 */
export function AdminRecentComments({ recentComments }: AdminRecentCommentsProps) {
  const hasComments = recentComments.length > 0

  return (
    <div className="relative isolate flex flex-col gap-3.5 overflow-hidden rounded-xl p-5">
      <PaperSurface />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
          <span>// 03. 最新评论</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">最新 {recentComments.length} 条</span>
        </div>

        <Link
          href="/blog"
          className="font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          文章列表 ↗
        </Link>
      </div>

      {!hasComments ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MessageSquare className="size-4" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">暂无评论。</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-hair">
          {recentComments.map((comment) => {
            const fallbackInitial = (comment.authorName || '访客').charAt(0).toUpperCase()
            const postHref = comment.postSlug ? `/blog/${comment.postSlug}#comment-${comment.id}` : '/blog'

            return (
              <div key={comment.id} className="flex flex-col gap-2 py-3.5 first:pt-1 last:pb-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hair bg-muted text-xs font-medium text-foreground">
                      {comment.authorImage ? (
                        <img src={comment.authorImage} alt={comment.authorName} className="size-full object-cover" />
                      ) : (
                        <span>{fallbackInitial}</span>
                      )}
                    </div>
                    <span className="truncate text-xs font-medium text-foreground">{comment.authorName}</span>
                    {comment.isPinned && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">
                        <Pin className="size-2.5" aria-hidden="true" />
                        置顶
                      </span>
                    )}
                  </div>

                  <time
                    dateTime={comment.createdAt}
                    title={formatDate(comment.createdAt)}
                    className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
                  >
                    {formatRelativeTime(comment.createdAt)}
                  </time>
                </div>

                <p className="line-clamp-2 pl-8 text-xs leading-relaxed text-muted-foreground">
                  {comment.contentSnippet}
                </p>

                <div className="flex items-center justify-end pl-8">
                  <Link
                    href={postHref}
                    className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                  >
                    <span className="max-w-xs truncate">{comment.postTitle}</span>
                    <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
