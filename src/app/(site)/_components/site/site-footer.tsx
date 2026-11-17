import Link from 'next/link'
import { siteConfig } from '@/site.config'
import { VisitorStats } from '../visitor/visitor-stats'
import { FxToggle } from './fx-toggle'
import { PaperSurface } from './paper-surface'
import { ThemeToggle } from './theme-toggle'

/**
 * 站点页脚索引卡。
 * 保留纸张表面质感，采用顶边微光强调线与四栏清晰导航结构，展示站点实时在线与版式控制。
 */
export function SiteFooter() {
  const year = new Date().getFullYear()
  const hostLabel = siteConfig.url.replace(/^https?:\/\//, '').toUpperCase()

  return (
    <footer id="site-footer" className="relative z-10 mt-20 px-6 pb-12 pt-8 text-xs text-muted-foreground sm:mt-24">
      <div className="mx-auto w-full max-w-5xl">
        <div className="relative isolate overflow-hidden rounded-xl px-6 py-7 sm:px-9 sm:py-8">
          <PaperSurface />
          {/* 顶部微亮主题细线，替代印刷裁切角标 */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary/60 via-primary/20 to-transparent"
          />

          {/* 顶排：站点品牌 + 实时在线遥测 */}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Link
                href="/"
                className="font-serif text-xl font-medium tracking-wide text-foreground transition-colors hover:text-primary"
              >
                {siteConfig.title}
              </Link>
              <span className="font-mono text-[11px] tracking-wider text-muted-foreground">
                TypeScript · Full-stack · AI Agents
              </span>
            </div>

            <VisitorStats align="right" />
          </div>

          <div className="my-6 border-t border-hair" />

          {/* 四栏数字编目索引 */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
            <div>
              <div className="mb-3 flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-muted-foreground">
                <span className="tabular-nums text-primary">01</span>
                <span>关于</span>
              </div>
              <ul className="space-y-2 text-[13px] text-foreground/85">
                <li>
                  <Link href="/about" className="transition-colors hover:text-primary">
                    关于我
                  </Link>
                </li>
                <li>
                  <Link href="/projects" className="transition-colors hover:text-primary">
                    开源项目
                  </Link>
                </li>
                <li>
                  <Link href="/links" className="transition-colors hover:text-primary">
                    朋友们
                  </Link>
                </li>
                <li>
                  <Link href="/status" className="transition-colors hover:text-primary">
                    服务状态
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-muted-foreground">
                <span className="tabular-nums text-primary">02</span>
                <span>目录</span>
              </div>
              <ul className="space-y-2 text-[13px] text-foreground/85">
                <li>
                  <Link href="/blog" className="transition-colors hover:text-primary">
                    全部文章
                  </Link>
                </li>
                <li>
                  <Link href="/notes" className="transition-colors hover:text-primary">
                    工程随记
                  </Link>
                </li>
                <li>
                  <Link href="/blog/archives" className="transition-colors hover:text-primary">
                    写作归档
                  </Link>
                </li>
                <li>
                  <Link href="/blog/tags" className="transition-colors hover:text-primary">
                    标签索引
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-muted-foreground">
                <span className="tabular-nums text-primary">03</span>
                <span>联系与订阅</span>
              </div>
              <ul className="space-y-2 text-[13px] text-foreground/85">
                <li>
                  <Link href="/contact" className="transition-colors hover:text-primary">
                    联系通道
                  </Link>
                </li>
                <li>
                  <a href="/rss.xml" target="_blank" rel="noreferrer" className="transition-colors hover:text-primary">
                    RSS 订阅
                  </a>
                </li>
                <li>
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-primary"
                  >
                    站点地图
                  </a>
                </li>
                {siteConfig.social.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="transition-colors hover:text-primary"
                    >
                      {item.name} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-muted-foreground">
                <span className="tabular-nums text-primary">04</span>
                <span>偏好</span>
              </div>
              <div className="space-y-2.5 text-[13px]">
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
        </div>

        {/* 底部版本铭牌 */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 px-1 font-mono text-[11px] tracking-wider text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span>{hostLabel}</span>
            <span>·</span>
            <span>
              © {year} {siteConfig.author}
            </span>
          </div>
          <span title="我们行常人不可行之事 —— 黑锋骑士团">We do what the living cannot.</span>
        </div>
      </div>
    </footer>
  )
}
