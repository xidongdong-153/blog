import type { AdminAiServiceStatus, AdminEngagementStats, AdminSystemStatus } from '@/server/modules/admin/admin.types'
import { Badge, Flex, Heading, Text } from '@radix-ui/themes'
import { Activity, ArrowRight, Cpu, Globe, MessageSquare, Server } from 'lucide-react'
import Link from 'next/link'
import { AiThemeProvider } from './ui/ai-theme-provider'
import { Button } from './ui/button'

interface AdminPortalMatrixProps {
  aiService: AdminAiServiceStatus
  engagement: AdminEngagementStats
  system: AdminSystemStatus
}

/**
 * 管理后台快捷功能入口组件
 */
export function AdminPortalMatrix({ aiService, engagement, system }: AdminPortalMatrixProps) {
  const isAiReady = aiService.status === 'ready'
  const isDbOk = system.dbStatus === 'connected'
  const hasPendingFriends = engagement.pendingFriendsCount > 0

  return (
    <section className="flex flex-col gap-3">
      <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">// 04. 快捷入口</div>

      <Link
        href="/admin/posts"
        className="flex min-h-14 items-center justify-between rounded-lg border border-border px-5 py-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        文章管理
        <ArrowRight size={16} />
      </Link>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AiThemeProvider>
          <Flex
            direction="column"
            justify="between"
            gap="4"
            className="h-full rounded-lg border border-border bg-card p-5"
          >
            <Flex direction="column" gap="3">
              <Flex align="center" justify="between" gap="3">
                <Heading as="h2" size="4" className="flex items-center gap-2 font-serif font-medium">
                  <Cpu aria-hidden="true" className="size-4 text-primary" />
                  AI
                </Heading>
                <Badge color={isAiReady ? 'green' : aiService.status === 'needs_check' ? 'amber' : 'red'}>
                  {isAiReady ? '模型已连接' : aiService.status === 'needs_check' ? '待检查' : '未配置'}
                </Badge>
              </Flex>
              <Text size="2" className="text-muted-foreground">
                管理模型、写作 Agent 与 Tool。
              </Text>
            </Flex>
            <Flex direction="column" gap="3" className="min-w-0 border-t border-border pt-3">
              <Text size="1" className="break-all text-muted-foreground">
                {aiService.protocol} · {aiService.modelId || '未配置模型'}
              </Text>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/admin/ai">
                  打开 AI
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </Flex>
          </Flex>
        </AiThemeProvider>

        {/* 入口 2：友链管理 */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4.5 transition-all hover:border-border">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                ENGAGEMENT / LINKS
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                  hasPendingFriends
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <span className={`size-1.5 rounded-full ${hasPendingFriends ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {hasPendingFriends ? `${engagement.pendingFriendsCount} 待审批` : '正常运行'}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-primary">
                <Globe className="size-4" />
              </div>
              <div>
                <h2 className="font-serif text-base font-medium text-foreground">友链管理</h2>
                <p className="text-xs text-muted-foreground">审核申请与管理已上线的友链。</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/40 pt-3">
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-muted-foreground">已上线:</span>{' '}
                <span className="text-foreground">{engagement.totalFriends} 个</span>
              </div>
              <div>
                <span className="text-muted-foreground">待审核:</span>{' '}
                <span className="text-foreground">{engagement.pendingFriendsCount} 个</span>
              </div>
            </div>

            <Link
              href="/links"
              className="inline-flex items-center justify-between rounded-md border border-border/70 bg-background px-3 py-1.5 font-mono text-xs text-foreground transition-all hover:bg-muted"
            >
              <span>管理友链</span>
              <ArrowRight className="size-3 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* 入口 3：评论管理 */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4.5 transition-all hover:border-border">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                ENGAGEMENT / COMMENTS
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                就绪
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-primary">
                <MessageSquare className="size-4" />
              </div>
              <div>
                <h2 className="font-serif text-base font-medium text-foreground">评论管理</h2>
                <p className="text-xs text-muted-foreground">查看、置顶与删除文章评论。</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/40 pt-3">
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-muted-foreground">有效评论:</span>{' '}
                <span className="text-foreground">{engagement.activeComments}</span>
              </div>
              <div>
                <span className="text-muted-foreground">已软删除:</span>{' '}
                <span className="text-foreground">{engagement.deletedComments}</span>
              </div>
            </div>

            <Link
              href="/blog"
              className="inline-flex items-center justify-between rounded-md border border-border/70 bg-background px-3 py-1.5 font-mono text-xs text-foreground transition-all hover:bg-muted"
            >
              <span>查看文章评论</span>
              <ArrowRight className="size-3 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* 入口 4：在线状态 */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4.5 transition-all hover:border-border">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                MONITOR / PRESENCE
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                实时
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-primary">
                <Activity className="size-4" />
              </div>
              <div>
                <h2 className="font-serif text-base font-medium text-foreground">在线状态</h2>
                <p className="text-xs text-muted-foreground">查看实时访客与在线状态。</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/40 pt-3">
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-muted-foreground">当前在线:</span>{' '}
                <span className="text-foreground">{engagement.onlineVisitorsCount} 人</span>
              </div>
              <div>
                <span className="text-muted-foreground">总访客:</span>{' '}
                <span className="text-foreground">
                  {engagement.uniqueVisitorsCount !== null ? `${engagement.uniqueVisitorsCount} 人` : '统计中'}
                </span>
              </div>
            </div>

            <Link
              href="/status"
              className="inline-flex items-center justify-between rounded-md border border-border/70 bg-background px-3 py-1.5 font-mono text-xs text-foreground transition-all hover:bg-muted"
            >
              <span>查看系统状态</span>
              <ArrowRight className="size-3 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* 入口 5：系统状态 */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4.5 transition-all hover:border-border">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                SYSTEM / INFRASTRUCTURE
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                  isDbOk
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
              >
                <span className={`size-1.5 rounded-full ${isDbOk ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {isDbOk ? '运行正常' : '异常降级'}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-primary">
                <Server className="size-4" />
              </div>
              <div>
                <h2 className="font-serif text-base font-medium text-foreground">系统状态</h2>
                <p className="text-xs text-muted-foreground">检查数据库连接与运行指标。</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/40 pt-3">
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-muted-foreground">数据库:</span>{' '}
                <span className="text-foreground">{system.dbProvider}</span>
              </div>
              <div>
                <span className="text-muted-foreground">延迟:</span>{' '}
                <span className="text-foreground">{isDbOk ? `${system.dbLatencyMs}ms` : '超时'}</span>
              </div>
            </div>

            <Link
              href="/status"
              className="inline-flex items-center justify-between rounded-md border border-border/70 bg-background px-3 py-1.5 font-mono text-xs text-foreground transition-all hover:bg-muted"
            >
              <span>查看系统状态</span>
              <ArrowRight className="size-3 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
