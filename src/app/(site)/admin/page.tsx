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
 * 站长管理面板主页面（Server Component）。
 * 采用隐蔽式服务端权限守卫：未登录或非管理员访问直接触发 404 Not Found。
 */
export default async function AdminDashboardPage() {
  const reqHeaders = await headers()
  const session = await getSession(reqHeaders)

  // 严格权限守卫：仅站长邮箱访问有效，非站长直接抛出 404 伪装不存在
  if (!session?.user?.id || !isSiteAdmin(session.user)) {
    notFound()
  }

  const dashboardData = await getAdminDashboardData(session.user)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 py-6 sm:py-10">
      {/* 1. 顶部控制台工作区标识与全局状态条 */}
      <AdminHeader user={dashboardData.adminUser} system={dashboardData.system} />

      {/* 2. 核心资产与运营大盘 (4 格指标卡) */}
      <AdminMetrics content={dashboardData.content} engagement={dashboardData.engagement} />

      {/* 3. 待办事务与动态流双列工作区 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminPendingLinks pendingLinks={dashboardData.pendingFriendLinks} />
        <AdminRecentComments recentComments={dashboardData.recentComments} />
      </div>

      {/* 4. 各功能管理台入口卡片矩阵 */}
      <AdminPortalMatrix
        aiService={dashboardData.aiService}
        engagement={dashboardData.engagement}
        system={dashboardData.system}
      />
    </div>
  )
}
