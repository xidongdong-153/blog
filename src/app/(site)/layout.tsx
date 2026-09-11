import { AmbientBackdrop } from './_components/site/ambient-backdrop'
import { SiteFooter } from './_components/site/site-footer'
import { SiteHeader } from './_components/site/site-header'
import { VisitorPresenceProvider } from './_components/visitor/visitor-presence-provider'

/** 站点路由组布局：所有公开页面共享页头页脚与访客实时在线连接。 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <VisitorPresenceProvider>
      <div className="relative flex min-h-screen flex-col overflow-x-clip">
        <AmbientBackdrop id="global-ambient-backdrop" />
        <SiteHeader />
        <main className="relative z-10 mx-auto w-full flex-1 px-6 py-10">{children}</main>
        <SiteFooter />
      </div>
    </VisitorPresenceProvider>
  )
}
