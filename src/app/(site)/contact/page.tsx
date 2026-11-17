import type { Metadata } from 'next'
import { siteConfig } from '@/site.config'
import { PaperSurface } from '../_components/site/paper-surface'

export const metadata: Metadata = {
  title: '联系',
}

export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-2 border-b border-hair pb-6">
        <div className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground/80 uppercase">Contact</div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">联系</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">沟通交流、项目探讨与反馈通道。</p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="font-mono text-xs tracking-wider text-muted-foreground">01 · 直接联系</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {siteConfig.social.map((item) => (
            <a
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative isolate flex items-center justify-between rounded-lg p-5 transition-all duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 hover:[&>span]:border-primary/45"
            >
              <PaperSurface className="bg-card/90" />
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[11px] text-muted-foreground">平台</span>
                <span className="font-serif text-lg font-medium text-foreground transition-colors group-hover:text-primary">
                  {item.name}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary">
                ↗
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-hair pt-8">
        <div className="font-mono text-xs tracking-wider text-muted-foreground">02 · 沟通说明</div>
        <h2 className="font-serif text-2xl font-normal tracking-wide text-foreground">交流说明</h2>
        <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-muted-foreground">
          <p>如果你有关于文章、技术探讨或开源合作的交流想法，可以通过上方渠道联系我。</p>
          <p>也可以在任一文章详情页下方的评论区留言交流。</p>
        </div>
      </section>
    </div>
  )
}
