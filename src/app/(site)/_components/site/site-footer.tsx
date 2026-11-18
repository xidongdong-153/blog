import Link from 'next/link'
import { siteConfig } from '@/site.config'
import { VisitorStats } from '../visitor/visitor-stats'
import { FxToggle } from './fx-toggle'
import { ThemeToggle } from './theme-toggle'

/**
 * 站点页脚（无卡片外壳的发丝线排印区）。
 * 直接落于宣纸背景之上，顶部分隔以 1px 发丝线，放页头导航之外的入口、实时在线与版式控制。
 */
export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer id="site-footer" className="relative z-10 mt-20 px-6 pb-12 pt-4 text-xs text-muted-foreground sm:mt-24">
      <div className="mx-auto w-full max-w-5xl border-t border-hair pt-8 sm:pt-10">
        {/* 顶排：站点品牌 + 实时在线遥测 */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link href="/" className="ink-link font-serif text-xl font-medium tracking-wide text-foreground">
              {siteConfig.title}
            </Link>
          </div>

          <VisitorStats align="right" />
        </div>

        <div className="my-6 border-t border-hair" />

        {/* 三栏编目索引：只放页头导航之外的入口 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3">
          <div>
            <div className="mb-3 font-mono text-[11px] tracking-wider text-muted-foreground">目录</div>
            <ul className="space-y-2 text-[13px] text-foreground/85">
              <li>
                <Link href="/blog/archives" className="ink-link inline-block py-0.5">
                  归档
                </Link>
              </li>
              <li>
                <Link href="/blog/tags" className="ink-link inline-block py-0.5">
                  标签
                </Link>
              </li>
              <li>
                <Link href="/status" className="ink-link inline-block py-0.5">
                  状态
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="mb-3 font-mono text-[11px] tracking-wider text-muted-foreground">联系与订阅</div>
            <ul className="space-y-2 text-[13px] text-foreground/85">
              <li>
                <Link href="/contact" className="ink-link inline-block py-0.5">
                  联系
                </Link>
              </li>
              <li>
                <a href="/rss.xml" target="_blank" rel="noreferrer" className="ink-link inline-block py-0.5">
                  RSS
                </a>
              </li>
              <li>
                <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="ink-link inline-block py-0.5">
                  站点地图
                </a>
              </li>
              {siteConfig.social.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group/ink inline-flex items-center gap-1 py-0.5 transition-colors hover:text-primary"
                  >
                    <span className="ink-line">{item.name}</span>
                    <span
                      aria-hidden="true"
                      className="ink-glide group-hover/ink:translate-x-0.5 group-hover/ink:-translate-y-0.5"
                    >
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 min-[380px]:col-span-1">
            <div className="mb-3 font-mono text-[11px] tracking-wider text-muted-foreground">偏好</div>
            <div className="space-y-4 text-[13px]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-muted-foreground">主题</span>
                <ThemeToggle />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-muted-foreground">背景</span>
                <FxToggle />
              </div>
            </div>
          </div>
        </div>

        {/* 底部版本铭牌 */}
        <div className="mt-8 border-t border-hair pt-5 font-mono text-[11px] tracking-wider text-muted-foreground">
          © {year} {siteConfig.author}
        </div>
      </div>
    </footer>
  )
}
