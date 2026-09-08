import type { Metadata } from 'next'
import Link from 'next/link'
import { siteConfig } from '@/site.config'

export const metadata: Metadata = {
  title: '友链',
}

interface FriendLink {
  name: string
  description: string
  url: string
}

const FRIEND_LINKS: FriendLink[] = []

export default function LinksPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12">
      {/* 页面主标题 */}
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <div className="font-mono text-xs tracking-wider text-muted-foreground">// 友情链接</div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">友链</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">志同道合的技术伙伴、独立博客与设计探索者。</p>
      </div>

      {/* 友链网格 */}
      <section className="flex flex-col gap-4">
        <div className="font-mono text-xs tracking-wider text-muted-foreground">// 01. 推荐站点</div>
        {FRIEND_LINKS.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {FRIEND_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col justify-between rounded-lg border border-border/60 bg-card/30 p-4 transition-all hover:border-foreground/30 hover:bg-muted/30"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-medium text-foreground transition-colors group-hover:text-primary">
                      {link.name}
                    </h3>
                    <span className="font-mono text-xs text-muted-foreground transition-transform group-hover:translate-x-0.5">
                      ↗
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{link.description}</p>
                </div>

                <div className="mt-4 border-t border-border/30 pt-2">
                  <span className="font-mono text-[0.7rem] text-muted-foreground/70">
                    {link.url.replace(/^https?:\/\//, '')}
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-5 rounded-lg border border-border/60 bg-card/30 p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <div className="font-mono text-xs tracking-wider text-muted-foreground">// 当前暂无友链</div>
              <h3 className="font-serif text-xl font-medium tracking-tight text-foreground">这里还没有友链</h3>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                友链会在双方确认交换后展示在这里。
              </p>
            </div>

            <div className="flex flex-col gap-4 border-t border-border/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="font-mono text-xs tracking-wider text-muted-foreground">
                当前条目数：<span className="text-foreground">0</span>
              </div>
              <Link
                href="/contact"
                className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs text-foreground motion-safe:transition-colors hover:border-foreground/30 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                申请友链
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 互换规则契约 */}
      <section className="flex flex-col gap-4 border-t border-border/40 pt-8">
        <div className="font-mono text-xs tracking-wider text-muted-foreground">// 02. 友链互换</div>
        <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">友链申请约定</h2>
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
          <p>欢迎原创技术博客、独立开发者或数字花园交换链接。为保证阅读体验，希望你的站点：</p>
          <ul className="flex flex-col gap-1.5 font-mono text-xs text-muted-foreground ps-4">
            <li className="list-disc">具有独立域名并保持稳定访问</li>
            <li className="list-disc">以原创技术、设计或开发实践为主</li>
            <li className="list-disc">排版整洁，无低俗推广与广告干扰</li>
          </ul>
        </div>

        <div className="mt-2 rounded-lg border border-border/60 bg-card/40 p-4 font-mono text-xs text-muted-foreground">
          <div className="text-foreground font-semibold mb-1.5">// 本站信息参考：</div>
          <div>名称：{siteConfig.title}</div>
          <div>简介：{siteConfig.description}</div>
          <div>作者：{siteConfig.author}</div>
          <div>网址：{siteConfig.url}</div>
        </div>
      </section>
    </div>
  )
}
