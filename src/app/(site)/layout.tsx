import { SiteFooter } from './_components/site/site-footer'
import { SiteHeader } from './_components/site/site-header'

/** 站点路由组布局：所有公开页面共享页头页脚。 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">{children}</main>
      <SiteFooter />
    </div>
  )
}
