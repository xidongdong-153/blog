import { AmbientBackdrop } from './_components/site/ambient-backdrop'
import { SiteFooter } from './_components/site/site-footer'
import { SiteHeader } from './_components/site/site-header'

/** 站点路由组布局：所有公开页面共享页头页脚。 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip [&:has([data-page-backdrop])>#global-ambient-backdrop]:hidden">
      <AmbientBackdrop id="global-ambient-backdrop" />
      <SiteHeader />
      <main className="relative z-10 mx-auto w-full flex-1 px-6 py-10">{children}</main>
      <SiteFooter />
    </div>
  )
}
