import type { AdminContentStats, AdminEngagementStats } from '@/server/modules/admin/admin.types'
import { BookOpen, FileText, Globe, MessageSquare, Radio, Users } from 'lucide-react'
import { BLOG_CATEGORY_LABELS } from '@/lib/content'

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
      <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">// 01. 总览</div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 卡片 1：文章 */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4.5 transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <BookOpen className="size-4 text-primary" />
              <span>文章</span>
            </div>
            {content.draftPosts > 0 ? (
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-600 dark:text-amber-400">
                {content.draftPosts} 篇草稿
              </span>
            ) : (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                全部已发布
              </span>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {content.publishedPosts}
              </span>
              <span className="text-xs text-muted-foreground">/ {content.totalPosts} 篇</span>
            </div>

            {/* 分类分布 */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {Object.entries(content.categoryDistribution).map(([category, count]) => {
                const label = BLOG_CATEGORY_LABELS[category as keyof typeof BLOG_CATEGORY_LABELS] || category
                return (
                  <span
                    key={category}
                    className="rounded border border-border/50 bg-background/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {label}: {count}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* 卡片 2：笔记 */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4.5 transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="size-4 text-primary" />
              <span>笔记</span>
            </div>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              公开
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {content.totalNotes}
              </span>
              <span className="text-xs text-muted-foreground">篇公开笔记</span>
            </div>

            <p className="mt-2.5 text-xs text-muted-foreground">已发布的公开笔记。</p>
          </div>
        </div>

        {/* 卡片 3：评论 */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4.5 transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <MessageSquare className="size-4 text-primary" />
              <span>评论</span>
            </div>
            {engagement.deletedComments > 0 && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                已清理 {engagement.deletedComments}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {engagement.activeComments}
              </span>
              <span className="text-xs text-muted-foreground">/ {engagement.totalComments} 条</span>
            </div>

            <p className="mt-2.5 text-xs text-muted-foreground">正常显示的公开评论。</p>
          </div>
        </div>

        {/* 卡片 4：友链 */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4.5 transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Globe className="size-4 text-primary" />
              <span>友链</span>
            </div>
            {hasPendingFriends ? (
              <span className="animate-pulse rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-600 dark:text-amber-400">
                {engagement.pendingFriendsCount} 个待审核
              </span>
            ) : (
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                正常
              </span>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {engagement.totalFriends}
              </span>
              <span className="text-xs text-muted-foreground">个已上线友链</span>
            </div>

            {/* 实时在线状态胶囊 */}
            <div className="mt-2.5 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Radio className="size-3 text-emerald-500 animate-pulse" />
                <span>在线</span>
                <span className="font-medium text-foreground">{engagement.onlineVisitorsCount}</span>
              </div>
              {engagement.uniqueVisitorsCount !== null && (
                <div className="flex items-center gap-1">
                  <Users className="size-3 text-primary" />
                  <span>历史访客</span>
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
