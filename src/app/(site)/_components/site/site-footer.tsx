import Link from 'next/link'
import { siteConfig } from '@/site.config'
import { VisitorStats } from '../visitor/visitor-stats'
import { ThemeToggle } from './theme-toggle'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-border/40 px-6 pb-12 pt-12 text-xs text-muted-foreground sm:mt-20">
      <div className="mx-auto w-full max-w-5xl">
        {/* 上层：品牌信息与关于导航 */}
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="space-y-3">
            <div className="space-y-2">
              <Link
                href="/"
                className="font-mono text-base font-semibold tracking-wide text-foreground transition-colors hover:text-primary"
              >
                {siteConfig.title}
              </Link>
              <div className="text-xs text-muted-foreground">
                © {year} {siteConfig.author}. 使用 Next.js 构建。
              </div>
            </div>

            <VisitorStats align="left" className="pt-0.5" />
          </div>

          <div>
            <div className="mb-3 text-xs font-medium tracking-wider text-foreground">关于</div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/about" className="transition-colors hover:text-foreground">
                  关于我
                </Link>
              </li>
              <li>
                <Link href="/links" className="transition-colors hover:text-foreground">
                  友链
                </Link>
              </li>
              {siteConfig.social.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    {item.name} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 下层：工具条（RSS、站点地图、三态主题直选） */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-6 sm:flex-row">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <a href="/rss.xml" target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
              RSS 订阅
            </a>
            <span aria-hidden="true" className="text-muted-foreground/30">
              ·
            </span>
            <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
              站点地图
            </a>
            <span aria-hidden="true" className="mx-1 text-muted-foreground/30">
              |
            </span>
            <ThemeToggle />
          </div>

          <div className="text-xs text-muted-foreground" title="我们行常人不可行之事 —— 黑锋骑士团">
            We do what the living cannot.
          </div>
        </div>
      </div>
    </footer>
  )
}
