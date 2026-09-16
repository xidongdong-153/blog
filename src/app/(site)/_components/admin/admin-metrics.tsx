import type { AdminContentStats, AdminEngagementStats } from '@/server/modules/admin/admin.types'
import { BookOpen, FileText, Globe, MessageSquare, Radio, Users } from 'lucide-react'
import { BLOG_CATEGORY_LABELS } from '@/lib/content'

interface AdminMetricsProps {
  content: AdminContentStats
  engagement: AdminEngagementStats
}

/**
 * 管理后台核心资产与运营数据 4 格指标大盘
 */
export function AdminMetrics({ content, engagement }: AdminMetricsProps) {
  const hasPendingFriends = engagement.pendingFriendsCount > 0

  return (
    <section className="flex flex-col gap-3">
      <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        // 01. 核心资产与运营大盘 · METRICS_OVERVIEW
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 卡片 1：文章资产 */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4.5 transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <BookOpen className="size-4 text-primary" />
              <span>文章资产</span>
            </div>
            {content.draftPosts > 0 ? (
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-600 dark:text-amber-400">
                {content.draftPosts} 篇草稿
              </span>
            ) : (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                全量发布
              </span>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {content.publishedPosts}
              </span>
              <span className="text-xs text-muted-foreground">/ {content.totalPosts} 篇总数</span>
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

        {/* 卡片 2：随想笔记 */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4.5 transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="size-4 text-primary" />
              <span>随想笔记</span>
            </div>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              公开可读
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {content.totalNotes}
              </span>
              <span className="text-xs text-muted-foreground">篇闪念与随笔</span>
            </div>

            <p className="mt-2.5 text-xs text-muted-foreground">短篇速记与技术点滴，随时同步前台展示。</p>
          </div>
        </div>

        {/* 卡片 3：互动评论 */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4.5 transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <MessageSquare className="size-4 text-primary" />
              <span>互动评论</span>
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
              <span className="text-xs text-muted-foreground">/ {engagement.totalComments} 条累计</span>
            </div>

            <p className="mt-2.5 text-xs text-muted-foreground">已启用社交认证防刷防护与垃圾评论屏蔽。</p>
          </div>
        </div>

        {/* 卡片 4：社交友链与实时访客 */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4.5 transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Globe className="size-4 text-primary" />
              <span>友链与在线</span>
            </div>
            {hasPendingFriends ? (
              <span className="animate-pulse rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-600 dark:text-amber-400">
                {engagement.pendingFriendsCount} 个待处理
              </span>
            ) : (
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                就绪
              </span>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {engagement.totalFriends}
              </span>
              <span className="text-xs text-muted-foreground">个活跃友链</span>
            </div>

            {/* 实时在线状态胶囊 */}
            <div className="mt-2.5 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Radio className="size-3 text-emerald-500 animate-pulse" />
                <span>在线:</span>
                <span className="font-medium text-foreground">{engagement.onlineVisitorsCount}</span>
              </div>
              {engagement.uniqueVisitorsCount !== null && (
                <div className="flex items-center gap-1">
                  <Users className="size-3 text-primary" />
                  <span>历史访客:</span>
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
