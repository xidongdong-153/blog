import type { ReactNode } from 'react'
import type { AdminAiServiceStatus, AdminEngagementStats, AdminSystemStatus } from '@/server/modules/admin/admin.types'
import { Activity, ArrowRight, BookOpen, Cpu, Globe, MessageSquare, Server } from 'lucide-react'
import Link from 'next/link'
import { PaperSurface } from '../site/paper-surface'

interface AdminPortalMatrixProps {
  aiService: AdminAiServiceStatus
  engagement: AdminEngagementStats
  system: AdminSystemStatus
}

interface PortalCardProps {
  eyebrow: string
  statusLabel: string
  statusTone: 'ok' | 'warn' | 'error'
  icon: ReactNode
  title: string
  description: string
  meta: { label: string; value: string }[]
  href: string
  actionLabel: string
  secondaryAction?: { href: string; label: string }
}

const TONE_CLASS: Record<PortalCardProps['statusTone'], string> = {
  ok: 'bg-emerald-700/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400',
  warn: 'bg-amber-700/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400',
  error: 'bg-rose-600/10 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400',
}

function PortalCard({
  eyebrow,
  statusLabel,
  statusTone,
  icon,
  title,
  description,
  meta,
  href,
  actionLabel,
  secondaryAction,
}: PortalCardProps) {
  return (
    <div className="relative isolate flex flex-col justify-between gap-4 overflow-hidden rounded-xl p-5">
      <PaperSurface />
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs tracking-wider text-muted-foreground uppercase">{eyebrow}</span>
          <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-medium ${TONE_CLASS[statusTone]}`}>
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-hair bg-background/80 text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-base font-medium text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-hair pt-3">
        <div className="grid grid-cols-2 gap-2 font-mono text-xs tabular-nums">
          {meta.map((item) => (
            <div key={item.label} className="min-w-0 break-all">
              <span className="text-muted-foreground">{item.label}: </span>
              <span className="text-foreground">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={href}
            className="inline-flex min-h-9 flex-1 items-center justify-between rounded-md border border-hair bg-background/85 px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </Link>
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className="inline-flex min-h-9 shrink-0 items-center rounded-md bg-primary px-3 py-1.5 font-mono text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 管理后台快捷功能入口组件
 */
export function AdminPortalMatrix({ aiService, engagement, system }: AdminPortalMatrixProps) {
  const isAiReady = aiService.status === 'ready'
  const isDbOk = system.dbStatus === 'connected'
  const hasPendingFriends = engagement.pendingFriendsCount > 0

  const cards: PortalCardProps[] = [
    {
      eyebrow: 'CONTENT / POSTS',
      statusLabel: '可写作',
      statusTone: 'ok',
      icon: <BookOpen className="size-4" aria-hidden="true" />,
      title: '文章管理',
      description: '撰写、预览、导入导出与发布。',
      meta: [
        { label: '编辑', value: 'MDX 源码' },
        { label: '工作流', value: '草稿 / 公开' },
      ],
      href: '/admin/posts',
      actionLabel: '管理文章',
      secondaryAction: { href: '/admin/posts/new', label: '写文章' },
    },
    {
      eyebrow: 'AI / WORKSPACE',
      statusLabel: isAiReady ? '模型已连接' : aiService.status === 'needs_check' ? '待检查' : '未配置',
      statusTone: isAiReady ? 'ok' : aiService.status === 'needs_check' ? 'warn' : 'error',
      icon: <Cpu className="size-4" aria-hidden="true" />,
      title: 'AI',
      description: '管理模型、写作 Agent 与 Tool。',
      meta: [
        { label: '协议', value: aiService.protocol },
        { label: '模型', value: aiService.modelId || '未配置模型' },
      ],
      href: '/admin/ai',
      actionLabel: '打开 AI',
    },
    {
      eyebrow: 'ENGAGEMENT / LINKS',
      statusLabel: hasPendingFriends ? `${engagement.pendingFriendsCount} 待审批` : '正常运行',
      statusTone: hasPendingFriends ? 'warn' : 'ok',
      icon: <Globe className="size-4" aria-hidden="true" />,
      title: '友链管理',
      description: '审核申请与管理已上线友链。',
      meta: [
        { label: '已上线', value: `${engagement.totalFriends} 个` },
        { label: '待审核', value: `${engagement.pendingFriendsCount} 个` },
      ],
      href: '/links',
      actionLabel: '管理友链',
    },
    {
      eyebrow: 'ENGAGEMENT / COMMENTS',
      statusLabel: '就绪',
      statusTone: 'ok',
      icon: <MessageSquare className="size-4" aria-hidden="true" />,
      title: '评论管理',
      description: '查看、置顶与删除文章评论。',
      meta: [
        { label: '有效评论', value: String(engagement.activeComments) },
        { label: '已软删除', value: String(engagement.deletedComments) },
      ],
      href: '/blog',
      actionLabel: '查看文章评论',
    },
    {
      eyebrow: 'MONITOR / PRESENCE',
      statusLabel: '实时',
      statusTone: 'ok',
      icon: <Activity className="size-4" aria-hidden="true" />,
      title: '在线状态',
      description: '查看实时访客与在线状态。',
      meta: [
        { label: '当前在线', value: `${engagement.onlineVisitorsCount} 人` },
        {
          label: '总访客',
          value: engagement.uniqueVisitorsCount !== null ? `${engagement.uniqueVisitorsCount} 人` : '统计中',
        },
      ],
      href: '/status',
      actionLabel: '查看在线状态',
    },
    {
      eyebrow: 'SYSTEM / INFRASTRUCTURE',
      statusLabel: isDbOk ? '运行正常' : '异常降级',
      statusTone: isDbOk ? 'ok' : 'error',
      icon: <Server className="size-4" aria-hidden="true" />,
      title: '系统状态',
      description: '检查数据库连接与运行指标。',
      meta: [
        { label: '数据库', value: system.dbProvider },
        { label: '延迟', value: isDbOk ? `${system.dbLatencyMs}ms` : '超时' },
      ],
      href: '/status',
      actionLabel: '查看系统状态',
    },
  ]

  return (
    <section className="flex flex-col gap-3">
      <div className="font-mono text-xs tracking-[0.22em] text-muted-foreground uppercase">// 04. 快捷入口</div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <PortalCard key={card.title} {...card} />
        ))}
      </div>
    </section>
  )
}
