import type { Metadata } from 'next'
import { siteConfig } from '@/site.config'

export const metadata: Metadata = {
  title: '联系',
}

export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12">
      {/* 页面主标题 */}
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          // CONTACT &amp; CHANNELS
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">联系</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">沟通交流、项目探讨与反馈通道。</p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">// 01. DIRECT CHANNELS</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {siteConfig.social.map((item) => (
            <a
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-lg border border-border/60 bg-card/30 p-4 transition-all hover:border-foreground/30 hover:bg-muted/30"
            >
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs text-muted-foreground">// PLATFORM</span>
                <span className="font-serif text-lg font-medium text-foreground transition-colors group-hover:text-primary">
                  {item.name}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground transition-transform group-hover:translate-x-0.5">
                ↗
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-border/40 pt-8">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          // 02. COMMUNICATION NOTE
        </div>
        <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">沟通说明</h2>
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
          <p>如果您有任何关于文章、技术探讨、开源合作或设计改进的建议，欢迎通过上方渠道与我联系。</p>
          <p>也可以在任一文章详情页下方的 Giscus 评论区留言交流。</p>
        </div>
      </section>
    </div>
  )
}
