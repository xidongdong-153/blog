/**
 * 站点路由切换过渡模版。
 * Next.js App Router 在每次导航时重新挂载 template 实例，
 * 首页和文章列表由内容块分别入场，其余页面保留整页淡入。
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-transition-enter">{children}</div>
}
