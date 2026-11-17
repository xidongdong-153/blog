import type { AdminContentStats, AdminEngagementStats } from '@/server/modules/admin/admin.types'
import { BookOpen, FileText, Globe, MessageSquare, Radio, Users } from 'lucide-react'
import { BLOG_CATEGORY_LABELS } from '@/lib/content'
import { PaperSurface } from '../site/paper-surface'

interface AdminMetricsProps {
  content: AdminContentStats
  engagement: AdminEngagementStats
}

/**
 * 管理后台指标总览组件
 */
export function AdminMetrics({ content, engagement }: AdminMetricsProps) {
  const hasPendingFriends = engagement.pendingFriendsCount > 0

  return (
    <section className="flex flex-col gap-3">
      <div className="font-mono text-xs tracking-[0.22em] text-muted-foreground uppercase">// 01. 总览</div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 卡片 1：文章 */}
        <div className="relative isolate flex flex-col justify-between gap-4 overflow-hidden rounded-xl p-5">
          <PaperSurface />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <BookOpen className="size-4 text-primary" aria-hidden="true" />
              <span>文章</span>
            </div>
            {content.draftPosts > 0 ? (
              <span className="rounded-md bg-amber-700/10 px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
                {content.draftPosts} 篇草稿
              </span>
            ) : (
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                全部已发布
              </span>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-1.5 tabular-nums">
              <span className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                {content.publishedPosts}
              </span>
              <span className="font-mono text-xs text-muted-foreground">/ {content.totalPosts} 篇</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(content.categoryDistribution).map(([category, count]) => {
                const label = BLOG_CATEGORY_LABELS[category as keyof typeof BLOG_CATEGORY_LABELS] || category
                return (
                  <span
                    key={category}
                    className="rounded-md border border-hair bg-background/60 px-2 py-0.5 font-mono text-xs tabular-nums text-muted-foreground"
                  >
                    {label} {count}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* 卡片 2：笔记 */}
        <div className="relative isolate flex flex-col justify-between gap-4 overflow-hidden rounded-xl p-5">
          <PaperSurface />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="size-4 text-primary" aria-hidden="true" />
              <span>笔记</span>
            </div>
            <span className="rounded-md bg-emerald-700/10 px-2 py-0.5 font-mono text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
              公开
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5 tabular-nums">
              <span className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                {content.totalNotes}
              </span>
              <span className="font-mono text-xs text-muted-foreground">篇</span>
            </div>

            <p className="mt-3 font-mono text-xs text-muted-foreground">content/notes 仓库归档</p>
          </div>
        </div>

        {/* 卡片 3：评论 */}
        <div className="relative isolate flex flex-col justify-between gap-4 overflow-hidden rounded-xl p-5">
          <PaperSurface />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <MessageSquare className="size-4 text-primary" aria-hidden="true" />
              <span>评论</span>
            </div>
            {engagement.deletedComments > 0 && (
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                已清理 {engagement.deletedComments}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-1.5 tabular-nums">
              <span className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                {engagement.activeComments}
              </span>
              <span className="font-mono text-xs text-muted-foreground">/ {engagement.totalComments} 条</span>
            </div>

            <p className="mt-3 font-mono text-xs text-muted-foreground">公开显示评论</p>
          </div>
        </div>

        {/* 卡片 4：友链 */}
        <div className="relative isolate flex flex-col justify-between gap-4 overflow-hidden rounded-xl p-5">
          <PaperSurface />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Globe className="size-4 text-primary" aria-hidden="true" />
              <span>友链</span>
            </div>
            {hasPendingFriends ? (
              <span className="rounded-md bg-amber-700/10 px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
                {engagement.pendingFriendsCount} 待审核
              </span>
            ) : (
              <span className="rounded-md bg-emerald-700/10 px-2 py-0.5 font-mono text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
                正常
              </span>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-1.5 tabular-nums">
              <span className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                {engagement.totalFriends}
              </span>
              <span className="font-mono text-xs text-muted-foreground">个已上线</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs tabular-nums text-muted-foreground">
              <div className="flex items-center gap-1">
                <Radio className="size-3 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span>在线</span>
                <span className="font-medium text-foreground">{engagement.onlineVisitorsCount}</span>
              </div>
              {engagement.uniqueVisitorsCount !== null && (
                <div className="flex items-center gap-1">
                  <Users className="size-3 text-primary" aria-hidden="true" />
                  <span>访客</span>
                  <span className="font-medium text-foreground">{engagement.uniqueVisitorsCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
