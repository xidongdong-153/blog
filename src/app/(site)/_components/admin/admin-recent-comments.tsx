/* eslint-disable next/no-img-element */
import type { AdminRecentComment } from '@/server/modules/admin/admin.types'
import { ArrowUpRight, MessageSquare, Pin } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatRelativeTime } from '@/lib/content'

interface AdminRecentCommentsProps {
  recentComments: AdminRecentComment[]
}

/**
 * 管理后台最新评论列表组件
 */
export function AdminRecentComments({ recentComments }: AdminRecentCommentsProps) {
  const hasComments = recentComments.length > 0

  return (
    <div className="flex flex-col gap-3.5 rounded-lg border border-border/60 bg-card/40 p-4.5 transition-all hover:border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
          <span>// 03. 最新评论</span>
          <span className="text-border">•</span>
          <span>最新 {recentComments.length} 条</span>
        </div>

        <Link
          href="/blog"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
        >
          浏览文章列表 ↗
        </Link>
      </div>

      {!hasComments ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MessageSquare className="size-4" />
          </div>
          <div className="text-sm font-medium text-foreground">暂无评论</div>
          <p className="max-w-xs text-xs text-muted-foreground">暂无评论。</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/40">
          {recentComments.map((comment) => {
            const fallbackInitial = (comment.authorName || '访客').charAt(0).toUpperCase()
            const postHref = comment.postSlug ? `/blog/${comment.postSlug}#comment-${comment.id}` : '/blog'

            return (
              <div key={comment.id} className="flex flex-col gap-2 py-3 first:pt-1 last:pb-1">
                {/* 评论者与时间 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted text-[10px] font-medium text-foreground">
                      {comment.authorImage ? (
                        <img src={comment.authorImage} alt={comment.authorName} className="size-full object-cover" />
                      ) : (
                        <span>{fallbackInitial}</span>
                      )}
                    </div>
                    <span className="truncate text-xs font-medium text-foreground">{comment.authorName}</span>
                    {comment.isPinned && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1 py-0.2 font-mono text-[9px] text-primary">
                        <Pin className="size-2.5" />
                        置顶
                      </span>
                    )}
                  </div>

                  <time
                    dateTime={comment.createdAt}
                    title={formatDate(comment.createdAt)}
                    className="shrink-0 font-mono text-[11px] text-muted-foreground"
                  >
                    {formatRelativeTime(comment.createdAt)}
                  </time>
                </div>

                {/* 评论正文摘要 */}
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2 pl-8">
                  {comment.contentSnippet}
                </p>

                {/* 所属文章关联直达链接 */}
                <div className="flex items-center justify-end pl-8">
                  <Link
                    href={postHref}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-primary hover:underline"
                  >
                    <span>关联: {comment.postTitle}</span>
                    <ArrowUpRight className="size-3" />
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
