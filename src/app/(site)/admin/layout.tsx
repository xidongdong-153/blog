import type { Metadata } from 'next'
import { AdminNavigation } from '@/app/(site)/_components/admin/admin-navigation'
import { AdminUiProvider } from '@/app/(site)/_components/admin/admin-ui-provider'
import { requirePostAdmin } from '@/server/modules/posts/posts-admin'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePostAdmin()
  return (
    <AdminUiProvider>
      <div className="mx-auto w-full max-w-7xl">
        <AdminNavigation />
        {children}
      </div>
    </AdminUiProvider>
  )
}
