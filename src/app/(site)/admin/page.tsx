import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { AdminHeader } from '@/app/(site)/_components/admin/admin-header'
import { AdminMetrics } from '@/app/(site)/_components/admin/admin-metrics'
import { AdminPendingLinks } from '@/app/(site)/_components/admin/admin-pending-links'
import { AdminPortalMatrix } from '@/app/(site)/_components/admin/admin-portal-matrix'
import { AdminRecentComments } from '@/app/(site)/_components/admin/admin-recent-comments'
import { getAdminDashboardData } from '@/server/modules/admin/admin.service'
import { getSession, isSiteAdmin } from '@/server/modules/auth/auth.service'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '管理面板',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

/**
 * 站长管理面板页面（Server Component）。
 * 未登录或非站长访问返回 404。
 */
export default async function AdminDashboardPage() {
  const reqHeaders = await headers()
  const session = await getSession(reqHeaders)

  // 仅站长账号可访问，其余返回 404
  if (!session?.user?.id || !isSiteAdmin(session.user)) {
    notFound()
  }

  const dashboardData = await getAdminDashboardData(session.user)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 py-6 sm:py-10">
      {/* 1. 顶部信息与系统状态条 */}
      <AdminHeader user={dashboardData.adminUser} system={dashboardData.system} />

      {/* 2. 指标总览卡片 */}
      <AdminMetrics content={dashboardData.content} engagement={dashboardData.engagement} />

      {/* 3. 待审友链与最新评论 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminPendingLinks pendingLinks={dashboardData.pendingFriendLinks} />
        <AdminRecentComments recentComments={dashboardData.recentComments} />
      </div>

      {/* 4. 快捷功能入口 */}
      <AdminPortalMatrix
        aiService={dashboardData.aiService}
        engagement={dashboardData.engagement}
        system={dashboardData.system}
      />
    </div>
  )
}
