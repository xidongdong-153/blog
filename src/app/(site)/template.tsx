/**
 * 站点路由切换过渡模版。
 * Next.js App Router 在每次导航时重新挂载 template 实例，
 * 触发新页面主体内容的微位移与虚化减速入场动效。
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-transition-enter">{children}</div>
}
