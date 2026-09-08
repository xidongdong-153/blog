/* eslint-disable next/no-img-element */
import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { ReviewActionPanel } from '@/app/(site)/_components/links/review-action-panel'
import { db } from '@/server/infra/db/client'
import { friendLinks } from '@/server/infra/db/schema'

export const metadata: Metadata = {
  title: '友链申请审批',
}

interface ReviewPageProps {
  searchParams: Promise<{
    token?: string
    action?: string
  }>
}

export default async function FriendReviewPage({ searchParams }: ReviewPageProps) {
  const { token, action } = await searchParams

  if (!token) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
        <div className="flex flex-col gap-2 border-b border-border/40 pb-4">
          <div className="font-mono text-xs tracking-wider text-muted-foreground">// 审批凭证缺失</div>
          <h1 className="font-serif text-2xl font-medium text-foreground">无法访问审批页面</h1>
        </div>
        <p className="text-sm text-muted-foreground">未检测到审批 Token，请从通知邮件中的按钮链接重新进入。</p>
        <div>
          <Link
            href="/links"
            className="inline-flex items-center gap-1 rounded-md border border-border/70 px-4 py-2 font-mono text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          >
            返回友链页
          </Link>
        </div>
      </div>
    )
  }

  let record
  try {
    record = await db.query.friendLinks.findFirst({
      where: eq(friendLinks.reviewToken, token),
    })
  } catch (err) {
    console.error('[FriendReviewPage] 查询数据库异常:', err)
  }

  if (!record) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
        <div className="flex flex-col gap-2 border-b border-border/40 pb-4">
          <div className="font-mono text-xs tracking-wider text-muted-foreground">// 申请不存在或已处理</div>
          <h1 className="font-serif text-2xl font-medium text-foreground">审批链接无效</h1>
        </div>
        <p className="text-sm text-muted-foreground">该友链申请已被处理、已拒绝，或者该链接已过期失效。</p>
        <div>
          <Link
            href="/links"
            className="inline-flex items-center gap-1 rounded-md border border-border/70 px-4 py-2 font-mono text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          >
            前往友链页
          </Link>
        </div>
      </div>
    )
  }

  const isExpired = record.tokenExpiresAt && record.tokenExpiresAt.getTime() < Date.now()
  if (isExpired) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
        <div className="flex flex-col gap-2 border-b border-border/40 pb-4">
          <div className="font-mono text-xs tracking-wider text-muted-foreground">// 链接已失效</div>
          <h1 className="font-serif text-2xl font-medium text-foreground">审批链接已过期</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          该申请审批链接已超过 7 天有效期。若需上线请在控制台或数据库直接处理。
        </p>
        <div>
          <Link
            href="/links"
            className="inline-flex items-center gap-1 rounded-md border border-border/70 px-4 py-2 font-mono text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          >
            前往友链页
          </Link>
        </div>
      </div>
    )
  }

  if (record.status !== 'pending') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
        <div className="flex flex-col gap-2 border-b border-border/40 pb-4">
          <div className="font-mono text-xs tracking-wider text-muted-foreground">// 申请已完成</div>
          <h1 className="font-serif text-2xl font-medium text-foreground">该申请已处于「{record.status}」状态</h1>
        </div>
        <p className="text-sm text-muted-foreground">该友链此前已完成审核，无需重复处理。</p>
        <div>
          <Link
            href="/links"
            className="inline-flex items-center gap-1 rounded-md border border-border/70 px-4 py-2 font-mono text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          >
            前往友链页
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-4">
      {/* 页面标题 */}
      <div className="flex flex-col gap-2 border-b border-border/40 pb-5">
        <div className="font-mono text-xs tracking-wider text-muted-foreground">// 友链互换申请审核</div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">审核友链申请</h1>
        <p className="text-sm text-muted-foreground">核对申请方站点信息，确认无误后点击下方按钮完成上线。</p>
      </div>

      {/* 申请详情卡片 */}
      <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card/40 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-border/30 pb-4">
          <div className="flex items-center gap-3">
            {record.avatarUrl ? (
              <img
                src={record.avatarUrl}
                alt={record.name}
                className="h-10 w-10 rounded-md border border-border/60 object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border/60 bg-muted/40 font-mono text-sm font-semibold text-muted-foreground">
                {record.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="font-serif text-xl font-medium text-foreground">{record.name}</h2>
              <a
                href={record.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-muted-foreground underline hover:text-foreground"
              >
                {record.url} ↗
              </a>
            </div>
          </div>
          <span className="rounded bg-muted/60 px-2 py-0.5 font-mono text-[0.7rem] text-muted-foreground">
            {record.hasAddedUs ? '已添加本站' : '未标明添加'}
          </span>
        </div>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div>
            <span className="font-mono text-xs text-muted-foreground/70">// 站点简介：</span>
            <p className="mt-1 text-foreground leading-relaxed">{record.description}</p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border/20 pt-3 font-mono text-xs text-muted-foreground">
            <div>申请人：{record.ownerName}</div>
            <div>邮箱：{record.email}</div>
          </div>
        </div>
      </div>

      {/* 操作面板 (Client Component) */}
      <ReviewActionPanel token={token} initialAction={action} siteName={record.name} />
    </div>
  )
}
