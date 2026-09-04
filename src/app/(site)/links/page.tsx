import type { Metadata } from 'next'
import { siteConfig } from '@/site.config'

export const metadata: Metadata = {
  title: '友链',
}

interface FriendLink {
  name: string
  description: string
  url: string
}

const FRIEND_LINKS: FriendLink[] = [
  {
    name: 'Pear.no',
    description: '挪威独立设计机构，高反差衬线与设计美学典范。',
    url: 'https://pear.no',
  },
]

export default function LinksPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12">
      {/* 页面主标题 */}
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          // CONNECTIONS &amp; FRIENDS
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">友链</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">志同道合的技术伙伴、独立博客与设计探索者。</p>
      </div>

      {/* 友链网格 */}
      <section className="flex flex-col gap-4">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">// 01. RECOMMENDED SITES</div>
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

              <div className="mt-4 pt-2 border-t border-border/30">
                <span className="font-mono text-[0.7rem] text-muted-foreground/70">
                  {link.url.replace(/^https?:\/\//, '')}
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 互换规则契约 */}
      <section className="flex flex-col gap-4 border-t border-border/40 pt-8">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          // 02. LINK EXCHANGE PROTOCOL
        </div>
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
